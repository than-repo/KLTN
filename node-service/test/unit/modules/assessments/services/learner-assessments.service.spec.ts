jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentQuestionType,
  AssessmentReviewContent,
  AssessmentReviewTiming,
  AssessmentStatus,
  AssessmentType,
  ProjectSubmissionStatus,
} from 'generated/prisma/enums';
import { CreateAttemptAction } from '../../../../../src/features/assessments/dtos/attempts/create-attempt.dto';
import {
  LearnerAssessmentAction,
  LearnerAssessmentState,
} from '../../../../../src/features/assessments/dtos/attempts/learner-assessment.dto';
import type {
  ActiveAttemptDetailRecord,
  AttemptResultRecord,
  AttemptWriteContext,
  IAttemptRepository,
  LearnerAssessmentEntryRecord,
  LearnerAttemptSummaryRecord,
  LearnerCourseAssessmentListRecord,
  SaveAnswerAttemptContextRecord,
  SubmitProjectAttemptRecord,
} from '../../../../../src/features/assessments/interfaces/attempt.repository.interface';
import type { AssessmentAccessService } from '../../../../../src/features/assessments/services/assessment-access.service';
import type { AttemptFinalizationService } from '../../../../../src/features/assessments/services/attempt-finalization.service';
import { LearnerAssessmentsService } from '../../../../../src/features/assessments/services/learner-assessments.service';

