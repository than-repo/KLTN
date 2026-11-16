jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../generated/prisma/enums')>(
      '../../../generated/prisma/enums',
    ),
  { virtual: true },
);
jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: { TransactionIsolationLevel: { ReadCommitted: 'ReadCommitted' } },
  }),
  { virtual: true },
);
jest.mock(
  'src/core/database/prisma.service',
  () => ({ PrismaService: class {} }),
  { virtual: true },
);

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentStatus,
  AssessmentType,
} from 'generated/prisma/enums';
import type {
  ActiveAttemptDetailRecord,
  AttemptFinalizationCallback,
  AttemptFinalizationWrite,
  IAttemptRepository,
  SubmitQuizAttemptRecord,
} from './interfaces/attempt.repository.interface';
import {
  getAttemptDeadline,
  getRemainingSeconds,
  isAttemptExpired,
} from './utils/attempt-timing';
import { QuizGradingService } from './services/quiz-grading.service';
import { AttemptFinalizationService } from './services/attempt-finalization.service';
import { AssessmentExpiryService } from './services/assessment-expiry.service';
import { AttemptRepository } from './repositories/attempt.repository';
import { LearnerAssessmentsService } from './services/learner-assessments.service';
import type { AssessmentAccessService } from './services/assessment-access.service';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';

const now = new Date('2026-11-13T12:00:00.000Z');
function snapshot(): SubmitQuizAttemptRecord {
  return {
    id: 'attempt',
    learnerId: 'learner',
    assessmentId: 'assessment',
    attemptNumber: 1,
    status: AssessmentAttemptStatus.IN_PROGRESS,
    score: null,
    maxScore: null,
    passed: false,
    startedAt: new Date(now.getTime() - 60_000),
    submittedAt: null,
    projectSubmission: null,
    assessment: {
      id: 'assessment',
      courseId: 'course',
      title: 'Quiz',
      type: AssessmentType.QUIZ,
      status: AssessmentStatus.PUBLISHED,
      isActive: true,
      deletedAt: null,
      totalPoints: 10,
      passingScore: 70,
      maxAttempts: 1,
      timeLimitMinutes: 1,
      availableFrom: null,
      availableUntil: null,
      reviewTiming: 'AFTER_GRADED',
      reviewContent: 'FULL_REVIEW',
    },
    questions: [
      {
        id: 'question',
        questionText: 'Question',
        type: 'MULTIPLE_CHOICE',
        points: 10,
        order: 0,
        isActive: true,
        deletedAt: null,
        explanation: null,
        answer: {
          correctOptionAnswer: 'Yes',
          correctTextAnswer: null,
          wrongAnswers: ['No'],
        },
      },
    ],
    savedAnswers: [
      { id: 'answer', questionId: 'question', textAnswer: ' yes ' },
    ],
  };
}

describe('Exact attempt timing', () => {
  it.each([
    [60_001, 0, true],
    [60_000, 0, true],
    [59_999, 1, false],
    [59_500, 1, false],
    [59_000, 1, false],
    [0, 60, false],
  ])(
    'handles elapsed %i ms without early expiry',
    (elapsed, seconds, expired) => {
      const timing = {
        startedAt: new Date(0),
        now: new Date(elapsed),
        timeLimitMinutes: 1,
      };
      expect(getRemainingSeconds(timing)).toBe(seconds);
      expect(isAttemptExpired(timing)).toBe(expired);
    },
  );
  it('preserves unlimited timers', () => {
    const timing = { startedAt: new Date(0), now, timeLimitMinutes: null };
    expect(getRemainingSeconds(timing)).toBeNull();
    expect(getAttemptDeadline(timing.startedAt, null)).toBeNull();
    expect(isAttemptExpired(timing)).toBe(false);
  });
  it.each([
    [1, null, 60_000],
    [null, 30_000, 30_000],
    [1, 30_000, 30_000],
    [1, 90_000, 60_000],
    [1, 60_000, 60_000],
    [null, null, null],
  ])(
    'uses the earliest deadline for timer %p and closing %p',
    (minutes, closing, expected) => {
      const startedAt = new Date(0);
      const availableUntil = closing === null ? null : new Date(closing);
      expect(
        getAttemptDeadline(startedAt, minutes, availableUntil)?.getTime() ??
          null,
      ).toBe(expected);
      if (expected === null) return;
      for (const offset of [-1, 0, 1]) {
        const timing = {
          startedAt,
          timeLimitMinutes: minutes,
          availableUntil,
          now: new Date(expected + offset),
        };
        expect(isAttemptExpired(timing)).toBe(offset >= 0);
        expect(getRemainingSeconds(timing)).toBe(offset < 0 ? 1 : 0);
      }
    },
  );
});

