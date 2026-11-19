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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentQuestionType,
  AssessmentStatus,
} from 'generated/prisma/enums';
import type {
  AssessmentAnswer,
  IAssessmentAnswerRepository,
} from '../../../../../src/features/assessments/interfaces/assessment-answers.repository.interface';
import type {
  AssessmentQuestion,
  IAssessmentQuestionRepository,
} from '../../../../../src/features/assessments/interfaces/assessment-questions.repository.interface';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
  AssessmentType,
  type Assessment,
  type IAssessmentRepository,
} from '../../../../../src/features/assessments/interfaces/assessment.repository.interface';
import type { AssessmentAccessService } from '../../../../../src/features/assessments/services/assessment-access.service';
import { AssessmentAnswersService } from '../../../../../src/features/assessments/services/assessment-answers.service';

describe('AssessmentAnswersService', () => {
  let assessmentRepo: jest.Mocked<IAssessmentRepository>;
  let questionRepo: jest.Mocked<IAssessmentQuestionRepository>;
  let answerRepo: jest.Mocked<IAssessmentAnswerRepository>;
  let accessService: jest.Mocked<
    Pick<AssessmentAccessService, 'ensureInstructorCanManageQuestion'>
  >;
  let service: AssessmentAnswersService;

  const instructorId = 'instructor-1';
  const courseId = 'course-1';
  const assessmentId = 'assessment-1';
  const questionId = 'question-1';
  const answerId = 'answer-1';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const baseAssessment: Assessment = {
    id: assessmentId,
    courseId,
    title: 'Quiz',
    description: null,
    type: AssessmentType.QUIZ,
    status: AssessmentStatus.DRAFT,
    order: 1,
    totalPoints: 10,
    passingScore: 70,
    maxAttempts: 2,
    timeLimitMinutes: 30,
    availableFrom: null,
    availableUntil: null,
    assessmentReviewTiming: AssessmentReviewTiming.AFTER_GRADED,
    assessmentReviewContent: AssessmentReviewContent.SCORE_ONLY,
    isActive: true,
    afterLesson: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const baseQuestion: AssessmentQuestion = {
    id: questionId,
    assessmentId,
    questionText: 'Sample question',
    type: AssessmentQuestionType.MULTIPLE_CHOICE,
    explanation: null,
    points: 5,
    order: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const storedAnswer: AssessmentAnswer = {
    id: answerId,
    questionId,
    correctOptionAnswer: 'Option A',
    correctTextAnswer: null,
    wrongAnswers: ['Option B', 'Option C'],
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    assessmentRepo = {
      createDraftAssessment: jest.fn(),
      getNextOrder: jest.fn(),
      findAssessmentById: jest.fn().mockResolvedValue(baseAssessment),
      updateDraftAssessment: jest.fn(),
      updatePublishAssessment: jest.fn(),
      softDeleteAssessment: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      withPublishSession: jest.fn(),
    };

    questionRepo = {
      createQuestionAndSyncTotalPoints: jest.fn(),
      getNextOrder: jest.fn(),
      findQuestionById: jest.fn().mockResolvedValue(baseQuestion),
      findMany: jest.fn(),
      count: jest.fn(),
      updateQuestionAndSyncTotalPoints: jest.fn(),
      softDeleteQuestionAndSyncTotalPoints: jest.fn(),
      countActiveQuestions: jest.fn(),
      sumActiveQuestionPoints: jest.fn(),
      syncAssessmentTotalPointsTx: jest.fn(),
      countSkill: jest.fn(),
    };

    answerRepo = {
      createAnswer: jest.fn(),
      upsertAnswerByQuestionId: jest.fn().mockResolvedValue(storedAnswer),
      findAnswerById: jest.fn(),
      findAnswerByQuestionId: jest.fn().mockResolvedValue(storedAnswer),
      findManyByQuestionIds: jest.fn(),
      updateAnswer: jest.fn(),
      deleteAnswerById: jest.fn(),
      deleteAnswerByQuestionId: jest.fn().mockResolvedValue(true),
    };

    accessService = {
      ensureInstructorCanManageQuestion: jest.fn().mockResolvedValue(undefined),
    };

    service = new AssessmentAnswersService(
      assessmentRepo,
      questionRepo,
      answerRepo,
      accessService as unknown as AssessmentAccessService,
    );
  });

  describe('upsertAnswerByQuestionId', () => {
    it('upserts normalized MULTIPLE_CHOICE answer and returns instructor DTO', async () => {
      const result = await service.upsertAnswerByQuestionId(
        instructorId,
        courseId,
        assessmentId,
        questionId,
        {
          correctOptionAnswer: '  Option A  ',
          wrongAnswers: ['  Option B ', 'Option C'],
        },
      );

      expect(answerRepo.upsertAnswerByQuestionId).toHaveBeenCalledWith(
        questionId,
        {
          correctOptionAnswer: 'Option A',
          correctTextAnswer: null,
          wrongAnswers: ['Option B', 'Option C'],
        },
      );
      expect(result.id).toBe(answerId);
      expect(result.correctOptionAnswer).toBe('Option A');
    });

    it.each([
      [
        'missing correctOptionAnswer',
        { wrongAnswers: ['B'] },
        'correctOptionAnswer is required for MULTIPLE_CHOICE questions',
      ],
      [
        'present correctTextAnswer',
        {
          correctOptionAnswer: 'A',
          correctTextAnswer: 'Text',
          wrongAnswers: ['B'],
        },
        'correctTextAnswer is not allowed for MULTIPLE_CHOICE questions',
      ],
      [
        'empty wrongAnswers',
        { correctOptionAnswer: 'A', wrongAnswers: ['   '] },
        'wrongAnswers is required for MULTIPLE_CHOICE questions',
      ],
      [
        'correctOptionAnswer duplicated in wrongAnswers (case-insensitive)',
        { correctOptionAnswer: 'Option A', wrongAnswers: ['option a', 'B'] },
        'correctOptionAnswer must not be duplicated in wrongAnswers',
      ],
      [
        'duplicate entries inside wrongAnswers (case-insensitive)',
        { correctOptionAnswer: 'A', wrongAnswers: ['Option B', 'option b'] },
        'wrongAnswers must not contain duplicates',
      ],
    ])(
      'rejects invalid MULTIPLE_CHOICE input (%s)',
      async (_label, dto, expectedMessage) => {
        await expect(
          service.upsertAnswerByQuestionId(
            instructorId,
            courseId,
            assessmentId,
            questionId,
            dto,
          ),
        ).rejects.toThrow(new BadRequestException(expectedMessage));
        expect(answerRepo.upsertAnswerByQuestionId).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['TRUE', 'true', ['false']],
      [' false ', 'false', ['true']],
    ])(
      'normalizes TRUE_FALSE answer %p to %p with opposite wrongAnswers',
      async (raw, expectedCorrect, expectedWrong) => {
        questionRepo.findQuestionById.mockResolvedValue({
          ...baseQuestion,
          type: AssessmentQuestionType.TRUE_FALSE,
        });

        await service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { correctOptionAnswer: raw },
        );

        expect(answerRepo.upsertAnswerByQuestionId).toHaveBeenCalledWith(
          questionId,
          {
            correctOptionAnswer: expectedCorrect,
            correctTextAnswer: null,
            wrongAnswers: expectedWrong,
          },
        );
      },
    );

    it.each([
      [
        'missing correctOptionAnswer',
        {},
        'correctOptionAnswer is required for TRUE_FALSE questions',
      ],
      [
        'non-boolean value',
        { correctOptionAnswer: 'yes' },
        'correctOptionAnswer for TRUE_FALSE questions must be "true" or "false"',
      ],
      [
        'present correctTextAnswer',
        { correctOptionAnswer: 'true', correctTextAnswer: 'true' },
        'correctTextAnswer is not allowed for TRUE_FALSE questions',
      ],
      [
        'provided wrongAnswers',
        { correctOptionAnswer: 'true', wrongAnswers: ['false'] },
        'wrongAnswers should not be provided for TRUE_FALSE questions',
      ],
    ])(
      'rejects invalid TRUE_FALSE input (%s)',
      async (_label, dto, expectedMessage) => {
        questionRepo.findQuestionById.mockResolvedValue({
          ...baseQuestion,
          type: AssessmentQuestionType.TRUE_FALSE,
        });

        await expect(
          service.upsertAnswerByQuestionId(
            instructorId,
            courseId,
            assessmentId,
            questionId,
            dto,
          ),
        ).rejects.toThrow(new BadRequestException(expectedMessage));
      },
    );

    it('upserts normalized FILL_IN_THE_BLANK answer', async () => {
      questionRepo.findQuestionById.mockResolvedValue({
        ...baseQuestion,
        type: AssessmentQuestionType.FILL_IN_THE_BLANK,
      });

      await service.upsertAnswerByQuestionId(
        instructorId,
        courseId,
        assessmentId,
        questionId,
        { correctTextAnswer: '  JavaScript  ' },
      );

      expect(answerRepo.upsertAnswerByQuestionId).toHaveBeenCalledWith(
        questionId,
        {
          correctOptionAnswer: null,
          correctTextAnswer: 'JavaScript',
          wrongAnswers: null,
        },
      );
    });

    it.each([
      [
        'missing correctTextAnswer',
        {},
        'correctTextAnswer is required for FILL_IN_THE_BLANK questions',
      ],
      [
        'present correctOptionAnswer',
        { correctTextAnswer: 'JS', correctOptionAnswer: 'JS' },
        'correctOptionAnswer is not allowed for FILL_IN_THE_BLANK questions',
      ],
      [
        'present wrongAnswers',
        { correctTextAnswer: 'JS', wrongAnswers: ['TS'] },
        'wrongAnswers is not allowed for FILL_IN_THE_BLANK questions',
      ],
    ])(
      'rejects invalid FILL_IN_THE_BLANK input (%s)',
      async (_label, dto, expectedMessage) => {
        questionRepo.findQuestionById.mockResolvedValue({
          ...baseQuestion,
          type: AssessmentQuestionType.FILL_IN_THE_BLANK,
        });

        await expect(
          service.upsertAnswerByQuestionId(
            instructorId,
            courseId,
            assessmentId,
            questionId,
            dto,
          ),
        ).rejects.toThrow(new BadRequestException(expectedMessage));
      },
    );

    it('rejects PROJECT questions', async () => {
      questionRepo.findQuestionById.mockResolvedValue({
        ...baseQuestion,
        type: AssessmentQuestionType.PROJECT,
      });

      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { correctTextAnswer: 'Repo URL' },
        ),
      ).rejects.toThrow(
        new BadRequestException('PROJECT questions do not allow answer keys'),
      );
    });

    it('throws BadRequestException when assessment is not DRAFT', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });

      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { correctOptionAnswer: 'A', wrongAnswers: ['B'] },
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Answers can only be changed while assessment is in DRAFT status',
        ),
      );
    });

    it('enforces access and parent hierarchy checks', async () => {
      accessService.ensureInstructorCanManageQuestion.mockRejectedValueOnce(
        new ForbiddenException('Access denied'),
      );
      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      questionRepo.findQuestionById.mockResolvedValueOnce(null);
      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(new NotFoundException('Question not found'));

      questionRepo.findQuestionById.mockResolvedValueOnce({
        ...baseQuestion,
        assessmentId: 'other-assessment',
      });
      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(
        new NotFoundException('Question not found in assessment'),
      );

      assessmentRepo.findAssessmentById.mockResolvedValueOnce(null);
      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));

      assessmentRepo.findAssessmentById.mockResolvedValueOnce({
        ...baseAssessment,
        courseId: 'other-course',
      });
      await expect(
        service.upsertAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(
        new NotFoundException('Assessment not found in course'),
      );
    });
  });

  describe('getAnswerByQuestionId', () => {
    it('returns the answer DTO when found (even if assessment is PUBLISHED)', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });

      const result = await service.getAnswerByQuestionId(
        instructorId,
        courseId,
        assessmentId,
        questionId,
      );

      expect(result.id).toBe(answerId);
      expect(result.questionId).toBe(questionId);
    });

    it('throws NotFoundException when answer does not exist', async () => {
      answerRepo.findAnswerByQuestionId.mockResolvedValue(null);

      await expect(
        service.getAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toThrow(new NotFoundException('Answer not found'));
    });
  });

  describe('deleteAnswerByQuestionId', () => {
    it('deletes the answer when assessment is DRAFT', async () => {
      await expect(
        service.deleteAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).resolves.toEqual({ deleted: true });
      expect(answerRepo.deleteAnswerByQuestionId).toHaveBeenCalledWith(
        questionId,
      );
    });

    it('throws BadRequestException when assessment is not DRAFT', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });

      await expect(
        service.deleteAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(answerRepo.deleteAnswerByQuestionId).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when answer was not found to delete', async () => {
      answerRepo.deleteAnswerByQuestionId.mockResolvedValue(false);

      await expect(
        service.deleteAnswerByQuestionId(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toThrow(new NotFoundException('Answer not found'));
    });
  });
});