describe('LearnerAssessmentsService', () => {
  let attemptRepo: jest.Mocked<IAttemptRepository>;
  let accessService: jest.Mocked<
    Pick<
      AssessmentAccessService,
      'ensureLearnerCanAccessCourse' | 'ensureLearnerCanAccessAssessment'
    >
  >;
  let finalizationService: jest.Mocked<
    Pick<AttemptFinalizationService, 'submitQuiz' | 'finalizeExpired'>
  >;
  let service: LearnerAssessmentsService;

  const now = new Date('2026-11-19T12:00:00.000Z');
  const prevSavedAt = new Date(now.getTime() - 5_000);
  const courseId = 'course-1';
  const assessmentId = 'assessment-1';
  const attemptId = 'attempt-1';
  const questionId = 'question-1';
  const learnerId = 'learner-1';
  const lessonId = 'lesson-1';

  const baseEntry: LearnerAssessmentEntryRecord = {
    id: assessmentId,
    courseId,
    title: 'Module 1 Quiz',
    description: 'Quiz description',
    type: AssessmentType.QUIZ,
    status: AssessmentStatus.PUBLISHED,
    totalPoints: 10,
    passingScore: 70,
    maxAttempts: 2,
    timeLimitMinutes: 10,
    availableFrom: null,
    availableUntil: null,
    isActive: true,
    deletedAt: null,
  };

  function makeSummary(
    overrides: Partial<LearnerAttemptSummaryRecord> = {},
  ): LearnerAttemptSummaryRecord {
    return {
      id: attemptId,
      assessmentId,
      learnerId,
      attemptNumber: 1,
      status: AssessmentAttemptStatus.IN_PROGRESS,
      score: null,
      maxScore: null,
      passed: false,
      startedAt: new Date(now.getTime() - 60_000),
      submittedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    attemptRepo = {
      findPublishedAssessmentsForLearnerCourse: jest.fn(),
      findAssessmentForLearnerEntry: jest.fn().mockResolvedValue(baseEntry),
      findLearnerAttempts: jest.fn().mockResolvedValue([]),
      findLearnerAttemptsPage: jest.fn().mockResolvedValue([]),
      findActiveAttempt: jest.fn().mockResolvedValue(null),
      findLatestAttempt: jest.fn().mockResolvedValue(null),
      createAttempt: jest.fn(),
      createOrResumeAttemptTransaction: jest.fn(),
      findActiveAttemptDetail: jest.fn(),
      findSaveAnswerContext: jest.fn(),
      findExpiredAttemptIds: jest.fn(),
      finalizeAttemptTransaction: jest.fn(),
      upsertAttemptAnswer: jest.fn(),
      countLearnerAttempts: jest.fn().mockResolvedValue(0),
      findAttemptResult: jest.fn(),
      findProjectAttemptForSubmit: jest.fn(),
      submitProjectTransaction: jest.fn(),
    };

    accessService = {
      ensureLearnerCanAccessCourse: jest.fn().mockResolvedValue(undefined),
      ensureLearnerCanAccessAssessment: jest.fn().mockResolvedValue(undefined),
    };

    finalizationService = {
      submitQuiz: jest.fn(),
      finalizeExpired: jest.fn(),
    };

    service = new LearnerAssessmentsService(
      attemptRepo,
      accessService as unknown as AssessmentAccessService,
      finalizationService as unknown as AttemptFinalizationService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getLearnerCourseAssessments', () => {
    it('returns published assessments and nullifies afterLesson if lesson or section is hidden/deleted', async () => {
      const validContext = {
        isActive: true,
        deletedAt: null,
        section: { courseId, isActive: true, deletedAt: null },
      };
      const items: LearnerCourseAssessmentListRecord[] = [
        {
          id: 'a-1',
          courseId,
          afterLesson: lessonId,
          afterLessonContext: validContext,
          title: 'Active Lesson Quiz',
          description: null,
          type: AssessmentType.QUIZ,
          order: 0,
          totalPoints: 10,
          passingScore: 70,
          maxAttempts: 2,
          timeLimitMinutes: 15,
          availableFrom: null,
          availableUntil: null,
        },
        {
          id: 'a-2',
          courseId,
          afterLesson: 'hidden-lesson',
          afterLessonContext: { ...validContext, isActive: false },
          title: 'Hidden Lesson Quiz',
          description: null,
          type: AssessmentType.PROJECT,
          order: 1,
          totalPoints: 100,
          passingScore: null,
          maxAttempts: 1,
          timeLimitMinutes: null,
          availableFrom: null,
          availableUntil: null,
        },
      ];
      attemptRepo.findPublishedAssessmentsForLearnerCourse.mockResolvedValue(
        items,
      );

      const result = await service.getLearnerCourseAssessments({
        courseId,
        learnerId,
      });

      expect(accessService.ensureLearnerCanAccessCourse).toHaveBeenCalledWith(
        learnerId,
        courseId,
      );
      expect(result.serverNow).toEqual(now);
      expect(result.assessments[0].afterLesson).toBe(lessonId);
      expect(result.assessments[1].afterLesson).toBeNull();
    });
  });

  describe('getLearnerAssessment', () => {
    const input = { courseId, assessmentId, learnerId };

    it('throws NotFoundException when assessment is missing, deleted, or inactive', async () => {
      attemptRepo.findAssessmentForLearnerEntry.mockResolvedValueOnce(null);
      await expect(service.getLearnerAssessment(input)).rejects.toThrow(
        NotFoundException,
      );

      attemptRepo.findAssessmentForLearnerEntry.mockResolvedValueOnce({
        ...baseEntry,
        isActive: false,
      });
      await expect(service.getLearnerAssessment(input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns CAN_START / START when learner has no attempts', async () => {
      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.CAN_START);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.START);
      expect(result.attemptsUsed).toBe(0);
      expect(result.attemptsRemaining).toBe(2);
      expect(result.latestAttempt).toBeNull();
    });

    it('returns CAN_CONTINUE / CONTINUE when an unexpired IN_PROGRESS attempt exists', async () => {
      attemptRepo.findLearnerAttempts.mockResolvedValue([makeSummary()]);

      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.CAN_CONTINUE);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.CONTINUE);
      expect(result.latestAttempt?.remainingSeconds).toBe(540);
    });

    it('returns FINALIZING / NONE when an IN_PROGRESS attempt is expired', async () => {
      attemptRepo.findLearnerAttempts.mockResolvedValue([
        makeSummary({ startedAt: new Date(now.getTime() - 10 * 60_000) }),
      ]);

      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.FINALIZING);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.NONE);
    });

    it('returns LOCKED / NONE when assessment is not published', async () => {
      attemptRepo.findAssessmentForLearnerEntry.mockResolvedValue({
        ...baseEntry,
        status: AssessmentStatus.ARCHIVED,
      });

      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.LOCKED);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.NONE);
    });

    it('returns NOT_AVAILABLE / NONE outside the availability window', async () => {
      attemptRepo.findAssessmentForLearnerEntry.mockResolvedValue({
        ...baseEntry,
        availableFrom: new Date(now.getTime() + 60_000),
      });

      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.NOT_AVAILABLE);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.NONE);
    });

    it('returns MAX_ATTEMPTS_REACHED / NONE when maxAttempts is exhausted', async () => {
      attemptRepo.findLearnerAttempts.mockResolvedValue([
        makeSummary({
          id: 'a-1',
          attemptNumber: 1,
          status: AssessmentAttemptStatus.FAILED,
        }),
        makeSummary({
          id: 'a-2',
          attemptNumber: 2,
          status: AssessmentAttemptStatus.FAILED,
        }),
      ]);

      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.MAX_ATTEMPTS_REACHED);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.NONE);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('returns COMPLETED / VIEW_RESULT when latest attempt is finished and retakes remain', async () => {
      attemptRepo.findLearnerAttempts.mockResolvedValue([
        makeSummary({
          status: AssessmentAttemptStatus.PASSED,
          score: 9,
          maxScore: 10,
          passed: true,
        }),
      ]);

      const result = await service.getLearnerAssessment(input);

      expect(result.state).toBe(LearnerAssessmentState.COMPLETED);
      expect(result.primaryAction).toBe(LearnerAssessmentAction.VIEW_RESULT);
      expect(result.attemptsRemaining).toBe(1);
    });
  });

  describe('createOrResumeAttempt', () => {
    const input = { courseId, assessmentId, learnerId };

    it('creates a new attempt when transaction returns CREATED', async () => {
      attemptRepo.createOrResumeAttemptTransaction.mockResolvedValue({
        kind: 'CREATED',
        attempt: makeSummary({ startedAt: now }),
      });

      const result = await service.createOrResumeAttempt(input);

      expect(result.action).toBe(CreateAttemptAction.CREATED);
      expect(result.attemptId).toBe(attemptId);
      expect(result.remainingSeconds).toBe(600);
    });

    it('resumes an unexpired attempt when transaction returns RESUMED', async () => {
      attemptRepo.createOrResumeAttemptTransaction.mockResolvedValue({
        kind: 'RESUMED',
        attempt: makeSummary({ startedAt: new Date(now.getTime() - 60_000) }),
      });

      const result = await service.createOrResumeAttempt(input);

      expect(result.action).toBe(CreateAttemptAction.RESUMED);
      expect(result.remainingSeconds).toBe(540);
    });

    it('throws ForbiddenException when resumed attempt is already expired', async () => {
      attemptRepo.createOrResumeAttemptTransaction.mockResolvedValue({
        kind: 'RESUMED',
        attempt: makeSummary({
          startedAt: new Date(now.getTime() - 10 * 60_000),
        }),
      });

      await expect(service.createOrResumeAttempt(input)).rejects.toThrow(
        new ForbiddenException('Attempt has expired. Finalization is pending.'),
      );
    });

    it('throws ForbiddenException when MAX_ATTEMPTS_REACHED or outside window', async () => {
      attemptRepo.createOrResumeAttemptTransaction.mockResolvedValueOnce({
        kind: 'MAX_ATTEMPTS_REACHED',
        attempt: null,
      });
      await expect(service.createOrResumeAttempt(input)).rejects.toThrow(
        new ForbiddenException('Maximum attempt limit reached.'),
      );

      attemptRepo.findAssessmentForLearnerEntry.mockResolvedValueOnce({
        ...baseEntry,
        availableUntil: now,
      });
      await expect(service.createOrResumeAttempt(input)).rejects.toThrow(
        new ForbiddenException(
          'Assessment is outside the available time window.',
        ),
      );
    });
  });

  describe('getActiveAttempt', () => {
    const input = { courseId, assessmentId, attemptId, learnerId };

    function makeActiveDetail(
      overrides: Partial<ActiveAttemptDetailRecord> = {},
    ): ActiveAttemptDetailRecord {
      return {
        id: attemptId,
        assessmentId,
        learnerId,
        attemptNumber: 1,
        status: AssessmentAttemptStatus.IN_PROGRESS,
        score: null,
        maxScore: null,
        passed: false,
        startedAt: new Date(now.getTime() - 60_000),
        submittedAt: null,
        assessment: {
          ...baseEntry,
          timeLimitMinutes: 10,
        },
        questions: [
          {
            id: 'q-2',
            questionText: 'TF Question',
            type: AssessmentQuestionType.TRUE_FALSE,
            points: 5,
            order: 2,
            isActive: true,
            deletedAt: null,
            answer: {
              correctOptionAnswer: 'true',
              correctTextAnswer: null,
              wrongAnswers: ['false'],
            },
          },
          {
            id: 'q-1',
            questionText: 'MC Question',
            type: AssessmentQuestionType.MULTIPLE_CHOICE,
            points: 5,
            order: 1,
            isActive: true,
            deletedAt: null,
            answer: {
              correctOptionAnswer: 'Correct',
              correctTextAnswer: null,
              wrongAnswers: ['Wrong 1', 'Wrong 2'],
            },
          },
          {
            id: 'q-deleted',
            questionText: 'Deleted Question',
            type: AssessmentQuestionType.FILL_IN_THE_BLANK,
            points: 5,
            order: 0,
            isActive: false,
            deletedAt: now,
            answer: null,
          },
        ],
        savedAnswers: [
          {
            questionId: 'q-1',
            textAnswer: 'Correct',
            createdAt: prevSavedAt,
            updatedAt: prevSavedAt,
          },
        ],
        ...overrides,
      };
    }

    it('returns sorted safe questions without answer keys and restores saved answers', async () => {
      attemptRepo.findActiveAttemptDetail.mockResolvedValue(makeActiveDetail());

      const result = await service.getActiveAttempt(input);

      expect(result.questions.map((q) => q.questionId)).toEqual(['q-1', 'q-2']);
      expect(result.questions[0].options).toEqual(
        expect.arrayContaining(['Correct', 'Wrong 1', 'Wrong 2']),
      );
      expect(result.questions[0]).not.toHaveProperty('answer');
      expect(result.questions[1].options).toEqual(['true', 'false']);
      expect(result.savedAnswers).toEqual([
        { questionId: 'q-1', answer: 'Correct', savedAt: prevSavedAt },
      ]);
      expect(result.projectRequirement).toBeNull();
    });

    it('builds projectRequirement and omits questions for PROJECT assessments', async () => {
      const detail = makeActiveDetail({
        questions: [
          {
            id: 'q-proj',
            questionText: 'Build a NestJS microservice',
            type: AssessmentQuestionType.PROJECT,
            points: 100,
            order: 0,
            isActive: true,
            deletedAt: null,
          },
        ],
      });
      detail.assessment.type = AssessmentType.PROJECT;
      detail.assessment.totalPoints = 100;
      attemptRepo.findActiveAttemptDetail.mockResolvedValue(detail);

      const result = await service.getActiveAttempt(input);

      expect(result.questions).toEqual([]);
      expect(result.savedAnswers).toEqual([]);
      expect(result.projectRequirement).toEqual({
        title: 'Module 1 Quiz',
        description: 'Quiz description',
        requirement: 'Build a NestJS microservice',
        totalPoints: 100,
        note: null,
      });
    });

    it('throws ConflictException ATTEMPT_NOT_ACTIVE when attempt is already finished', async () => {
      attemptRepo.findActiveAttemptDetail.mockResolvedValue(
        makeActiveDetail({ status: AssessmentAttemptStatus.PASSED }),
      );

      await expect(service.getActiveAttempt(input)).rejects.toMatchObject({
        response: { error: 'ATTEMPT_NOT_ACTIVE' },
      });
    });

    it('throws ConflictException ATTEMPT_FINALIZING when attempt has expired', async () => {
      attemptRepo.findActiveAttemptDetail.mockResolvedValue(
        makeActiveDetail({
          startedAt: new Date(now.getTime() - 10 * 60_000),
        }),
      );

      await expect(service.getActiveAttempt(input)).rejects.toMatchObject({
        response: { error: 'ATTEMPT_FINALIZING' },
      });
    });

    it('throws NotFoundException when attempt does not exist', async () => {
      attemptRepo.findActiveAttemptDetail.mockResolvedValue(null);

      await expect(service.getActiveAttempt(input)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('saveAttemptAnswer', () => {
    function makeSaveContext(
      overrides: Partial<SaveAnswerAttemptContextRecord> = {},
    ): SaveAnswerAttemptContextRecord {
      return {
        id: attemptId,
        assessmentId,
        learnerId,
        status: AssessmentAttemptStatus.IN_PROGRESS,
        startedAt: new Date(now.getTime() - 60_000),
        assessment: {
          id: assessmentId,
          courseId,
          type: AssessmentType.QUIZ,
          status: AssessmentStatus.PUBLISHED,
          isActive: true,
          deletedAt: null,
          timeLimitMinutes: 10,
          availableFrom: null,
          availableUntil: null,
        },
        question: {
          id: questionId,
          assessmentId,
          type: AssessmentQuestionType.MULTIPLE_CHOICE,
          isActive: true,
          deletedAt: null,
          answer: {
            correctOptionAnswer: 'Option A',
            correctTextAnswer: null,
            wrongAnswers: ['Option B'],
          },
        },
        ...overrides,
      };
    }

    it('validates option, enforces OCC version match, and returns savedAt', async () => {
      const ctx = makeSaveContext();
      attemptRepo.findSaveAnswerContext.mockResolvedValue(ctx);
      attemptRepo.upsertAttemptAnswer.mockImplementation(
        async (params, assertAllowed) => {
          const writeCtx: AttemptWriteContext = {
            startedAt: ctx.startedAt,
            assessment: ctx.assessment,
          };
          assertAllowed(writeCtx, prevSavedAt);
          return {
            ...params,
            createdAt: prevSavedAt,
            updatedAt: now,
          };
        },
      );

      const result = await service.saveAttemptAnswer({
        courseId,
        assessmentId,
        attemptId,
        questionId,
        learnerId,
        dto: {
          answer: '  Option A  ',
          expectedSavedAt: prevSavedAt.toISOString(),
        },
      });

      expect(result).toEqual({
        attemptId,
        questionId,
        saved: true,
        savedAt: now,
        remainingSeconds: 540,
        serverNow: now,
      });
    });

    it('throws ConflictException ANSWER_VERSION_CONFLICT when version mismatches', async () => {
      const ctx = makeSaveContext();
      attemptRepo.findSaveAnswerContext.mockResolvedValue(ctx);
      attemptRepo.upsertAttemptAnswer.mockImplementation(
        async (_params, assertAllowed) => {
          assertAllowed(
            { startedAt: ctx.startedAt, assessment: ctx.assessment },
            prevSavedAt,
          );
          return null;
        },
      );

      await expect(
        service.saveAttemptAnswer({
          courseId,
          assessmentId,
          attemptId,
          questionId,
          learnerId,
          dto: { answer: 'Option A', expectedSavedAt: null },
        }),
      ).rejects.toMatchObject({
        response: { error: 'ANSWER_VERSION_CONFLICT' },
      });
    });

    it('rejects invalid MULTIPLE_CHOICE option or invalid TRUE_FALSE value', async () => {
      attemptRepo.findSaveAnswerContext.mockResolvedValueOnce(
        makeSaveContext(),
      );
      await expect(
        service.saveAttemptAnswer({
          courseId,
          assessmentId,
          attemptId,
          questionId,
          learnerId,
          dto: { answer: 'Option Z', expectedSavedAt: null },
        }),
      ).rejects.toThrow(new BadRequestException('Invalid selected answer.'));

      const tfCtx = makeSaveContext();
      tfCtx.question!.type = AssessmentQuestionType.TRUE_FALSE;
      attemptRepo.findSaveAnswerContext.mockResolvedValueOnce(tfCtx);
      await expect(
        service.saveAttemptAnswer({
          courseId,
          assessmentId,
          attemptId,
          questionId,
          learnerId,
          dto: { answer: 'maybe', expectedSavedAt: null },
        }),
      ).rejects.toThrow(
        new BadRequestException('Answer must be true or false.'),
      );
    });

    it('throws BadRequestException when upsertAttemptAnswer returns null', async () => {
      attemptRepo.findSaveAnswerContext.mockResolvedValue(makeSaveContext());
      attemptRepo.upsertAttemptAnswer.mockResolvedValue(null);

      await expect(
        service.saveAttemptAnswer({
          courseId,
          assessmentId,
          attemptId,
          questionId,
          learnerId,
          dto: { answer: 'Option A', expectedSavedAt: null },
        }),
      ).rejects.toThrow(new BadRequestException('Attempt is not in progress.'));
    });
  });

  describe('submitAttempt & getAttemptResult', () => {
    const input = { courseId, assessmentId, attemptId, learnerId };

    function makeResultRecord(
      overrides: Partial<AttemptResultRecord> = {},
    ): AttemptResultRecord {
      return {
        id: attemptId,
        assessmentId,
        learnerId,
        attemptNumber: 1,
        status: AssessmentAttemptStatus.PASSED,
        score: 10,
        maxScore: 10,
        passed: true,
        startedAt: new Date(now.getTime() - 60_000),
        submittedAt: now,
        assessment: {
          id: assessmentId,
          courseId,
          title: 'Module 1 Quiz',
          type: AssessmentType.QUIZ,
          status: AssessmentStatus.PUBLISHED,
          isActive: true,
          deletedAt: null,
          maxAttempts: 2,
          availableFrom: null,
          availableUntil: null,
          reviewTiming: AssessmentReviewTiming.AFTER_GRADED,
          reviewContent: AssessmentReviewContent.FULL_REVIEW,
        },
        questions: [
          {
            id: questionId,
            questionText: '2 + 2 = ?',
            type: AssessmentQuestionType.MULTIPLE_CHOICE,
            explanation: 'Basic addition',
            points: 10,
            order: 0,
            answer: {
              correctOptionAnswer: '4',
              correctTextAnswer: null,
            },
          },
        ],
        answers: [
          {
            questionId,
            textAnswer: '4',
            isCorrect: true,
            pointsEarned: 10,
          },
        ],
        projectSubmission: null,
        ...overrides,
      };
    }

    it('submits quiz and returns FULL_REVIEW answers and canRetake=true', async () => {
      attemptRepo.countLearnerAttempts.mockResolvedValue(1);
      finalizationService.submitQuiz.mockResolvedValue({
        snapshot: {
          id: attemptId,
          assessmentId,
          learnerId,
          attemptNumber: 1,
          status: AssessmentAttemptStatus.IN_PROGRESS,
          score: null,
          maxScore: null,
          passed: false,
          startedAt: new Date(now.getTime() - 60_000),
          submittedAt: null,
          projectSubmission: null,
          assessment: {
            id: assessmentId,
            courseId,
            title: 'Module 1 Quiz',
            type: AssessmentType.QUIZ,
            status: AssessmentStatus.PUBLISHED,
            isActive: true,
            deletedAt: null,
            totalPoints: 10,
            passingScore: 70,
            maxAttempts: 2,
            timeLimitMinutes: 10,
            availableFrom: null,
            availableUntil: null,
            reviewTiming: AssessmentReviewTiming.AFTER_GRADED,
            reviewContent: AssessmentReviewContent.FULL_REVIEW,
          },
          questions: [
            {
              id: questionId,
              questionText: '2 + 2 = ?',
              type: AssessmentQuestionType.MULTIPLE_CHOICE,
              explanation: 'Basic addition',
              points: 10,
              order: 0,
              isActive: true,
              deletedAt: null,
              answer: {
                correctOptionAnswer: '4',
                correctTextAnswer: null,
                wrongAnswers: ['3'],
              },
            },
          ],
          savedAnswers: [{ id: 'ans-1', questionId, textAnswer: '4' }],
        },
        attempt: {
          id: attemptId,
          assessmentId,
          learnerId,
          attemptNumber: 1,
          status: AssessmentAttemptStatus.PASSED,
          score: 10,
          maxScore: 10,
          passed: true,
          startedAt: new Date(now.getTime() - 60_000),
          submittedAt: now,
        },
        gradedAnswers: [
          { attemptAnswerId: 'ans-1', isCorrect: true, pointsEarned: 10 },
        ],
      });

      const result = await service.submitAttempt(input);

      expect(result.status).toBe(AssessmentAttemptStatus.PASSED);
      expect(result.canRetake).toBe(true);
      expect(result.canReview).toBe(true);
      expect(result.answers).toEqual([
        {
          questionId,
          questionText: '2 + 2 = ?',
          questionType: AssessmentQuestionType.MULTIPLE_CHOICE,
          points: 10,
          pointsEarned: 10,
          learnerAnswer: '4',
          isCorrect: true,
          correctAnswer: '4',
          explanation: 'Basic addition',
        },
      ]);
    });

    it('recovers existing finished quiz result when submitQuiz returns null (idempotent retry)', async () => {
      finalizationService.submitQuiz.mockResolvedValue(null);
      attemptRepo.findAttemptResult.mockResolvedValue(makeResultRecord());

      const result = await service.submitAttempt(input);

      expect(result.attemptId).toBe(attemptId);
      expect(result.status).toBe(AssessmentAttemptStatus.PASSED);
    });

    it('hides score, passed, and answers and masks status to GRADED when reviewTiming is NEVER', async () => {
      const record = makeResultRecord();
      record.assessment.reviewTiming = AssessmentReviewTiming.NEVER;
      attemptRepo.findAttemptResult.mockResolvedValue(record);

      const result = await service.getAttemptResult(input);

      expect(result.canReview).toBe(false);
      expect(result.status).toBe(AssessmentAttemptStatus.GRADED);
      expect(result.score).toBeNull();
      expect(result.passed).toBeNull();
      expect(result.answers).toEqual([]);
    });

    it('hides correctAnswer and explanation when reviewContent is SCORE_AND_ANSWERS', async () => {
      const record = makeResultRecord();
      record.assessment.reviewContent =
        AssessmentReviewContent.SCORE_AND_ANSWERS;
      attemptRepo.findAttemptResult.mockResolvedValue(record);

      const result = await service.getAttemptResult(input);

      expect(result.canReview).toBe(true);
      expect(result.score).toBe(10);
      expect(result.answers?.[0]).not.toHaveProperty('correctAnswer');
      expect(result.answers?.[0]).not.toHaveProperty('explanation');
    });

    it('throws BadRequestException when attempt result is still IN_PROGRESS', async () => {
      attemptRepo.findAttemptResult.mockResolvedValue(
        makeResultRecord({ status: AssessmentAttemptStatus.IN_PROGRESS }),
      );

      await expect(service.getAttemptResult(input)).rejects.toThrow(
        new BadRequestException('Attempt result is not available yet.'),
      );
    });
  });

  describe('getAttemptHistory', () => {
    it('returns paginated attempt history with canContinue, canViewResult, and isFinalizing flags', async () => {
      attemptRepo.countLearnerAttempts.mockResolvedValue(3);
      attemptRepo.findLearnerAttemptsPage.mockResolvedValue([
        makeSummary({
          id: 'att-active',
          attemptNumber: 3,
          status: AssessmentAttemptStatus.IN_PROGRESS,
          startedAt: new Date(now.getTime() - 60_000),
        }),
        makeSummary({
          id: 'att-expired',
          attemptNumber: 2,
          status: AssessmentAttemptStatus.IN_PROGRESS,
          startedAt: new Date(now.getTime() - 15 * 60_000),
        }),
        makeSummary({
          id: 'att-done',
          attemptNumber: 1,
          status: AssessmentAttemptStatus.FAILED,
          score: 4,
          maxScore: 10,
          passed: false,
          submittedAt: prevSavedAt,
        }),
      ]);

      const result = await service.getAttemptHistory({
        courseId,
        assessmentId,
        learnerId,
        page: 1,
      });

      expect(result.attemptsUsed).toBe(3);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.attempts[0]).toMatchObject({
        attemptId: 'att-active',
        canContinue: true,
        canViewResult: false,
        isFinalizing: false,
      });
      expect(result.attempts[1]).toMatchObject({
        attemptId: 'att-expired',
        canContinue: false,
        canViewResult: false,
        isFinalizing: true,
      });
      expect(result.attempts[2]).toMatchObject({
        attemptId: 'att-done',
        canContinue: false,
        canViewResult: true,
        isFinalizing: false,
      });
    });
  });

  describe('submitProject', () => {
    const input = {
      courseId,
      assessmentId,
      attemptId,
      learnerId,
      dto: {
        githubUrl: 'https://github.com/user/repo',
        note: 'Completed all requirements',
      },
    };

    function makeProjectAttempt(
      overrides: Partial<SubmitProjectAttemptRecord> = {},
    ): SubmitProjectAttemptRecord {
      return {
        id: attemptId,
        assessmentId,
        learnerId,
        attemptNumber: 1,
        status: AssessmentAttemptStatus.IN_PROGRESS,
        startedAt: new Date(now.getTime() - 60_000),
        submittedAt: null,
        assessment: {
          id: assessmentId,
          courseId,
          title: 'Final Project',
          type: AssessmentType.PROJECT,
          status: AssessmentStatus.PUBLISHED,
          isActive: true,
          deletedAt: null,
          timeLimitMinutes: null,
          availableFrom: null,
          availableUntil: null,
        },
        projectSubmission: null,
        ...overrides,
      };
    }

    it('submits a valid project attempt and returns submission receipt', async () => {
      const attempt = makeProjectAttempt();
      attemptRepo.findProjectAttemptForSubmit.mockResolvedValue(attempt);
      attemptRepo.submitProjectTransaction.mockImplementation(
        async (data, assertAllowed) => {
          assertAllowed({
            startedAt: attempt.startedAt,
            assessment: attempt.assessment,
          });
          return {
            id: 'sub-1',
            attemptId: data.attemptId,
            status: ProjectSubmissionStatus.SUBMITTED,
            githubUrl: data.githubUrl ?? null,
            deployUrl: data.deployUrl ?? null,
            documentUrl: data.documentUrl ?? null,
            note: data.note ?? null,
            score: null,
            feedback: null,
            submittedAt: data.submittedAt,
            gradedAt: null,
          };
        },
      );

      const result = await service.submitProject(input);

      expect(result).toEqual({
        submissionId: 'sub-1',
        attemptId,
        status: ProjectSubmissionStatus.SUBMITTED,
        githubUrl: 'https://github.com/user/repo',
        deployUrl: null,
        documentUrl: null,
        note: 'Completed all requirements',
        submittedAt: now,
        score: null,
        feedback: null,
        gradedAt: null,
        serverNow: now,
      });
    });

    it('rejects empty project submission payload', async () => {
      attemptRepo.findProjectAttemptForSubmit.mockResolvedValue(
        makeProjectAttempt(),
      );

      await expect(
        service.submitProject({
          ...input,
          dto: { note: '   ' },
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'At least one project submission field is required.',
        ),
      );
      expect(attemptRepo.submitProjectTransaction).not.toHaveBeenCalled();
    });

    it('rejects duplicate submission or non-PROJECT assessment', async () => {
      attemptRepo.findProjectAttemptForSubmit.mockResolvedValueOnce(
        makeProjectAttempt({ projectSubmission: { id: 'existing-sub' } }),
      );
      await expect(service.submitProject(input)).rejects.toThrow(
        new BadRequestException(
          'Project has already been submitted for this attempt.',
        ),
      );

      const quizAttempt = makeProjectAttempt();
      quizAttempt.assessment.type = AssessmentType.QUIZ;
      attemptRepo.findProjectAttemptForSubmit.mockResolvedValueOnce(
        quizAttempt,
      );
      await expect(service.submitProject(input)).rejects.toThrow(
        new BadRequestException(
          'Only project assessments can be submitted here.',
        ),
      );
    });
  });
});
