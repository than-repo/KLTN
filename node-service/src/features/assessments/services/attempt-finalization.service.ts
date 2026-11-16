import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentStatus,
  AssessmentType,
} from 'generated/prisma/enums';
import type {
  FinalizedAttemptRecord,
  IAttemptRepository,
} from '../interfaces/attempt.repository.interface';
import type { SubmitAttemptInput } from '../interfaces/learner-assessment-service-input.interface';
import { ATTEMPT_REPOSITORY } from '../repositories/attempt.repository.token';
import { getAttemptDeadline, isAttemptExpired } from '../utils/attempt-timing';
import { QuizGradingService } from './quiz-grading.service';

@Injectable()
export class AttemptFinalizationService {
  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly repository: IAttemptRepository,
    private readonly grading: QuizGradingService,
  ) {}

  submitQuiz(
    input: SubmitAttemptInput,
  ): Promise<FinalizedAttemptRecord | null> {
    return this.repository.finalizeAttemptTransaction(
      input.attemptId,
      (attempt) => {
        if (attempt.learnerId !== input.learnerId)
          throw new ForbiddenException(
            'You are not allowed to submit this attempt.',
          );
        if (
          attempt.assessmentId !== input.assessmentId ||
          attempt.assessment.courseId !== input.courseId
        ) {
          throw new BadRequestException(
            'Attempt does not belong to this assessment or course.',
          );
        }
        const assessment = attempt.assessment;
        if (assessment.type !== AssessmentType.QUIZ)
          throw new BadRequestException(
            'Only quiz attempts can be submitted here.',
          );
        if (
          assessment.status !== AssessmentStatus.PUBLISHED ||
          !assessment.isActive ||
          assessment.deletedAt
        ) {
          throw new ForbiddenException('Assessment is not available.');
        }
        const now = new Date();
        if (
          (assessment.availableFrom && now < assessment.availableFrom) ||
          (assessment.availableUntil && now >= assessment.availableUntil)
        ) {
          throw new ForbiddenException(
            'Assessment is outside the available time window.',
          );
        }
        if (
          isAttemptExpired({
            startedAt: attempt.startedAt,
            timeLimitMinutes: assessment.timeLimitMinutes,
            availableUntil: assessment.availableUntil,
            now,
          })
        ) {
          throw new ForbiddenException(
            'Attempt has expired. Finalization is pending.',
          );
        }
        const grade = this.grading.grade(attempt);
        return {
          ...grade,
          status: grade.passed
            ? AssessmentAttemptStatus.PASSED
            : AssessmentAttemptStatus.FAILED,
          submittedAt: now,
        };
      },
    );
  }

  finalizeExpired(attemptId: string): Promise<FinalizedAttemptRecord | null> {
    return this.repository.finalizeAttemptTransaction(attemptId, (attempt) => {
      const timeLimitMinutes = attempt.assessment.timeLimitMinutes;
      const availableUntil = attempt.assessment.availableUntil;
      if (
        !isAttemptExpired({
          startedAt: attempt.startedAt,
          timeLimitMinutes,
          availableUntil,
          now: new Date(),
        }) ||
        attempt.projectSubmission
      )
        return null;
      const submittedAt = getAttemptDeadline(
        attempt.startedAt,
        timeLimitMinutes,
        availableUntil,
      )!;
      if (attempt.assessment.type === AssessmentType.PROJECT) {
        return {
          status: AssessmentAttemptStatus.FAILED,
          score: 0,
          maxScore: attempt.maxScore,
          passed: false,
          submittedAt,
          gradedAnswers: [],
        };
      }
      const grade = this.grading.grade(attempt);
      return {
        ...grade,
        status: grade.passed
          ? AssessmentAttemptStatus.PASSED
          : AssessmentAttemptStatus.FAILED,
        submittedAt,
      };
    });
  }
}
