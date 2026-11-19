import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentReviewContent,
  AssessmentStatus,
  ProjectSubmissionStatus,
} from 'generated/prisma/enums';

import type {
  AttemptWriteContext,
  IAttemptRepository,
} from '../interfaces/attempt.repository.interface';
import { ATTEMPT_REPOSITORY } from '../repositories/attempt.repository.token';

import {
  LearnerAssessmentDto,
  LearnerAssessmentState,
  LearnerLatestAttemptDto,
} from '../dtos/attempts/learner-assessment.dto';
import { LearnerAssessmentAction } from '../dtos/attempts/learner-assessment.dto';
import {
  CreateAttemptAction,
  CreateAttemptResponseDto,
} from '../dtos/attempts/create-attempt.dto';
import {
  CreateOrResumeAttemptInput,
  GetActiveAttemptInput,
  GetAttemptHistoryInput,
  GetAttemptResultInput,
  GetLearnerCourseAssessmentsInput,
  SaveAttemptAnswerInput,
  SubmitAttemptInput,
  SubmitProjectInput,
} from '../interfaces/learner-assessment-service-input.interface';
import {
  ActiveAttemptDto,
  ActiveAttemptQuestionDto,
  ActiveAttemptSavedAnswerDto,
  ActiveProjectRequirementDto,
} from '../dtos/attempts/active-attempt.dto';
import { AssessmentQuestionType } from '../interfaces/assessment-questions.repository.interface';
import { AssessmentType } from '../interfaces/assessment.repository.interface';
import { SaveAttemptAnswerResponseDto } from '../dtos/attempts/save-attempt-answer.dto';
import {
  AttemptResultAnswerDto,
  AttemptResultDto,
  AttemptResultProjectSubmissionDto,
} from '../dtos/attempts/attempt-result.dto';
import {
  AttemptHistoryDto,
  AttemptHistoryItemDto,
} from '../dtos/attempts/attempt-history.dto';
import { SubmitProjectResponseDto } from '../dtos/attempts/submit-project.dto';
import { LearnerCourseAssessmentsDto } from '../dtos/attempts/learner-course-assessments.dto';
import { AssessmentAccessService } from './assessment-access.service';
import { AttemptFinalizationService } from './attempt-finalization.service';
import {
  getAttemptDeadline,
  getRemainingSeconds,
  isAttemptExpired,
} from '../utils/attempt-timing';

interface GetLearnerAssessmentInput {
  courseId: string;
  assessmentId: string;
  learnerId: string;
}

@Injectable()
export class LearnerAssessmentsService {
  constructor(
    @Inject(ATTEMPT_REPOSITORY)
    private readonly iAttemptRepository: IAttemptRepository,
    private readonly assessmentAccessService: AssessmentAccessService,
    private readonly finalization: AttemptFinalizationService,
  ) {}

  async getLearnerCourseAssessments(
    input: GetLearnerCourseAssessmentsInput,
  ): Promise<LearnerCourseAssessmentsDto> {
    const { courseId, learnerId } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessCourse(
      learnerId,
      courseId,
    );

    const assessments =
      await this.iAttemptRepository.findPublishedAssessmentsForLearnerCourse(
        courseId,
      );

    const now = new Date();

    return {
      assessments: assessments.map((assessment) => ({
        id: assessment.id,
        // A hidden lesson must not make its assessment disappear from the path.
        afterLesson:
          assessment.afterLessonContext?.isActive &&
          assessment.afterLessonContext.deletedAt === null &&
          assessment.afterLessonContext.section.courseId === courseId &&
          assessment.afterLessonContext.section.isActive &&
          assessment.afterLessonContext.section.deletedAt === null
            ? assessment.afterLesson
            : null,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,

        order: assessment.order,
        totalPoints: assessment.totalPoints,
        passingScore: assessment.passingScore,

        maxAttempts: assessment.maxAttempts,
        timeLimitMinutes: assessment.timeLimitMinutes,

        availableFrom: assessment.availableFrom,
        availableUntil: assessment.availableUntil,
      })),
      serverNow: now,
    };
  }

  async getLearnerAssessment(
    input: GetLearnerAssessmentInput,
  ): Promise<LearnerAssessmentDto> {
    const { courseId, assessmentId, learnerId } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
      { requirePublished: false },
    );

    const assessment =
      await this.iAttemptRepository.findAssessmentForLearnerEntry(
        courseId,
        assessmentId,
      );

    if (!assessment || assessment.deletedAt || !assessment.isActive) {
      throw new NotFoundException('Assessment not found.');
    }

    const attempts = await this.iAttemptRepository.findLearnerAttempts(
      assessmentId,
      learnerId,
    );

    const now = new Date();
    const sortedAttempts = [...attempts].sort(
      (a, b) => b.attemptNumber - a.attemptNumber,
    );

    const latestAttempt = sortedAttempts[0] ?? null;

    const activeAttempt =
      sortedAttempts.find(
        (attempt) => attempt.status === AssessmentAttemptStatus.IN_PROGRESS,
      ) ?? null;

