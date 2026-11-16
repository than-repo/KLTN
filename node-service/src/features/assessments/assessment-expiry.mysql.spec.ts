// Opt-in: use a dedicated disposable database, never the application database.
jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: { TransactionIsolationLevel: { ReadCommitted: 'ReadCommitted' } },
  }),
  { virtual: true },
);
jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../generated/prisma/enums')>(
      '../../../generated/prisma/enums',
    ),
  { virtual: true },
);
jest.mock(
  'src/core/database/prisma.service',
  () => ({ PrismaService: class {} }),
  { virtual: true },
);

import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { PrismaClient } from 'generated/prisma/client';
import type { AttemptWriteContext } from './interfaces/attempt.repository.interface';
import { AttemptRepository } from './repositories/attempt.repository';
import { AttemptFinalizationService } from './services/attempt-finalization.service';
import { QuizGradingService } from './services/quiz-grading.service';
import { LearnerAssessmentsService } from './services/learner-assessments.service';
import type { AssessmentAccessService } from './services/assessment-access.service';
import { isAttemptExpired } from './utils/attempt-timing';

const testUrl = process.env.ASSESSMENT_EXPIRY_TEST_DATABASE_URL;
const mysqlTests = testUrl ? describe : describe.skip;
jest.setTimeout(30_000);