describe('Quiz grading', () => {
  const grading = new QuizGradingService();
  it.each([
    ['yes', 10, true],
    ['NO', 0, false],
    ['', 0, false],
  ])('grades saved answer %s', (answer, score, passed) => {
    const record = snapshot();
    record.savedAnswers[0].textAnswer = answer;
    expect(grading.grade(record)).toEqual(
      expect.objectContaining({ score, maxScore: 10, passed }),
    );
  });
  it('awards zero to unanswered questions and preserves a null threshold as 100%', () => {
    const record = snapshot();
    record.savedAnswers = [];
    record.assessment.passingScore = null;
    expect(grading.grade(record)).toEqual({
      score: 0,
      maxScore: 10,
      passed: false,
      gradedAnswers: [],
    });
  });
  it.each(['TRUE_FALSE', 'FILL_IN_THE_BLANK'] as const)(
    'preserves normalized %s answers',
    (type) => {
      const record = snapshot();
      record.questions[0].type = type;
      record.questions[0].answer!.correctOptionAnswer = ' TRUE ';
      record.questions[0].answer!.correctTextAnswer = ' TRUE ';
      record.savedAnswers[0].textAnswer = ' true ';
      expect(grading.grade(record).score).toBe(10);
    },
  );
  it.each(['no-questions', 'missing-key', 'zero-points'])(
    'rejects invalid configuration %s',
    (kind) => {
      const record = snapshot();
      if (kind === 'no-questions') record.questions = [];
      if (kind === 'missing-key') record.questions[0].answer = null;
      if (kind === 'zero-points') record.questions[0].points = 0;
      expect(() => grading.grade(record)).toThrow();
    },
  );
});

