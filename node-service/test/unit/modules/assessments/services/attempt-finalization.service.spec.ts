jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentQuestionType,
  AssessmentStatus,
  AssessmentType,
} from 'generated/prisma/enums';
import type {
  AttemptFinalizationCallback,
  FinalizedAttemptRecord,
  IAttemptRepository,
  SubmitQuizAttemptRecord,
} from '../../../../../src/features/assessments/interfaces/attempt.repository.interface';
import { AttemptFinalizationService } from '../../../../../src/features/assessments/services/attempt-finalization.service';
import { QuizGradingService } from '../../../../../src/features/assessments/services/quiz-grading.service';

describe('AttemptFinalizationService', () => {
  let repository: jest.Mocked<
    Pick<IAttemptRepository, 'finalizeAttemptTransaction'>
  >;
  let grading: QuizGradingService;
  let service: AttemptFinalizationService;

  const now = new Date('2026-11-19T10:00:00.000Z');
  const courseId = 'course-1';
  const assessmentId = 'assessment-1';
  const attemptId = 'attempt-1';
  const learnerId = 'learner-1';

  function makeAttemptSnapshot(
    overrides: Partial<SubmitQuizAttemptRecord> = {},
  ): SubmitQuizAttemptRecord {
    return {
      id: attemptId,
      learnerId,
      assessmentId,
      attemptNumber: 1,
      status: AssessmentAttemptStatus.IN_PROGRESS,
      score: null,
      maxScore: null,
      passed: false,
      startedAt: new Date(now.getTime() - 30_000),
      submittedAt: null,
      projectSubmission: null,
      assessment: {
        id: assessmentId,
        courseId,
        title: 'Unit Test Quiz',
        type: AssessmentType.QUIZ,
        status: AssessmentStatus.PUBLISHED,
        isActive: true,
        deletedAt: null,
        totalPoints: 10,
        passingScore: 70,
        maxAttempts: 2,
        timeLimitMinutes: 5,
        availableFrom: null,
        availableUntil: null,
        reviewTiming: 'AFTER_GRADED',
        reviewContent: 'FULL_REVIEW',
      },
      questions: [
        {
          id: 'q-1',
          questionText: '2 + 2 = ?',
          type: AssessmentQuestionType.MULTIPLE_CHOICE,
          explanation: null,
          points: 10,
          order: 0,
          isActive: true,
          deletedAt: null,
          answer: {
            correctOptionAnswer: '4',
            correctTextAnswer: null,
            wrongAnswers: ['3', '5'],
          },
        },
      ],
      savedAnswers: [
        {
          id: 'ans-1',
          questionId: 'q-1',
          textAnswer: '4',
        },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    grading = new QuizGradingService();
    repository = {
      finalizeAttemptTransaction: jest.fn(),
    };

    service = new AttemptFinalizationService(
      repository as unknown as IAttemptRepository,
      grading,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockTransactionWith(snapshot: SubmitQuizAttemptRecord) {
    repository.finalizeAttemptTransaction.mockImplementation(
      async (_id: string, decide: AttemptFinalizationCallback) => {
        const write = decide(snapshot);
        if (!write) return null;
        return {
          snapshot,
          attempt: {
            id: snapshot.id,
            assessmentId: snapshot.assessmentId,
            learnerId: snapshot.learnerId,
            attemptNumber: snapshot.attemptNumber,
            status: write.status,
            score: write.score,
            maxScore: write.maxScore,
            passed: write.passed,
            startedAt: snapshot.startedAt,
            submittedAt: write.submittedAt,
          },
          gradedAnswers: write.gradedAnswers,
        } satisfies FinalizedAttemptRecord;
      },
    );
  }

  describe('submitQuiz', () => {
    const input = { courseId, assessmentId, attemptId, learnerId };

    it('grades and passes a valid active quiz attempt', async () => {
      const snapshot = makeAttemptSnapshot();
      mockTransactionWith(snapshot);

      const result = await service.submitQuiz(input);

      expect(result?.attempt).toEqual(
        expect.objectContaining({
          status: AssessmentAttemptStatus.PASSED,
          score: 10,
          maxScore: 10,
          passed: true,
          submittedAt: now,
        }),
      );
      expect(result?.gradedAnswers).toEqual([
        { attemptAnswerId: 'ans-1', isCorrect: true, pointsEarned: 10 },
      ]);
    });

    it('grades and fails when score is below passingScore', async () => {
      const snapshot = makeAttemptSnapshot({
        savedAnswers: [{ id: 'ans-1', questionId: 'q-1', textAnswer: '3' }],
      });
      mockTransactionWith(snapshot);

      const result = await service.submitQuiz(input);

      expect(result?.attempt).toEqual(
        expect.objectContaining({
          status: AssessmentAttemptStatus.FAILED,
          score: 0,
          maxScore: 10,
          passed: false,
        }),
      );
    });

    it('returns null when repository reports attempt was already finalized', async () => {
      repository.finalizeAttemptTransaction.mockResolvedValue(null);

      await expect(service.submitQuiz(input)).resolves.toBeNull();
    });

    it('throws ForbiddenException when learnerId does not match attempt owner', async () => {
      mockTransactionWith(makeAttemptSnapshot({ learnerId: 'other-learner' }));

      await expect(service.submitQuiz(input)).rejects.toThrow(
        new ForbiddenException('You are not allowed to submit this attempt.'),
      );
    });

    it('throws BadRequestException when assessmentId or courseId mismatches', async () => {
      mockTransactionWith(
        makeAttemptSnapshot({ assessmentId: 'other-assessment' }),
      );
      await expect(service.submitQuiz(input)).rejects.toThrow(
        new BadRequestException(
          'Attempt does not belong to this assessment or course.',
        ),
      );

      const wrongCourse = makeAttemptSnapshot();
      wrongCourse.assessment.courseId = 'other-course';
      mockTransactionWith(wrongCourse);
      await expect(service.submitQuiz(input)).rejects.toThrow(
        new BadRequestException(
          'Attempt does not belong to this assessment or course.',
        ),
      );
    });

    it('throws BadRequestException when assessment type is PROJECT', async () => {
      const projectAttempt = makeAttemptSnapshot();
      projectAttempt.assessment.type = AssessmentType.PROJECT;
      mockTransactionWith(projectAttempt);

      await expect(service.submitQuiz(input)).rejects.toThrow(
        new BadRequestException('Only quiz attempts can be submitted here.'),
      );
    });

    it.each([
      ['DRAFT status', { status: AssessmentStatus.DRAFT }],
      ['ARCHIVED status', { status: AssessmentStatus.ARCHIVED }],
      ['inactive', { isActive: false }],
      ['soft-deleted', { deletedAt: now }],
    ])(
      'throws ForbiddenException when assessment is unavailable (%s)',
      async (_label, patch) => {
        const snapshot = makeAttemptSnapshot();
        Object.assign(snapshot.assessment, patch);
        mockTransactionWith(snapshot);

        await expect(service.submitQuiz(input)).rejects.toThrow(
          new ForbiddenException('Assessment is not available.'),
        );
      },
    );

    it.each([
      ['before availableFrom', new Date(now.getTime() + 1), null],
      ['at availableUntil', null, now],
      ['after availableUntil', null, new Date(now.getTime() - 1)],
    ])(
      'throws ForbiddenException when outside availability window (%s)',
      async (_label, availableFrom, availableUntil) => {
        const snapshot = makeAttemptSnapshot();
        snapshot.assessment.availableFrom = availableFrom;
        snapshot.assessment.availableUntil = availableUntil;
        mockTransactionWith(snapshot);

        await expect(service.submitQuiz(input)).rejects.toThrow(
          new ForbiddenException(
            'Assessment is outside the available time window.',
          ),
        );
      },
    );

    it('throws ForbiddenException when attempt timer has expired', async () => {
      const snapshot = makeAttemptSnapshot({
        startedAt: new Date(now.getTime() - 5 * 60_000),
      });
      mockTransactionWith(snapshot);

      await expect(service.submitQuiz(input)).rejects.toThrow(
        new ForbiddenException('Attempt has expired. Finalization is pending.'),
      );
    });
  });

  describe('finalizeExpired', () => {
    it('returns null when attempt is not yet expired', async () => {
      mockTransactionWith(makeAttemptSnapshot());

      await expect(service.finalizeExpired(attemptId)).resolves.toBeNull();
    });

    it('returns null when PROJECT attempt already has a projectSubmission', async () => {
      const snapshot = makeAttemptSnapshot({
        startedAt: new Date(now.getTime() - 10 * 60_000),
        projectSubmission: { id: 'sub-1' },
      });
      snapshot.assessment.type = AssessmentType.PROJECT;
      mockTransactionWith(snapshot);

      await expect(service.finalizeExpired(attemptId)).resolves.toBeNull();
    });

    it('finalizes an expired QUIZ attempt using the exact timer deadline as submittedAt', async () => {
      const startedAt = new Date(now.getTime() - 10 * 60_000);
      const expectedDeadline = new Date(startedAt.getTime() + 5 * 60_000);
      const snapshot = makeAttemptSnapshot({ startedAt });
      mockTransactionWith(snapshot);

      const result = await service.finalizeExpired(attemptId);

      expect(result?.attempt).toEqual(
        expect.objectContaining({
          status: AssessmentAttemptStatus.PASSED,
          score: 10,
          maxScore: 10,
          passed: true,
          submittedAt: expectedDeadline,
        }),
      );
    });

    it('uses availableUntil as submittedAt when closing deadline precedes timer deadline', async () => {
      const startedAt = new Date(now.getTime() - 10 * 60_000);
      const closingDeadline = new Date(startedAt.getTime() + 2 * 60_000);
      const snapshot = makeAttemptSnapshot({ startedAt });
      snapshot.assessment.availableUntil = closingDeadline;
      mockTransactionWith(snapshot);

      const result = await service.finalizeExpired(attemptId);

      expect(result?.attempt.submittedAt).toEqual(closingDeadline);
    });

    it('fails an expired PROJECT attempt with score 0 without running quiz grading', async () => {
      const startedAt = new Date(now.getTime() - 10 * 60_000);
      const snapshot = makeAttemptSnapshot({
        startedAt,
        maxScore: 100,
        questions: [],
      });
      snapshot.assessment.type = AssessmentType.PROJECT;
      const gradeSpy = jest.spyOn(grading, 'grade');
      mockTransactionWith(snapshot);

      const result = await service.finalizeExpired(attemptId);

      expect(gradeSpy).not.toHaveBeenCalled();
      expect(result?.attempt).toEqual(
        expect.objectContaining({
          status: AssessmentAttemptStatus.FAILED,
          score: 0,
          maxScore: 100,
          passed: false,
          submittedAt: new Date(startedAt.getTime() + 5 * 60_000),
        }),
      );
      expect(result?.gradedAnswers).toEqual([]);
    });
  });
});