mysqlTests(
  'Assessment expiry MySQL transactions',
  () => {
    let prisma: PrismaClient;
    let repository: AttemptRepository;
    let finalization: AttemptFinalizationService;
    let courseId: string;
    let learnerId: string;
    let assessmentId: string;
    let questionId: string;
    let attemptId: string;
    let answerId: string;
    let startedAt: Date;

    const assertOpen = (context: AttemptWriteContext): void => {
      if (
        isAttemptExpired({
          startedAt: context.startedAt,
          timeLimitMinutes: context.assessment.timeLimitMinutes,
          availableUntil: context.assessment.availableUntil,
          now: new Date(),
        })
      ) {
        throw new ForbiddenException('Attempt has expired.');
      }
    };

    function learnerService(): LearnerAssessmentsService {
      return new LearnerAssessmentsService(
        repository,
        {
          ensureLearnerCanAccessAssessment: jest.fn(),
        } as unknown as AssessmentAccessService,
        finalization,
      );
    }

    function saveAnswer(answer: string, expectedSavedAt: string | null) {
      return learnerService().saveAttemptAnswer({
        courseId,
        assessmentId,
        attemptId,
        learnerId,
        questionId,
        dto: { answer, expectedSavedAt },
      });
    }

    beforeAll(async () => {
      // Build first: use the generated client's compiled .js imports with Jest.
      const { PrismaClient: DatabaseClient } = jest.requireActual<
        typeof import('../../../generated/prisma/client')
      >('../../../dist/generated/prisma/client.js');
      const url = new URL(testUrl!);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        !/_(shadow|test)$/.test(url.pathname)
      ) {
        throw new Error(
          'Expiry integration tests require a local disposable *_shadow or *_test database.',
        );
      }
      prisma = new DatabaseClient({
        adapter: new PrismaMariaDb({
          host: url.hostname,
          port: Number(url.port || 3306),
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.slice(1),
          connectionLimit: 5,
          allowPublicKeyRetrieval: true,
          connectTimeout: 5000,
        }),
      });
      await prisma.$connect();
      repository = new AttemptRepository(
        prisma as unknown as ConstructorParameters<typeof AttemptRepository>[0],
      );
      finalization = new AttemptFinalizationService(
        repository,
        new QuizGradingService(),
      );
    });

    beforeEach(async () => {
      learnerId = randomUUID();
      courseId = randomUUID();
      await prisma.user.create({
        data: {
          id: learnerId,
          fullName: 'Expiry integration fixture',
          email: `expiry-${learnerId}@example.invalid`,
        },
      });
      await prisma.course.create({
        data: {
          id: courseId,
          title: 'Expiry integration fixture',
          slug: `expiry-${courseId}`,
          shortDescription: 'Disposable test fixture',
          level: 'BEGINNER',
          status: 'PUBLISHED',
        },
      });
      const assessment = await prisma.assessment.create({
        data: {
          courseId,
          title: 'Expiry integration quiz',
          type: 'QUIZ',
          status: 'PUBLISHED',
          timeLimitMinutes: 1,
          passingScore: 70,
          totalPoints: 10,
          maxAttempts: 1,
          questions: {
            create: {
              questionText: 'Correct?',
              type: 'MULTIPLE_CHOICE',
              points: 10,
              answers: {
                create: { correctOptionAnswer: 'Yes', wrongAnswers: ['No'] },
              },
            },
          },
        },
        include: { questions: true },
      });
      assessmentId = assessment.id;
      questionId = assessment.questions[0].id;
      startedAt = new Date(Date.now() - 61_000);
      const attempt = await prisma.assessmentAttempt.create({
        data: { assessmentId, learnerId, attemptNumber: 1, startedAt },
      });
      attemptId = attempt.id;
      answerId = (
        await prisma.assessmentAttemptAnswer.create({
          data: { attemptId, questionId, textAnswer: 'Yes' },
        })
      ).id;
    });

    afterEach(async () => {
      if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
      if (learnerId) await prisma.user.deleteMany({ where: { id: learnerId } });
    });
    afterAll(async () => {
      if (prisma) await prisma.$disconnect();
    });

    it('finds timed expired attempts and grades after parent participation is disabled', async () => {
      expect(
        await repository.findExpiredAttemptIds(new Date(), null, 100),
      ).toContainEqual({ id: attemptId });
      await prisma.course.update({
        where: { id: courseId },
        data: { isActive: false },
      });
      await finalization.finalizeExpired(attemptId);
      const result = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      expect(result).toEqual(
        expect.objectContaining({
          status: 'PASSED',
          score: 10,
          maxScore: 10,
          passed: true,
        }),
      );
      expect(result.submittedAt?.getTime()).toBe(startedAt.getTime() + 60_000);
      expect(
        (
          await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
            where: { id: answerId },
          })
        ).isCorrect,
      ).toBe(true);
    });

    it('allows only one of two concurrent finalizers to commit', async () => {
      const results = await Promise.all([
        finalization.finalizeExpired(attemptId),
        finalization.finalizeExpired(attemptId),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).score,
      ).toBe(10);
    });

    it.each([
      { cause: 'timer', order: 'save-first' },
      { cause: 'timer', order: 'finalize-first' },
      { cause: 'closing', order: 'save-first' },
      { cause: 'closing', order: 'finalize-first' },
    ])(
      'never grades a late answer during $cause expiry with $order concurrency',
      async ({ cause, order }) => {
        if (cause === 'closing') {
          await prisma.assessment.update({
            where: { id: assessmentId },
            data: {
              timeLimitMinutes: null,
              availableUntil: new Date(Date.now() - 1000),
            },
          });
        }
        const save = () =>
          repository.upsertAttemptAnswer(
            { attemptId, questionId, textAnswer: 'No' },
            assertOpen,
          );
        const finalize = () => finalization.finalizeExpired(attemptId);
        const operations =
          order === 'save-first' ? [save(), finalize()] : [finalize(), save()];
        await Promise.allSettled(operations);
        const answer = await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
          where: { id: answerId },
        });
        const result = await prisma.assessmentAttempt.findUniqueOrThrow({
          where: { id: attemptId },
        });
        expect(answer.textAnswer).toBe('Yes');
        expect(answer.isCorrect).toBe(true);
        expect(result.status).toBe('PASSED');
        expect(result.score).toBe(10);
      },
    );

    it.each(['QUIZ', 'PROJECT'] as const)(
      'discovers and finalizes a closed untimed %s',
      async (type) => {
        const closing = new Date(Date.now() - 1000);
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: { type, timeLimitMinutes: null, availableUntil: closing },
        });
        expect(
          await repository.findExpiredAttemptIds(new Date(), null, 100),
        ).toContainEqual({ id: attemptId });
        const result = await finalization.finalizeExpired(attemptId);
        expect(result?.attempt).toEqual(
          expect.objectContaining({
            status: type === 'QUIZ' ? 'PASSED' : 'FAILED',
            score: type === 'QUIZ' ? 10 : 0,
            submittedAt: closing,
          }),
        );
        expect(
          await repository.findExpiredAttemptIds(new Date(), null, 100),
        ).not.toContainEqual({ id: attemptId });
      },
    );

    it('records closing as submittedAt when it precedes an expired timer', async () => {
      const closing = new Date(startedAt.getTime() + 30_000);
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { availableUntil: closing },
      });
      expect(
        (await finalization.finalizeExpired(attemptId))?.attempt.submittedAt,
      ).toEqual(closing);
    });

    it('rechecks a postponed closing after candidate discovery', async () => {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          timeLimitMinutes: null,
          availableUntil: new Date(Date.now() - 1000),
        },
      });
      expect(
        await repository.findExpiredAttemptIds(new Date(), null, 100),
      ).toContainEqual({ id: attemptId });
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { availableUntil: new Date(Date.now() + 60_000) },
      });
      expect(await finalization.finalizeExpired(attemptId)).toBeNull();
      expect(
        await repository.findExpiredAttemptIds(new Date(), null, 100),
      ).not.toContainEqual({ id: attemptId });
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).status,
      ).toBe('IN_PROGRESS');
    });

    it('rolls back earlier answer updates if a later grading write fails', async () => {
      await expect(
        repository.finalizeAttemptTransaction(attemptId, () => ({
          status: 'PASSED',
          score: 10,
          maxScore: 10,
          passed: true,
          submittedAt: new Date(),
          gradedAnswers: [
            { attemptAnswerId: answerId, isCorrect: true, pointsEarned: 10 },
            {
              attemptAnswerId: randomUUID(),
              isCorrect: true,
              pointsEarned: 10,
            },
          ],
        })),
      ).rejects.toThrow();
      expect(
        (
          await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
            where: { id: answerId },
          })
        ).isCorrect,
      ).toBeNull();
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).status,
      ).toBe('IN_PROGRESS');
    });

    it('grades the latest saved answer under the lock for a manual submission', async () => {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { startedAt: new Date() },
      });
      await repository.upsertAttemptAnswer(
        { attemptId, questionId, textAnswer: 'No' },
        assertOpen,
      );
      const result = await finalization.submitQuiz({
        attemptId,
        learnerId,
        courseId,
        assessmentId,
      });
      expect(result?.attempt.score).toBe(0);
      expect(result?.attempt.status).toBe('FAILED');
      expect(await finalization.finalizeExpired(attemptId)).toBeNull();
    });

    it.each(['existing-answer', 'first-save'])(
      'accepts exactly one concurrent save for the same version: %s',
      async (scenario) => {
        await prisma.assessmentAttempt.update({
          where: { id: attemptId },
          data: { startedAt: new Date() },
        });
        const current = await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
          where: { id: answerId },
        });
        let expectedSavedAt: string | null = current.updatedAt.toISOString();
        if (scenario === 'first-save') {
          await prisma.assessmentAttemptAnswer.delete({
            where: { id: answerId },
          });
          expectedSavedAt = null;
        }
        const answers = ['Yes', 'No'];
        const results = await Promise.allSettled(
          answers.map((answer) => saveAnswer(answer, expectedSavedAt)),
        );
        expect(
          results.filter((result) => result.status === 'fulfilled'),
        ).toHaveLength(1);
        const failed = results.find((result) => result.status === 'rejected');
        if (!failed || failed.status !== 'rejected')
          throw new Error('Expected a stale save conflict.');
        expect(failed.reason as unknown).toBeInstanceOf(ConflictException);
        expect(failed.reason as unknown).toMatchObject({
          response: { error: 'ANSWER_VERSION_CONFLICT' },
        });
        const winnerIndex = results.findIndex(
          (result) => result.status === 'fulfilled',
        );
        const winner = results[winnerIndex];
        if (winner.status !== 'fulfilled')
          throw new Error('Expected a successful save.');
        const stored = await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
          where: { attemptId_questionId: { attemptId, questionId } },
        });
        expect(stored.textAnswer).toBe(answers[winnerIndex]);
        expect(stored.updatedAt).toEqual(winner.value.savedAt);
        expect(
          await prisma.assessmentAttemptAnswer.count({
            where: { attemptId, questionId },
          }),
        ).toBe(1);
      },
    );

    it('rejects a delayed stale overwrite and accepts the returned server version', async () => {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { startedAt: new Date() },
      });
      const current = await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
        where: { id: answerId },
      });
      const saved = await saveAnswer('No', current.updatedAt.toISOString());
      expect(saved.savedAt.getTime()).toBeGreaterThan(
        current.updatedAt.getTime(),
      );
      await expect(
        saveAnswer('Yes', current.updatedAt.toISOString()),
      ).rejects.toBeInstanceOf(ConflictException);
      const stored = await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
        where: { id: answerId },
      });
      expect(stored.textAnswer).toBe('No');
      expect(stored.updatedAt).toEqual(saved.savedAt);
      const next = await saveAnswer('Yes', saved.savedAt.toISOString());
      expect(next.savedAt.getTime()).toBeGreaterThan(saved.savedAt.getTime());
    });

    it('advances a version even when the previous timestamp is ahead of the application clock', async () => {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { startedAt: new Date() },
      });
      const futureVersion = new Date(Date.now() + 1000);
      await prisma.assessmentAttemptAnswer.update({
        where: { id: answerId },
        data: { updatedAt: futureVersion },
      });
      const saved = await saveAnswer('No', futureVersion.toISOString());
      expect(saved.savedAt.getTime()).toBe(futureVersion.getTime() + 1);
      expect(
        (
          await prisma.assessmentAttemptAnswer.findUniqueOrThrow({
            where: { id: answerId },
          })
        ).updatedAt,
      ).toEqual(saved.savedAt);
    });

    it('preserves the failure policy for projects and leaves submitted projects untouched', async () => {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { type: 'PROJECT' },
      });
      await finalization.finalizeExpired(attemptId);
      expect(
        await prisma.assessmentAttempt.findUniqueOrThrow({
          where: { id: attemptId },
        }),
      ).toEqual(
        expect.objectContaining({ status: 'FAILED', score: 0, passed: false }),
      );
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: 'SUBMITTED', score: null },
      });
      expect(await finalization.finalizeExpired(attemptId)).toBeNull();
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).status,
      ).toBe('SUBMITTED');
    });
  },
  30_000,
);