describe('Finalization decisions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());

  function setup(record = snapshot()) {
    const finalizeAttemptTransaction = jest.fn<
      Promise<AttemptFinalizationWrite | null>,
      [string, AttemptFinalizationCallback]
    >((_id, decide) => Promise.resolve().then(() => decide(record)));
    const service = new AttemptFinalizationService(
      { finalizeAttemptTransaction } as unknown as IAttemptRepository,
      new QuizGradingService(),
    );
    return { service, finalizeAttemptTransaction };
  }
  it('grades at the timer deadline even when assessment/course participation is disabled', async () => {
    const record = snapshot();
    record.assessment.isActive = false;
    record.assessment.deletedAt = now;
    record.assessment.status = AssessmentStatus.ARCHIVED;
    jest.setSystemTime(now.getTime() + 30_000);
    expect(await setup(record).service.finalizeExpired(record.id)).toEqual(
      expect.objectContaining({
        score: 10,
        passed: true,
        status: AssessmentAttemptStatus.PASSED,
        submittedAt: now,
      }),
    );
  });
  it('fails expired projects with zero without grading their questions', async () => {
    const record = snapshot();
    record.assessment.type = AssessmentType.PROJECT;
    record.questions = [];
    expect(await setup(record).service.finalizeExpired(record.id)).toEqual(
      expect.objectContaining({
        score: 0,
        passed: false,
        status: AssessmentAttemptStatus.FAILED,
        submittedAt: now,
      }),
    );
  });
  it('does not finalize submitted projects or attempts with no expired deadline', async () => {
    const record = snapshot();
    record.projectSubmission = { id: 'submission' };
    expect(await setup(record).service.finalizeExpired(record.id)).toBeNull();
    record.projectSubmission = null;
    record.startedAt = now;
    expect(await setup(record).service.finalizeExpired(record.id)).toBeNull();
    record.assessment.timeLimitMinutes = null;
    expect(await setup(record).service.finalizeExpired(record.id)).toBeNull();
  });
  it.each([AssessmentType.QUIZ, AssessmentType.PROJECT])(
    'finalizes an untimed %s at assessment closing',
    async (type) => {
      const record = snapshot();
      record.assessment.type = type;
      record.assessment.timeLimitMinutes = null;
      record.assessment.availableUntil = now;
      const { service } = setup(record);
      jest.setSystemTime(now.getTime() - 1);
      expect(await service.finalizeExpired(record.id)).toBeNull();
      jest.setSystemTime(now.getTime() + 15_000);
      expect(await service.finalizeExpired(record.id)).toEqual(
        expect.objectContaining({
          status: type === AssessmentType.QUIZ ? 'PASSED' : 'FAILED',
          score: type === AssessmentType.QUIZ ? 10 : 0,
          submittedAt: now,
        }),
      );
    },
  );
  it('uses the earlier closing deadline even when the timer has also expired', async () => {
    const record = snapshot();
    const closing = new Date(now.getTime() - 30_000);
    record.assessment.availableUntil = closing;
    expect(await setup(record).service.finalizeExpired(record.id)).toEqual(
      expect.objectContaining({ submittedAt: closing }),
    );
  });
  it('rechecks the current closing configuration under the lock', async () => {
    const record = snapshot();
    record.assessment.timeLimitMinutes = null;
    record.assessment.availableUntil = new Date(now.getTime() + 1000);
    expect(await setup(record).service.finalizeExpired(record.id)).toBeNull();
  });
  it('rejects manual submission exactly at assessment closing without timer expiry', async () => {
    const record = snapshot();
    record.startedAt = now;
    record.assessment.timeLimitMinutes = null;
    record.assessment.availableUntil = now;
    await expect(
      setup(record).service.submitQuiz({
        courseId: 'course',
        assessmentId: record.assessmentId,
        learnerId: record.learnerId,
        attemptId: record.id,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(record.status).toBe('IN_PROGRESS');
  });
  it('rejects manual late submission without writing a zero-score failure', async () => {
    const record = snapshot();
    const { service } = setup(record);
    await expect(
      service.submitQuiz({
        courseId: 'course',
        assessmentId: record.assessmentId,
        learnerId: record.learnerId,
        attemptId: record.id,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(record.status).toBe(AssessmentAttemptStatus.IN_PROGRESS);
    expect(record.score).toBeNull();
  });
  it('uses the locked snapshot for manual grading and enforces ownership', async () => {
    const record = snapshot();
    record.startedAt = now;
    const { service } = setup(record);
    const input = {
      courseId: 'course',
      assessmentId: record.assessmentId,
      learnerId: record.learnerId,
      attemptId: record.id,
    };
    expect(await service.submitQuiz(input)).toEqual(
      expect.objectContaining({ score: 10, submittedAt: now }),
    );
    await expect(
      service.submitQuiz({ ...input, learnerId: 'other' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Expiry worker', () => {
  it('isolates failed attempts and retries on the next run', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    try {
      const findExpiredAttemptIds = jest
        .fn()
        .mockResolvedValue([{ id: 'bad' }, { id: 'good' }]);
      const finalizeExpired = jest
        .fn<
          ReturnType<AttemptFinalizationService['finalizeExpired']>,
          Parameters<AttemptFinalizationService['finalizeExpired']>
        >()
        .mockRejectedValueOnce(new Error('private answer data'))
        .mockResolvedValue(null);
      const worker = new AssessmentExpiryService(
        { findExpiredAttemptIds } as unknown as IAttemptRepository,
        { finalizeExpired } as unknown as AttemptFinalizationService,
      );
      await worker.finalizeExpiredAttempts();
      await worker.finalizeExpiredAttempts();
      expect(finalizeExpired.mock.calls.map(([id]) => id)).toEqual([
        'bad',
        'good',
        'bad',
        'good',
      ]);
      expect(log.mock.calls.flat().join(' ')).not.toContain(
        'private answer data',
      );
    } finally {
      log.mockRestore();
    }
  });
  it('uses keyset batches without starving attempts after a failed item', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({
      id: String(i).padStart(3, '0'),
    }));
    const findExpiredAttemptIds = jest
      .fn<
        ReturnType<IAttemptRepository['findExpiredAttemptIds']>,
        Parameters<IAttemptRepository['findExpiredAttemptIds']>
      >()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce([{ id: '100' }]);
    const finalizeExpired = jest.fn().mockResolvedValue(null);
    await new AssessmentExpiryService(
      { findExpiredAttemptIds } as unknown as IAttemptRepository,
      { finalizeExpired } as unknown as AttemptFinalizationService,
    ).finalizeExpiredAttempts();
    expect(findExpiredAttemptIds.mock.calls[1][1]).toBe('099');
    expect(finalizeExpired).toHaveBeenCalledTimes(101);
  });
  it('prevents startup and scheduler overlap', async () => {
    let release!: (value: { id: string }[]) => void;
    const findExpiredAttemptIds = jest.fn(
      () =>
        new Promise<{ id: string }[]>((resolve) => {
          release = resolve;
        }),
    );
    const worker = new AssessmentExpiryService(
      { findExpiredAttemptIds } as unknown as IAttemptRepository,
      {} as AttemptFinalizationService,
    );
    const run = worker.finalizeExpiredAttempts();
    worker.onApplicationBootstrap();
    expect(findExpiredAttemptIds).toHaveBeenCalledTimes(1);
    release([]);
    await run;
  });
  it('starts recovery without blocking application startup', () => {
    const worker = new AssessmentExpiryService(
      {} as IAttemptRepository,
      {} as AttemptFinalizationService,
    );
    const run = jest
      .spyOn(worker, 'finalizeExpiredAttempts')
      .mockResolvedValue(undefined);
    expect(worker.onApplicationBootstrap()).toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('Repository lock boundaries', () => {
  it('does not read, grade, or overwrite an already-finished attempt', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      assessmentAttempt: { findFirst: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        (run: (transaction: typeof tx) => Promise<unknown>) => run(tx),
      ),
    };
    const decide = jest.fn();
    const repository = new AttemptRepository(
      prisma as unknown as ConstructorParameters<typeof AttemptRepository>[0],
    );
    expect(
      await repository.finalizeAttemptTransaction('attempt', decide),
    ).toBeNull();
    expect(tx.assessmentAttempt.findFirst).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
  });
  it('validates a save after acquiring the lock, before writing', async () => {
    const calls: string[] = [];
    const tx = {
      $queryRaw: jest.fn(() => {
        calls.push('lock');
        return Promise.resolve([{ id: 'attempt' }]);
      }),
      assessmentAttempt: {
        findUniqueOrThrow: jest.fn(() => {
          calls.push('load');
          return Promise.resolve({
            startedAt: new Date(0),
            assessment: { timeLimitMinutes: 1 },
          });
        }),
      },
      assessmentAttemptAnswer: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
    };
    const repository = new AttemptRepository({
      $transaction: (run: (transaction: typeof tx) => Promise<unknown>) =>
        run(tx),
    } as unknown as ConstructorParameters<typeof AttemptRepository>[0]);
    await expect(
      repository.upsertAttemptAnswer(
        { attemptId: 'attempt', questionId: 'question', textAnswer: 'late' },
        () => {
          calls.push('validate');
          throw new ForbiddenException();
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(calls).toEqual(['lock', 'load', 'validate']);
    expect(tx.assessmentAttemptAnswer.upsert).not.toHaveBeenCalled();
  });
});

describe('Read-only entry expiry state', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());
  it('shows FINALIZING before attempt-limit/date checks, then exposes the finished result without a new attempt', async () => {
    const record = snapshot();
    record.assessment.timeLimitMinutes = null;
    record.assessment.availableUntil = new Date(now.getTime() - 1);
    const repository = {
      findAssessmentForLearnerEntry: jest
        .fn()
        .mockResolvedValue(record.assessment),
      findLearnerAttempts: jest
        .fn()
        .mockImplementation(() => Promise.resolve([record])),
    };
    const access = {
      ensureLearnerCanAccessAssessment: jest.fn().mockResolvedValue(undefined),
    };
    const service = new LearnerAssessmentsService(
      repository as unknown as IAttemptRepository,
      access as unknown as AssessmentAccessService,
      {} as AttemptFinalizationService,
    );
    const input = {
      learnerId: record.learnerId,
      courseId: 'course',
      assessmentId: record.assessmentId,
    };
    const pending = await service.getLearnerAssessment(input);
    expect(pending.state).toBe('FINALIZING');
    expect(pending.primaryAction).toBe('NONE');
    expect(pending.latestAttempt?.status).toBe('IN_PROGRESS');
    expect(pending.attemptsRemaining).toBe(0);
    record.status = AssessmentAttemptStatus.PASSED;
    record.score = 10;
    record.submittedAt = now;
    const finished = await service.getLearnerAssessment(input);
    expect(finished.state).not.toBe('FINALIZING');
    expect(finished.latestAttempt?.status).toBe('PASSED');
    expect(finished.attemptsUsed).toBe(1);
    expect(Object.keys(repository)).toEqual([
      'findAssessmentForLearnerEntry',
      'findLearnerAttempts',
    ]);
  });
  it.each([new Date('2099-01-01'), new Date('2000-01-01')])(
    'preserves entry access outside the date window %p',
    async (date) => {
      const record = snapshot();
      const repository = {
        findAssessmentForLearnerEntry: jest.fn().mockResolvedValue({
          ...record.assessment,
          availableFrom: date,
          availableUntil: date,
        }),
        findLearnerAttempts: jest.fn().mockResolvedValue([]),
      };
      const service = new LearnerAssessmentsService(
        repository as unknown as IAttemptRepository,
        {
          ensureLearnerCanAccessAssessment: jest.fn(),
        } as unknown as AssessmentAccessService,
        {} as AttemptFinalizationService,
      );
      expect(
        (
          await service.getLearnerAssessment({
            learnerId: 'learner',
            courseId: 'course',
            assessmentId: 'assessment',
          })
        ).state,
      ).toBe('NOT_AVAILABLE');
    },
  );
});

describe('Active attempt lifecycle contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());

  const input = {
    courseId: 'course',
    assessmentId: 'assessment',
    attemptId: 'attempt',
    learnerId: 'learner',
  };

  function setup() {
    const record = snapshot();
    const attempt: ActiveAttemptDetailRecord = {
      ...record,
      savedAnswers: record.savedAnswers.map((answer) => ({
        ...answer,
        createdAt: now,
        updatedAt: now,
      })),
    };
    const repository = {
      findActiveAttemptDetail: jest.fn().mockResolvedValue(attempt),
    };
    const access = {
      ensureLearnerCanAccessAssessment: jest.fn().mockResolvedValue(undefined),
    };
    const finalizeExpired = jest.fn();
    const service = new LearnerAssessmentsService(
      repository as unknown as IAttemptRepository,
      access as unknown as AssessmentAccessService,
      { finalizeExpired } as unknown as AttemptFinalizationService,
    );
    return { attempt, repository, access, finalizeExpired, service };
  }

  async function expectConflict(
    service: LearnerAssessmentsService,
    reason: string,
  ) {
    let caught: unknown;
    try {
      await service.getActiveAttempt(input);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConflictException);
    const exception = caught as HttpException;
    expect(exception.getStatus()).toBe(409);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const path =
      '/api/v1/learner/course/course/assessments/assessment/attempts/attempt';
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: path }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    new HttpExceptionFilter().catch(exception, host);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 409,
      timestamp: now.toISOString(),
      path,
      error: reason,
      message:
        reason === 'ATTEMPT_FINALIZING'
          ? 'Attempt has ended. Finalization is pending.'
          : 'Attempt is no longer active.',
    });
  }

  it.each(['timer', 'closing', 'both'] as const)(
    'returns FINALIZING for an unfinished attempt ended by %s without writes',
    async (cause) => {
      const { service, attempt, repository, finalizeExpired } = setup();
      if (cause === 'closing') attempt.assessment.timeLimitMinutes = null;
      if (cause !== 'timer') attempt.assessment.availableUntil = now;
      await expectConflict(service, 'ATTEMPT_FINALIZING');
      expect(attempt.status).toBe('IN_PROGRESS');
      expect(attempt.score).toBeNull();
      expect(finalizeExpired).not.toHaveBeenCalled();
      expect(Object.keys(repository)).toEqual(['findActiveAttemptDetail']);
    },
  );

  it.each([
    AssessmentAttemptStatus.SUBMITTED,
    AssessmentAttemptStatus.GRADED,
    AssessmentAttemptStatus.PASSED,
    AssessmentAttemptStatus.FAILED,
  ])(
    'returns NOT_ACTIVE for %s before the closed-window check',
    async (status) => {
      const { service, attempt } = setup();
      attempt.status = status;
      attempt.assessment.type = AssessmentType.PROJECT;
      attempt.assessment.availableUntil = new Date(now.getTime() - 1000);
      await expectConflict(service, 'ATTEMPT_NOT_ACTIVE');
    },
  );

  it('returns a safe active response until the final millisecond before closing', async () => {
    const { service, attempt } = setup();
    const closing = new Date(now.getTime() + 1);
    attempt.assessment.timeLimitMinutes = null;
    attempt.assessment.availableUntil = closing;
    const result = await service.getActiveAttempt(input);
    expect(result.expiresAt).toEqual(closing);
    expect(result.remainingSeconds).toBe(1);
    expect(result.questions[0].options).toEqual(
      expect.arrayContaining(['Yes', 'No']),
    );
    expect(result.questions[0]).not.toHaveProperty('answer');
    expect(result.questions[0]).not.toHaveProperty('isCorrect');
    expect(result.savedAnswers[0].answer).toBe(' yes ');
  });

  it('keeps the timer deadline when it is earlier than closing', async () => {
    const { service, attempt } = setup();
    attempt.startedAt = now;
    attempt.assessment.availableUntil = new Date(now.getTime() + 120_000);
    const result = await service.getActiveAttempt(input);
    expect(result.expiresAt).toEqual(new Date(now.getTime() + 60_000));
    expect(result.remainingSeconds).toBe(60);
  });

  it.each(['CREATED', 'RESUMED'])(
    'returns the closing deadline for a %s attempt',
    async (kind) => {
      const record = snapshot();
      record.startedAt = now;
      record.assessment.timeLimitMinutes = null;
      const closing = new Date(now.getTime() + 5000);
      record.assessment.availableUntil = closing;
      const service = new LearnerAssessmentsService(
        {
          findAssessmentForLearnerEntry: jest
            .fn()
            .mockResolvedValue(record.assessment),
          createOrResumeAttemptTransaction: jest
            .fn()
            .mockResolvedValue({ kind, attempt: record }),
        } as unknown as IAttemptRepository,
        {
          ensureLearnerCanAccessAssessment: jest.fn(),
        } as unknown as AssessmentAccessService,
        {} as AttemptFinalizationService,
      );
      const result = await service.createOrResumeAttempt(input);
      expect(result.expiresAt).toEqual(closing);
      expect(result.remainingSeconds).toBe(5);
    },
  );

  it('preserves null timers when neither deadline is configured', async () => {
    const { service, attempt } = setup();
    attempt.assessment.timeLimitMinutes = null;
    const result = await service.getActiveAttempt(input);
    expect(result.expiresAt).toBeNull();
    expect(result.remainingSeconds).toBeNull();
  });

  it('uses current time after the attempt read completes', async () => {
    const { service, attempt, repository } = setup();
    attempt.assessment.timeLimitMinutes = null;
    attempt.assessment.availableUntil = now;
    jest.setSystemTime(now.getTime() - 1);
    repository.findActiveAttemptDetail.mockImplementation(() => {
      jest.setSystemTime(now);
      return Promise.resolve(attempt);
    });
    await expectConflict(service, 'ATTEMPT_FINALIZING');
  });

  it('rejects an upcoming assessment before returning participation data', async () => {
    const { service, attempt } = setup();
    attempt.assessment.timeLimitMinutes = null;
    attempt.assessment.availableFrom = new Date(now.getTime() + 1000);
    await expect(service.getActiveAttempt(input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('checks access before exposing a lifecycle conflict', async () => {
    const { service, access, repository } = setup();
    access.ensureLearnerCanAccessAssessment.mockRejectedValue(
      new ForbiddenException('Enrollment required.'),
    );
    await expect(service.getActiveAttempt(input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findActiveAttemptDetail).not.toHaveBeenCalled();
  });

  it('rejects another learner before exposing a lifecycle conflict', async () => {
    const { service, attempt } = setup();
    attempt.learnerId = 'another-learner';
    await expect(service.getActiveAttempt(input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechecks closing after waiting for an answer-save lock', async () => {
    const record = snapshot();
    record.assessment.timeLimitMinutes = null;
    record.assessment.availableUntil = new Date(now.getTime() + 1);
    const upsertAttemptAnswer = jest.fn(
      (
        _data: Parameters<IAttemptRepository['upsertAttemptAnswer']>[0],
        assertAllowed: Parameters<IAttemptRepository['upsertAttemptAnswer']>[1],
      ) => {
        jest.setSystemTime(now.getTime() + 1);
        assertAllowed(
          {
            startedAt: record.startedAt,
            assessment: record.assessment,
          },
          null,
        );
        throw new Error('A late answer must not reach persistence.');
      },
    );
    const repository = {
      findSaveAnswerContext: jest.fn().mockResolvedValue({
        ...record,
        question: { ...record.questions[0], assessmentId: 'assessment' },
      }),
      upsertAttemptAnswer,
    };
    const service = new LearnerAssessmentsService(
      repository as unknown as IAttemptRepository,
      {
        ensureLearnerCanAccessAssessment: jest.fn(),
      } as unknown as AssessmentAccessService,
      {} as AttemptFinalizationService,
    );
    await expect(
      service.saveAttemptAnswer({
        ...input,
        questionId: 'question',
        dto: { answer: 'Yes', expectedSavedAt: null },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(upsertAttemptAnswer).toHaveBeenCalledTimes(1);
  });
});