    const attemptsUsed = attempts.length;

    const attemptsRemaining = this.computeAttemptsRemaining(
      assessment.maxAttempts,
      attemptsUsed,
    );

    const isPublished = assessment.status === AssessmentStatus.PUBLISHED;

    const isInsideAvailabilityWindow = this.isInsideAvailabilityWindow(
      now,
      assessment.availableFrom,
      assessment.availableUntil,
    );

    const activeAttemptRemainingSeconds = activeAttempt
      ? getRemainingSeconds({
          now,
          startedAt: activeAttempt.startedAt,
          timeLimitMinutes: assessment.timeLimitMinutes,
          availableUntil: assessment.availableUntil,
        })
      : null;

    const activeAttemptExpired =
      activeAttempt !== null &&
      isAttemptExpired({
        now,
        startedAt: activeAttempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
        availableUntil: assessment.availableUntil,
      });

    const { state, primaryAction, message } = this.computeEntryState({
      isPublished,
      isInsideAvailabilityWindow,
      attemptsRemaining,
      latestAttempt,
      activeAttempt,
      activeAttemptExpired,
    });

    return {
      assessmentId: assessment.id,

      title: assessment.title,
      description: assessment.description,
      type: assessment.type,

      totalPoints: assessment.totalPoints,
      passingScore: assessment.passingScore,

      maxAttempts: assessment.maxAttempts,
      timeLimitMinutes: assessment.timeLimitMinutes,

      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,

      attemptsUsed,
      attemptsRemaining,

      state,
      primaryAction,

      latestAttempt: latestAttempt
        ? this.toLatestAttemptDto({
            attempt: latestAttempt,
            remainingSeconds:
              activeAttempt?.id === latestAttempt.id
                ? activeAttemptRemainingSeconds
                : null,
            timeLimitMinutes: assessment.timeLimitMinutes,
            availableUntil: assessment.availableUntil,
          })
        : null,

      serverNow: now,
      message,
    };
  }

  private computeAttemptsRemaining(
    maxAttempts: number | null,
    attemptsUsed: number,
  ): number | null {
    if (maxAttempts === null) {
      return null;
    }

    return Math.max(maxAttempts - attemptsUsed, 0);
  }

  private isInsideAvailabilityWindow(
    now: Date,
    availableFrom: Date | null,
    availableUntil: Date | null,
  ): boolean {
    if (availableFrom && now < availableFrom) {
      return false;
    }

    if (availableUntil && now >= availableUntil) {
      return false;
    }

    return true;
  }

  private computeEntryState(params: {
    isPublished: boolean;
    isInsideAvailabilityWindow: boolean;
    attemptsRemaining: number | null;
    latestAttempt: { status: AssessmentAttemptStatus } | null;
    activeAttempt: { status: AssessmentAttemptStatus } | null;
    activeAttemptExpired: boolean;
  }): {
    state: LearnerAssessmentState;
    primaryAction: LearnerAssessmentAction;
    message: string | null;
  } {
    const {
      isPublished,
      isInsideAvailabilityWindow,
      attemptsRemaining,
      latestAttempt,
      activeAttempt,
      activeAttemptExpired,
    } = params;

    if (activeAttempt && activeAttemptExpired) {
      return {
        state: LearnerAssessmentState.FINALIZING,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Attempt has expired. Its result is being finalized.',
      };
    }

    if (!isPublished) {
      return {
        state: LearnerAssessmentState.LOCKED,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Assessment is not available.',
      };
    }

    if (!isInsideAvailabilityWindow) {
      return {
        state: LearnerAssessmentState.NOT_AVAILABLE,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Assessment is outside the available time window.',
      };
    }

    if (activeAttempt && !activeAttemptExpired) {
      return {
        state: LearnerAssessmentState.CAN_CONTINUE,
        primaryAction: LearnerAssessmentAction.CONTINUE,
        message: null,
      };
    }

    if (attemptsRemaining !== null && attemptsRemaining <= 0) {
      return {
        state: LearnerAssessmentState.MAX_ATTEMPTS_REACHED,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Maximum attempt limit reached.',
      };
    }

    if (latestAttempt && this.isFinishedAttemptStatus(latestAttempt.status)) {
      return {
        state: LearnerAssessmentState.COMPLETED,
        primaryAction: LearnerAssessmentAction.VIEW_RESULT,
        message: null,
      };
    }

    return {
      state: LearnerAssessmentState.CAN_START,
      primaryAction: LearnerAssessmentAction.START,
      message: null,
    };
  }

  private toLatestAttemptDto(params: {
    attempt: {
      id: string;
      attemptNumber: number;
      status: AssessmentAttemptStatus;
      score: number | null;
      maxScore: number | null;
      passed: boolean;
      startedAt: Date;
      submittedAt: Date | null;
    };
    remainingSeconds: number | null;
    timeLimitMinutes: number | null;
    availableUntil: Date | null;
  }): LearnerLatestAttemptDto {
    const { attempt, remainingSeconds, timeLimitMinutes, availableUntil } =
      params;

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      expiresAt: getAttemptDeadline(
        attempt.startedAt,
        timeLimitMinutes,
        availableUntil,
      ),
      remainingSeconds,
    };
  }
  private isFinishedAttemptStatus(status: AssessmentAttemptStatus): boolean {
    return (
      status === AssessmentAttemptStatus.SUBMITTED ||
      status === AssessmentAttemptStatus.GRADED ||
      status === AssessmentAttemptStatus.PASSED ||
      status === AssessmentAttemptStatus.FAILED
    );
  }

  async createOrResumeAttempt(
    input: CreateOrResumeAttemptInput,
  ): Promise<CreateAttemptResponseDto> {
    const { courseId, assessmentId, learnerId } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
    );

    const assessment =
      await this.iAttemptRepository.findAssessmentForLearnerEntry(
        courseId,
        assessmentId,
      );

    let now = new Date();

    if (!assessment || assessment.deletedAt || !assessment.isActive) {
      throw new NotFoundException('Assessment not found.');
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new ForbiddenException('Assessment is not published.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    const attemptResult =
      await this.iAttemptRepository.createOrResumeAttemptTransaction({
        assessmentId,
        learnerId,
        maxAttempts: assessment.maxAttempts,
        status: AssessmentAttemptStatus.IN_PROGRESS,
        score: null,
        maxScore: null,
        passed: false,
      });

    now = new Date();

    if (attemptResult.kind === 'MAX_ATTEMPTS_REACHED') {
      throw new ForbiddenException('Maximum attempt limit reached.');
    }

    if (attemptResult.kind === 'RESUMED') {
      const resumedAttempt = attemptResult.attempt;
      const remainingSeconds = getRemainingSeconds({
        now,
        startedAt: resumedAttempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
        availableUntil: assessment.availableUntil,
      });

      const isExpired = isAttemptExpired({
        now,
        startedAt: resumedAttempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
        availableUntil: assessment.availableUntil,
      });

      if (!isExpired) {
        return {
          action: CreateAttemptAction.RESUMED,

          attemptId: resumedAttempt.id,
          assessmentId: resumedAttempt.assessmentId,
          attemptNumber: resumedAttempt.attemptNumber,

          status: resumedAttempt.status,

          startedAt: resumedAttempt.startedAt,
          expiresAt: getAttemptDeadline(
            resumedAttempt.startedAt,
            assessment.timeLimitMinutes,
            assessment.availableUntil,
          ),
          remainingSeconds,

          serverNow: now,
        };
      }

      throw new ForbiddenException(
        'Attempt has expired. Finalization is pending.',
      );
    }

    const attempt = attemptResult.attempt;

    const remainingSeconds = getRemainingSeconds({
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      availableUntil: assessment.availableUntil,
    });

    return {
      action:
        attemptResult.kind === 'CREATED'
          ? CreateAttemptAction.CREATED
          : CreateAttemptAction.RESUMED,

      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      attemptNumber: attempt.attemptNumber,

      status: attempt.status,

      startedAt: attempt.startedAt,
      expiresAt: getAttemptDeadline(
        attempt.startedAt,
        assessment.timeLimitMinutes,
        assessment.availableUntil,
      ),
      remainingSeconds,

      serverNow: now,
    };
  }

  async getActiveAttempt(
    input: GetActiveAttemptInput,
  ): Promise<ActiveAttemptDto> {
    const { courseId, assessmentId, attemptId, learnerId } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
    );

    const attempt = await this.iAttemptRepository.findActiveAttemptDetail(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    const now = new Date();

    if (!attempt) {
      throw new NotFoundException('Attempt not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to access this attempt.',
      );
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new ConflictException({
        error: 'ATTEMPT_NOT_ACTIVE',
        message: 'Attempt is no longer active.',
      });
    }

    const timing = {
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      availableUntil: assessment.availableUntil,
    };
    if (isAttemptExpired(timing)) {
      throw new ConflictException({
        error: 'ATTEMPT_FINALIZING',
        message: 'Attempt has ended. Finalization is pending.',
      });
    }
    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }
    const remainingSeconds = getRemainingSeconds(timing);

    const questions =
      assessment.type === AssessmentType.QUIZ
        ? this.buildSafeActiveQuestions(attempt.questions)
        : [];

    const savedAnswers =
      assessment.type === AssessmentType.QUIZ
        ? this.buildSavedAnswers(attempt.savedAnswers)
        : [];

    const projectRequirement =
      assessment.type === AssessmentType.PROJECT
        ? this.buildProjectRequirement({
            assessmentTitle: assessment.title,
            assessmentDescription: assessment.description,
            totalPoints: assessment.totalPoints,
            questions: attempt.questions,
          })
        : null;

    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,

      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,

      type: assessment.type,
      status: attempt.status,

      attemptNumber: attempt.attemptNumber,

      totalPoints: assessment.totalPoints,
      passingScore: assessment.passingScore,

      startedAt: attempt.startedAt,

      expiresAt: getAttemptDeadline(
        attempt.startedAt,
        assessment.timeLimitMinutes,
        assessment.availableUntil,
      ),

      remainingSeconds,
      serverNow: now,

      questions,
      savedAnswers,
      projectRequirement,
    };
  }

  private buildSafeActiveQuestions(
    questions: {
      id: string;
      questionText: string;
      type: AssessmentQuestionType;
      points: number;
      order: number;
      isActive: boolean;
      deletedAt: Date | null;
      answer?: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
        wrongAnswers: unknown;
      } | null;
    }[],
  ): ActiveAttemptQuestionDto[] {
    return questions
      .filter((question) => question.isActive && !question.deletedAt)
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        questionId: question.id,
        questionText: question.questionText,
        type: question.type,
        points: question.points,
        order: question.order,
        options: this.buildSafeOptions(question),
      }));
  }
  private buildSafeOptions(question: {
    type: AssessmentQuestionType;
    answer?: {
      correctOptionAnswer: string | null;
      wrongAnswers: unknown;
    } | null;
  }): string[] | null {
    if (question.type === AssessmentQuestionType.TRUE_FALSE) {
      return ['true', 'false'];
    }

    if (question.type !== AssessmentQuestionType.MULTIPLE_CHOICE) {
      return null;
    }

    const correctOption = question.answer?.correctOptionAnswer;

    const wrongAnswers = this.parseWrongAnswers(question.answer?.wrongAnswers);

    const options = [
      ...(correctOption ? [correctOption] : []),
      ...wrongAnswers,
    ];

    /**
     * Safety:
     * Return option strings only.
     * No isCorrect flag.
     * No correctOptionAnswer field name.
     */
    return this.shuffleStrings([...new Set(options)]);
  }
  private parseWrongAnswers(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  private shuffleStrings(values: string[]): string[] {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index],
      ];
    }

    return result;
  }
  private buildSavedAnswers(
    savedAnswers: {
      questionId: string;
      textAnswer: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[],
  ): ActiveAttemptSavedAnswerDto[] {
    return savedAnswers.map((answer) => ({
      questionId: answer.questionId,
      answer: answer.textAnswer,
      savedAt: answer.updatedAt ?? answer.createdAt,
    }));
  }

  private buildProjectRequirement(params: {
    assessmentTitle: string;
    assessmentDescription: string | null;
    totalPoints: number;
    questions: {
      questionText: string;
      type: AssessmentQuestionType;
      isActive: boolean;
      deletedAt: Date | null;
      order: number;
    }[];
  }): ActiveProjectRequirementDto {
    const projectQuestion = params.questions
      .filter(
        (question) =>
          question.isActive &&
          !question.deletedAt &&
          question.type === AssessmentQuestionType.PROJECT,
      )
      .sort((a, b) => a.order - b.order)[0];

    return {
      title: params.assessmentTitle,
      description: params.assessmentDescription,
      requirement:
        projectQuestion?.questionText ??
        params.assessmentDescription ??
        'Submit your project according to the assessment requirements.',
      totalPoints: params.totalPoints,
      note: null,
    };
  }

  async saveAttemptAnswer(
    input: SaveAttemptAnswerInput,
  ): Promise<SaveAttemptAnswerResponseDto> {
    const { courseId, assessmentId, attemptId, questionId, learnerId, dto } =
      input;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
    );

    const context = await this.iAttemptRepository.findSaveAnswerContext(
      courseId,
      assessmentId,
      attemptId,
      questionId,
      learnerId,
    );

    const now = new Date();

    if (!context) {
      throw new NotFoundException('Attempt or question not found.');
    }

    if (context.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to update this attempt.',
      );
    }

    if (context.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const { assessment, question } = context;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    if (assessment.type !== AssessmentType.QUIZ) {
      throw new BadRequestException(
        'Answers can only be saved for quiz assessments.',
      );
    }

    if (context.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    const remainingSeconds = getRemainingSeconds({
      now,
      startedAt: context.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      availableUntil: assessment.availableUntil,
    });

    const isExpired = isAttemptExpired({
      now,
      startedAt: context.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      availableUntil: assessment.availableUntil,
    });

    if (isExpired) {
      throw new ForbiddenException('Attempt has expired.');
    }

    if (!question || !question.isActive || question.deletedAt) {
      throw new NotFoundException('Question not found.');
    }

    if (question.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Question does not belong to this assessment.',
      );
    }

    const normalizedAnswer = this.normalizeLearnerAnswer(dto.answer);

    this.validateAnswerForQuestionType({
      answer: normalizedAnswer,
      question,
    });

    const savedAnswer = await this.iAttemptRepository.upsertAttemptAnswer(
      {
        attemptId,
        questionId,
        textAnswer: normalizedAnswer,
      },
      (context, currentSavedAt) => {
        this.assertAttemptWriteAllowed(context);
        const expectedSavedAt =
          dto.expectedSavedAt === null
            ? null
            : new Date(dto.expectedSavedAt).getTime();
        if (expectedSavedAt !== (currentSavedAt?.getTime() ?? null)) {
          throw new ConflictException({
            error: 'ANSWER_VERSION_CONFLICT',
            message:
              'Answer has changed. Reload the saved answer before saving again.',
          });
        }
      },
    );

    if (!savedAnswer) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    return {
      attemptId: savedAnswer.attemptId,
      questionId: savedAnswer.questionId,
      saved: true,
      savedAt: savedAnswer.updatedAt ?? savedAnswer.createdAt,
      remainingSeconds,
      serverNow: now,
    };
  }
  private normalizeLearnerAnswer(answer: string): string {
    const normalized = answer.trim();

    if (!normalized) {
      throw new BadRequestException('Answer is required.');
    }

    return normalized;
  }

  private validateAnswerForQuestionType(params: {
    answer: string;
    question: {
      type: AssessmentQuestionType;
      answer?: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
        wrongAnswers: unknown;
      } | null;
    };
  }): void {
    const { answer, question } = params;

    switch (question.type) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
        this.validateMultipleChoiceAnswer(answer, question);
        return;

      case AssessmentQuestionType.TRUE_FALSE:
        this.validateTrueFalseAnswer(answer);
        return;

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        this.validateFillInBlankAnswer(answer);
        return;

      case AssessmentQuestionType.PROJECT:
        throw new BadRequestException(
          'Project questions must be submitted through project submission.',
        );

      default:
        throw new BadRequestException('Unsupported question type.');
    }
  }
  private validateMultipleChoiceAnswer(
    answer: string,
    question: {
      answer?: {
        correctOptionAnswer: string | null;
        wrongAnswers: unknown;
      } | null;
    },
  ): void {
    const correctOption = question.answer?.correctOptionAnswer;

    const wrongAnswers = this.parseWrongAnswers(question.answer?.wrongAnswers);

    const allowedOptions = [
      ...(correctOption ? [correctOption] : []),
      ...wrongAnswers,
    ];

    if (allowedOptions.length === 0) {
      throw new BadRequestException('Question options are not configured.');
    }

    if (!allowedOptions.includes(answer)) {
      throw new BadRequestException('Invalid selected answer.');
    }
  }

  private validateTrueFalseAnswer(answer: string): void {
    const normalized = answer.toLowerCase();

    if (normalized !== 'true' && normalized !== 'false') {
      throw new BadRequestException('Answer must be true or false.');
    }
  }

  private validateFillInBlankAnswer(answer: string): void {
    if (answer.length > 5000) {
      throw new BadRequestException('Answer is too long.');
    }
  }
  async submitAttempt(input: SubmitAttemptInput): Promise<AttemptResultDto> {
    const { courseId, assessmentId, learnerId } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
    );

    const finalized = await this.finalization.submitQuiz(input);

    // Recover a result that was already committed by a previous request.
    if (!finalized) {
      const existingResult = await this.getAttemptResult(input);

      const isFinishedQuiz =
        existingResult.assessmentType === AssessmentType.QUIZ &&
        (existingResult.status === AssessmentAttemptStatus.GRADED ||
          existingResult.status === AssessmentAttemptStatus.PASSED ||
          existingResult.status === AssessmentAttemptStatus.FAILED);

      if (!isFinishedQuiz) {
        throw new BadRequestException('Attempt is not in progress.');
      }

      return existingResult;
    }

    const {
      snapshot: attempt,
      attempt: submittedAttempt,
      gradedAnswers,
    } = finalized;

    const assessment = attempt.assessment;

    const activeQuestions = attempt.questions.filter(
      (question) => question.isActive && !question.deletedAt,
    );

    const [attemptsUsed, activeAttempt] = await Promise.all([
      this.iAttemptRepository.countLearnerAttempts(assessmentId, learnerId),
      this.iAttemptRepository.findActiveAttempt(assessmentId, learnerId),
    ]);

    const now = new Date();

    const canRetake = this.computeCanRetake({
      assessmentStatus: assessment.status,
      assessmentIsActive: assessment.isActive,
      assessmentDeletedAt: assessment.deletedAt,
      maxAttempts: assessment.maxAttempts,
      attemptsUsed,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      hasActiveAttempt: activeAttempt !== null,
    });

    const canReview = this.computeCanReview({
      attemptStatus: submittedAttempt.status,
      reviewTiming: assessment.reviewTiming,
      now,
      assessmentAvailableUntil: assessment.availableUntil,
    });

    const gradedAnswerByAttemptAnswerId = new Map(
      gradedAnswers.map((answer) => [answer.attemptAnswerId, answer]),
    );

    const reviewAnswers = attempt.savedAnswers.map((answer) => {
      const gradedAnswer = gradedAnswerByAttemptAnswerId.get(answer.id);

      return {
        questionId: answer.questionId,
        textAnswer: answer.textAnswer,
        isCorrect: gradedAnswer?.isCorrect ?? null,
        pointsEarned: gradedAnswer?.pointsEarned ?? null,
      };
    });

    const answers = this.buildReviewAnswers({
      canReview,
      reviewContent: assessment.reviewContent,
      questions: activeQuestions,
      answers: reviewAnswers,
    });

    return {
      attemptId: submittedAttempt.id,
      assessmentId: submittedAttempt.assessmentId,

      assessmentTitle: assessment.title,
      assessmentType: assessment.type,

      attemptNumber: submittedAttempt.attemptNumber,
      status: submittedAttempt.status,

      score: submittedAttempt.score,
      maxScore: submittedAttempt.maxScore,
      passed: submittedAttempt.passed,

      startedAt: submittedAttempt.startedAt,
      submittedAt: submittedAttempt.submittedAt,

      canRetake,
      canReview,

      answers,
      projectSubmission: null,

      serverNow: now,
    };
  }

  private computeCanRetake(params: {
    assessmentStatus: AssessmentStatus;
    assessmentIsActive: boolean;
    assessmentDeletedAt: Date | null;
    maxAttempts: number | null;
    attemptsUsed: number;
    now: Date;
    availableFrom: Date | null;
    availableUntil: Date | null;
    hasActiveAttempt: boolean;
  }): boolean {
    const {
      assessmentStatus,
      assessmentIsActive,
      assessmentDeletedAt,
      maxAttempts,
      attemptsUsed,
      now,
      availableFrom,
      availableUntil,
      hasActiveAttempt,
    } = params;

    const isAssessmentAvailable =
      assessmentStatus === AssessmentStatus.PUBLISHED &&
      assessmentIsActive &&
      !assessmentDeletedAt &&
      this.isInsideAvailabilityWindow(now, availableFrom, availableUntil);

    const hasAttemptsLeft = maxAttempts === null || attemptsUsed < maxAttempts;

    return isAssessmentAvailable && hasAttemptsLeft && !hasActiveAttempt;
  }

  private computeCanReview(params: {
    attemptStatus: AssessmentAttemptStatus;
    reviewTiming: string;
    now: Date;
    assessmentAvailableUntil: Date | null;
  }): boolean {
    const { attemptStatus, reviewTiming, now, assessmentAvailableUntil } =
      params;

    if (!this.isFinishedAttemptStatus(attemptStatus)) {
      return false;
    }

    switch (reviewTiming) {
      case 'NEVER':
        return false;

      case 'AFTER_SUBMIT':
        return true;

      case 'AFTER_GRADED':
        return (
          attemptStatus === AssessmentAttemptStatus.GRADED ||
          attemptStatus === AssessmentAttemptStatus.PASSED ||
          attemptStatus === AssessmentAttemptStatus.FAILED
        );

      case 'AFTER_ASSESSMENT_CLOSED':
        return !!assessmentAvailableUntil && now >= assessmentAvailableUntil;

      case 'MANUAL':
        /**
         * Since you only added reviewTiming and reviewContent,
         * but not reviewAvailableFrom/reviewAvailableUntil,
         * MANUAL cannot be evaluated yet.
         */
        return false;

      default:
        return false;
    }
  }

  async getAttemptHistory(
    input: GetAttemptHistoryInput,
  ): Promise<AttemptHistoryDto> {
    const { courseId, assessmentId, learnerId, page } = input;
    const pageSize = 20;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
      { requirePublished: false },
    );

    const assessment =
      await this.iAttemptRepository.findAssessmentForLearnerEntry(
        courseId,
        assessmentId,
      );

    if (!assessment || assessment.deletedAt || !assessment.isActive) {
      throw new NotFoundException('Assessment not found.');
    }

    const [attempts, attemptsUsed] = await Promise.all([
      this.iAttemptRepository.findLearnerAttemptsPage(
        assessmentId,
        learnerId,
        (page - 1) * pageSize,
        pageSize,
      ),
      this.iAttemptRepository.countLearnerAttempts(assessmentId, learnerId),
    ]);

    const now = new Date();
    const totalPages = Math.ceil(attemptsUsed / pageSize);

    const attemptsRemaining = this.computeAttemptsRemaining(
      assessment.maxAttempts,
      attemptsUsed,
    );

    const items: AttemptHistoryItemDto[] = attempts.map((attempt) => {
      const isExpired = isAttemptExpired({
        now,
        startedAt: attempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
        availableUntil: assessment.availableUntil,
      });

      const assessmentOpen = this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      );

      const canContinue =
        assessment.status === AssessmentStatus.PUBLISHED &&
        assessment.isActive &&
        !assessment.deletedAt &&
        assessmentOpen &&
        attempt.status === AssessmentAttemptStatus.IN_PROGRESS &&
        !isExpired;

      const canViewResult = this.isFinishedAttemptStatus(attempt.status);

      return {
        attemptId: attempt.id,

        attemptNumber: attempt.attemptNumber,
        status: attempt.status,

        score: attempt.score,
        maxScore: attempt.maxScore,
        passed: attempt.passed,

        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,

        canContinue,
        canViewResult,
        isFinalizing:
          attempt.status === AssessmentAttemptStatus.IN_PROGRESS && isExpired,
      };
    });

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      assessmentType: assessment.type,

      maxAttempts: assessment.maxAttempts,

      attemptsUsed,
      attemptsRemaining,

      attempts: items,
      pagination: {
        page,
        pageSize,
        total: attemptsUsed,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      serverNow: now,
    };
  }

  async getAttemptResult(
    input: GetAttemptResultInput,
  ): Promise<AttemptResultDto> {
    const { courseId, assessmentId, attemptId, learnerId } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessCourse(
      learnerId,
      courseId,
    );

    const attempt = await this.iAttemptRepository.findAttemptResult(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    if (!attempt) {
      throw new NotFoundException('Attempt result not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException('You are not allowed to view this result.');
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (!this.isFinishedAttemptStatus(attempt.status)) {
      throw new BadRequestException('Attempt result is not available yet.');
    }

    const attemptsUsed = await this.iAttemptRepository.countLearnerAttempts(
      assessmentId,
      learnerId,
    );

    const activeAttempt = await this.iAttemptRepository.findActiveAttempt(
      assessmentId,
      learnerId,
    );

    const now = new Date();

    const canRetake = this.computeCanRetake({
      assessmentStatus: assessment.status,
      assessmentIsActive: assessment.isActive,
      assessmentDeletedAt: assessment.deletedAt,
      maxAttempts: assessment.maxAttempts,
      attemptsUsed,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      hasActiveAttempt: !!activeAttempt,
    });

    const canReview = this.computeCanReview({
      attemptStatus: attempt.status,
      reviewTiming: assessment.reviewTiming,
      now,
      assessmentAvailableUntil: assessment.availableUntil,
    });

    const canShowScore = this.computeCanShowScore({
      canReview,
      reviewContent: assessment.reviewContent,
    });

    const answers = this.buildReviewAnswers({
      canReview,
      reviewContent: assessment.reviewContent,
      questions: attempt.questions,
      answers: attempt.answers,
    });

    const projectSubmission = attempt.projectSubmission
      ? this.toProjectSubmissionResultDto({
          submission: attempt.projectSubmission,
          canReview,
          reviewContent: assessment.reviewContent,
        })
      : null;

    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,

      assessmentTitle: assessment.title,
      assessmentType: assessment.type,

      attemptNumber: attempt.attemptNumber,
      status: this.toPublicResultStatus(attempt.status, canShowScore),

      score: canShowScore ? attempt.score : null,
      maxScore: attempt.maxScore,
      passed: canShowScore ? attempt.passed : null,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      canRetake,
      canReview,

      answers,
      projectSubmission,

      serverNow: now,
    };
  }
  private computeCanShowScore(params: {
    canReview: boolean;
    reviewContent: AssessmentReviewContent;
  }): boolean {
    const { canReview, reviewContent } = params;

    if (!canReview) {
      return false;
    }

    switch (reviewContent) {
      case AssessmentReviewContent.SCORE_ONLY:
      case AssessmentReviewContent.SCORE_AND_ANSWERS:
      case AssessmentReviewContent.FULL_REVIEW:
        return true;

      default:
        return false;
    }
  }
  private toPublicResultStatus(
    status: AssessmentAttemptStatus,
    canShowScore: boolean,
  ): AssessmentAttemptStatus {
    if (
      !canShowScore &&
      (status === AssessmentAttemptStatus.PASSED ||
        status === AssessmentAttemptStatus.FAILED)
    ) {
      return AssessmentAttemptStatus.GRADED;
    }

    return status;
  }

  private buildReviewAnswers(params: {
    canReview: boolean;
    reviewContent: string;
    questions: {
      id: string;
      questionText: string;
      type: AssessmentQuestionType;
      explanation: string | null;
      points: number;
      order: number;
      answer: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
      } | null;
    }[];
    answers: {
      questionId: string;
      textAnswer: string | null;
      isCorrect: boolean | null;
      pointsEarned: number | null;
    }[];
  }): AttemptResultAnswerDto[] {
    const { canReview, reviewContent, questions, answers } = params;

    if (!canReview) {
      return [];
    }

    if (reviewContent === 'SCORE_ONLY') {
      return [];
    }

    const answerByQuestionId = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );

    return [...questions]
      .sort((a, b) => a.order - b.order)
      .map((question) => {
        const learnerAnswer = answerByQuestionId.get(question.id);

        const base: AttemptResultAnswerDto = {
          questionId: question.id,
          questionText: question.questionText,
          questionType: question.type,

          points: question.points,
          pointsEarned: learnerAnswer?.pointsEarned ?? null,

          learnerAnswer: learnerAnswer?.textAnswer ?? null,
          isCorrect: learnerAnswer?.isCorrect ?? null,
        };

        if (reviewContent === 'FULL_REVIEW') {
          return {
            ...base,
            correctAnswer: this.getCorrectAnswerForReview(question),
            explanation: question.explanation,
          };
        }

        /**
         * SCORE_AND_ANSWERS:
         * show learner answer and correctness,
         * but hide correct answer and explanation.
         */
        return base;
      });
  }

  private getCorrectAnswerForReview(question: {
    type: AssessmentQuestionType;
    answer: {
      correctOptionAnswer: string | null;
      correctTextAnswer: string | null;
    } | null;
  }): string | null {
    if (!question.answer) {
      return null;
    }

    switch (question.type) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
      case AssessmentQuestionType.TRUE_FALSE:
        return question.answer.correctOptionAnswer;

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        return question.answer.correctTextAnswer;

      case AssessmentQuestionType.PROJECT:
        return null;

      default:
        return null;
    }
  }
  private toProjectSubmissionResultDto(params: {
    submission: {
      id: string;
      status: ProjectSubmissionStatus;

      githubUrl: string | null;
      deployUrl: string | null;
      documentUrl: string | null;
      note: string | null;

      score: number | null;
      feedback: string | null;

      submittedAt: Date;
      gradedAt: Date | null;
    };
    canReview: boolean;
    reviewContent: string;
  }): AttemptResultProjectSubmissionDto {
    const { submission, canReview, reviewContent } = params;

    const canShowScore =
      canReview &&
      (reviewContent === 'SCORE_ONLY' ||
        reviewContent === 'SCORE_AND_ANSWERS' ||
        reviewContent === 'FULL_REVIEW');

    const canShowFeedback = canReview && reviewContent === 'FULL_REVIEW';

    return {
      submissionId: submission.id,

      status: submission.status,

      /**
       * These are learner-owned submission fields.
       * Safe to show as a receipt of what they submitted.
       */
      githubUrl: submission.githubUrl,
      deployUrl: submission.deployUrl,
      documentUrl: submission.documentUrl,
      note: submission.note,

      submittedAt: submission.submittedAt,

      /**
       * Grading fields follow review policy.
       */
      score: canShowScore ? submission.score : null,
      feedback: canShowFeedback ? submission.feedback : null,
      gradedAt: canShowFeedback ? submission.gradedAt : null,
    };
  }

  async submitProject(
    input: SubmitProjectInput,
  ): Promise<SubmitProjectResponseDto> {
    const { courseId, assessmentId, attemptId, learnerId, dto } = input;

    await this.assessmentAccessService.ensureLearnerCanAccessAssessment(
      learnerId,
      courseId,
      assessmentId,
    );

    const attempt = await this.iAttemptRepository.findProjectAttemptForSubmit(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    const now = new Date();

    if (!attempt) {
      throw new NotFoundException('Project attempt not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to submit this project.',
      );
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    if (assessment.type !== AssessmentType.PROJECT) {
      throw new BadRequestException(
        'Only project assessments can be submitted here.',
      );
    }

    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    const isExpired = isAttemptExpired({
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      availableUntil: assessment.availableUntil,
    });

    if (isExpired) {
      throw new ForbiddenException('Attempt has expired.');
    }

    if (attempt.projectSubmission) {
      throw new BadRequestException(
        'Project has already been submitted for this attempt.',
      );
    }

    this.validateProjectSubmissionContent(dto);

    const submission = await this.iAttemptRepository.submitProjectTransaction(
      {
        attemptId: attempt.id,
        githubUrl: dto.githubUrl ?? null,
        deployUrl: dto.deployUrl ?? null,
        documentUrl: dto.documentUrl ?? null,
        note: dto.note ?? null,
        submittedAt: now,
      },
      (context) => this.assertAttemptWriteAllowed(context),
    );

    if (!submission) {
      throw new BadRequestException(
        'Attempt is not in progress or project has already been submitted.',
      );
    }

    return {
      submissionId: submission.id,
      attemptId: submission.attemptId,

      status: submission.status,

      githubUrl: submission.githubUrl,
      deployUrl: submission.deployUrl,
      documentUrl: submission.documentUrl,
      note: submission.note,

      submittedAt: submission.submittedAt,

      score: submission.score,
      feedback: submission.feedback,
      gradedAt: submission.gradedAt,

      serverNow: now,
    };
  }

  private validateProjectSubmissionContent(dto: {
    githubUrl?: string;
    deployUrl?: string;
    documentUrl?: string;
    note?: string;
  }): void {
    const hasContent =
      !!dto.githubUrl?.trim() ||
      !!dto.deployUrl?.trim() ||
      !!dto.documentUrl?.trim() ||
      !!dto.note?.trim();

    if (!hasContent) {
      throw new BadRequestException(
        'At least one project submission field is required.',
      );
    }
  }

  private assertAttemptWriteAllowed(context: AttemptWriteContext): void {
    const { assessment } = context;
    const now = new Date();
    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }
    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException('Assessment availability window is closed.');
    }
    if (
      isAttemptExpired({
        startedAt: context.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
        availableUntil: assessment.availableUntil,
        now,
      })
    ) {
      throw new ForbiddenException(
        'Attempt has expired. Finalization is pending.',
      );
    }
  }
}
