jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../generated/prisma/enums')>(
      '../../../generated/prisma/enums',
    ),
  { virtual: true },
);
jest.mock('generated/prisma/client', () => ({ Prisma: {} }), { virtual: true });
jest.mock(
  'src/core/database/prisma.service',
  () => ({ PrismaService: class {} }),
  { virtual: true },
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ValidationPipe,
  type ArgumentsHost,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { SaveAttemptAnswerDto } from './dtos/attempts/save-attempt-answer.dto';
import type {
  IAttemptRepository,
  SaveAnswerAttemptContextRecord,
} from './interfaces/attempt.repository.interface';
import { AttemptRepository } from './repositories/attempt.repository';
import type { AssessmentAccessService } from './services/assessment-access.service';
import type { AttemptFinalizationService } from './services/attempt-finalization.service';
import { LearnerAssessmentsService } from './services/learner-assessments.service';

const now = new Date('2026-11-14T10:00:00.000Z');
const version = new Date(now.getTime() - 1000);
const input = {
  courseId: 'course',
  assessmentId: 'assessment',
  attemptId: 'attempt',
  learnerId: 'learner',
  questionId: 'question',
};

describe('Answer save version validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: SaveAttemptAnswerDto });

  it.each([null, version.toISOString()])(
    'accepts expectedSavedAt %p',
    async (expectedSavedAt) => {
      await expect(
        validate({ answer: 'Yes', expectedSavedAt }),
      ).resolves.toBeInstanceOf(SaveAttemptAnswerDto);
    },
  );

  it.each([
    undefined,
    '',
    1,
    false,
    {},
    'not-a-date',
    '2026-02-30T10:00:00.000Z',
    '2026-11-14',
    '2026-11-14T10:00:00Z',
  ])(
    'rejects missing or invalid expectedSavedAt %p',
    async (expectedSavedAt) => {
      await expect(
        validate({ answer: 'Yes', expectedSavedAt }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(['', '   ', null])(
    'rejects clearing with answer %p',
    async (answer) => {
      await expect(
        validate({ answer, expectedSavedAt: version.toISOString() }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe('Answer save concurrency policy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());

  function setup(currentSavedAt: Date | null = version) {
    const context: SaveAnswerAttemptContextRecord = {
      id: 'attempt',
      learnerId: 'learner',
      assessmentId: 'assessment',
      status: 'IN_PROGRESS',
      startedAt: now,
      assessment: {
        id: 'assessment',
        courseId: 'course',
        type: 'QUIZ',
        status: 'PUBLISHED',
        isActive: true,
        deletedAt: null,
        availableFrom: null,
        availableUntil: null,
        timeLimitMinutes: null,
      },
      question: {
        id: 'question',
        assessmentId: 'assessment',
        type: 'FILL_IN_THE_BLANK',
        isActive: true,
        deletedAt: null,
      },
    };
    const persisted = jest.fn();
    const upsertAttemptAnswer = jest.fn<
      ReturnType<IAttemptRepository['upsertAttemptAnswer']>,
      Parameters<IAttemptRepository['upsertAttemptAnswer']>
    >((data, assertAllowed) =>
      Promise.resolve().then(() => {
        assertAllowed(context, currentSavedAt);
        persisted(data);
        return { ...data, createdAt: version, updatedAt: now };
      }),
    );
    const repository = {
      findSaveAnswerContext: jest.fn().mockResolvedValue(context),
      upsertAttemptAnswer,
    };
    const service = new LearnerAssessmentsService(
      repository as unknown as IAttemptRepository,
      {
        ensureLearnerCanAccessAssessment: jest.fn(),
      } as unknown as AssessmentAccessService,
      {} as AttemptFinalizationService,
    );
    return { service, repository, context, persisted };
  }

  it.each([null, version])(
    'accepts an exact version match %p',
    async (currentSavedAt) => {
      const { service, persisted } = setup(currentSavedAt);
      const result = await service.saveAttemptAnswer({
        ...input,
        dto: {
          answer: ' Yes ',
          expectedSavedAt: currentSavedAt?.toISOString() ?? null,
        },
      });
      expect(result.savedAt).toEqual(now);
      expect(persisted).toHaveBeenCalledWith({
        attemptId: 'attempt',
        questionId: 'question',
        textAnswer: 'Yes',
      });
    },
  );

  it.each<[Date | null, string | null]>([
    [version, null],
    [null, version.toISOString()],
    [version, new Date(version.getTime() - 1).toISOString()],
    [version, new Date(version.getTime() + 1).toISOString()],
  ])(
    'rejects a mismatched version without persistence: current %p, expected %p',
    async (currentSavedAt, expectedSavedAt) => {
      const { service, persisted } = setup(currentSavedAt);
      await expect(
        service.saveAttemptAnswer({
          ...input,
          dto: { answer: 'Yes', expectedSavedAt },
        }),
      ).rejects.toMatchObject({
        response: { error: 'ANSWER_VERSION_CONFLICT' },
      });
      expect(persisted).not.toHaveBeenCalled();
    },
  );

  it('preserves the stable conflict reason in the HTTP error envelope', async () => {
    const { service } = setup();
    const error: unknown = await service
      .saveAttemptAnswer({
        ...input,
        dto: { answer: 'Yes', expectedSavedAt: null },
      })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ConflictException);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const path = '/attempts/attempt/answers/question';
    new HttpExceptionFilter().catch(error, {
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: path }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        error: 'ANSWER_VERSION_CONFLICT',
        path,
      }),
    );
  });

  it.each(['timer', 'closing'])(
    'rejects a %s-expired save even with a matching version',
    async (cause) => {
      const { service, context, persisted } = setup();
      if (cause === 'timer') {
        context.assessment.timeLimitMinutes = 1;
        context.startedAt = new Date(now.getTime() - 60_000);
      } else context.assessment.availableUntil = now;
      await expect(
        service.saveAttemptAnswer({
          ...input,
          dto: { answer: 'Yes', expectedSavedAt: version.toISOString() },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(persisted).not.toHaveBeenCalled();
    },
  );

  it('rejects clearing before entering the save transaction', async () => {
    const { service, repository } = setup();
    await expect(
      service.saveAttemptAnswer({
        ...input,
        dto: { answer: '  ', expectedSavedAt: version.toISOString() },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.upsertAttemptAnswer).not.toHaveBeenCalled();
  });
});

describe('Answer timestamp persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());

  it.each([null, now, new Date(now.getTime() + 1000)])(
    'advances versions monotonically from %p inside the attempt lock',
    async (currentSavedAt) => {
      const events: string[] = [];
      const context = {
        startedAt: now,
        assessment: { timeLimitMinutes: null },
      };
      const tx = {
        $queryRaw: jest.fn().mockImplementation(() => {
          events.push('lock');
          return Promise.resolve([{ id: 'attempt' }]);
        }),
        assessmentAttempt: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(context),
        },
        assessmentAttemptAnswer: {
          findUnique: jest.fn().mockImplementation(() => {
            events.push('read-version');
            return Promise.resolve(
              currentSavedAt ? { updatedAt: currentSavedAt } : null,
            );
          }),
          upsert: jest.fn(
            (_data: {
              create: { updatedAt: Date };
              update: { updatedAt: Date };
            }) => {
              events.push('write');
              return Promise.resolve(null);
            },
          ),
        },
      };
      const repository = new AttemptRepository({
        $transaction: (run: (transaction: typeof tx) => Promise<unknown>) =>
          run(tx),
      } as unknown as ConstructorParameters<typeof AttemptRepository>[0]);
      await repository.upsertAttemptAnswer(
        { attemptId: 'attempt', questionId: 'question', textAnswer: 'Yes' },
        (writeContext, actualSavedAt) => {
          events.push('check');
          expect(writeContext).toEqual(context);
          expect(actualSavedAt).toEqual(currentSavedAt);
        },
      );
      expect(events).toEqual(['lock', 'read-version', 'check', 'write']);
      const savedAt = new Date(
        currentSavedAt
          ? Math.max(now.getTime(), currentSavedAt.getTime() + 1)
          : now.getTime(),
      );
      const write = tx.assessmentAttemptAnswer.upsert.mock.calls[0][0];
      expect(write.create.updatedAt).toEqual(savedAt);
      expect(write.update.updatedAt).toEqual(savedAt);
    },
  );

  it('performs no write when the service rejects the locked version', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'attempt' }]),
      assessmentAttempt: { findUniqueOrThrow: jest.fn().mockResolvedValue({}) },
      assessmentAttemptAnswer: {
        findUnique: jest.fn().mockResolvedValue({ updatedAt: now }),
        upsert: jest.fn(),
      },
    };
    const repository = new AttemptRepository({
      $transaction: (run: (transaction: typeof tx) => Promise<unknown>) =>
        run(tx),
    } as unknown as ConstructorParameters<typeof AttemptRepository>[0]);
    await expect(
      repository.upsertAttemptAnswer(
        { attemptId: 'attempt', questionId: 'question', textAnswer: 'Yes' },
        () => {
          throw new ConflictException();
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.assessmentAttemptAnswer.upsert).not.toHaveBeenCalled();
  });
});
