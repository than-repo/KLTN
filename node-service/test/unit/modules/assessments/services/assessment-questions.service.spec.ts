jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

jest.mock(
  'src/features/skill/repositories/skill.repository',
  () => ({ SkillRepository: class SkillRepository {} }),
  { virtual: true },
);

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Difficulty } from 'generated/prisma/enums';
import {
  AssessmentQuestionType,
  type AssessmentQuestion,
  type IAssessmentQuestionRepository,
  type Skill,
} from '../../../../../src/features/assessments/interfaces/assessment-questions.repository.interface';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
  AssessmentStatus,
  AssessmentType,
  type Assessment,
  type IAssessmentRepository,
} from '../../../../../src/features/assessments/interfaces/assessment.repository.interface';
import type { AssessmentAccessService } from '../../../../../src/features/assessments/services/assessment-access.service';
import { AssessmentQuestionsService } from '../../../../../src/features/assessments/services/assessment-questions.service';
import type { SkillRepository } from 'src/features/skill/repositories/skill.repository';

describe('AssessmentQuestionsService', () => {
  let assessmentRepo: jest.Mocked<IAssessmentRepository>;
  let questionRepo: jest.Mocked<IAssessmentQuestionRepository>;
  let accessService: jest.Mocked<
    Pick<
      AssessmentAccessService,
      | 'ensureInstructorCanManageAssessment'
      | 'ensureInstructorCanManageQuestion'
    >
  >;
  let skillRepo: jest.Mocked<Pick<SkillRepository, 'getSkillsByCourseId'>>;
  let service: AssessmentQuestionsService;

  const instructorId = 'instructor-1';
  const courseId = 'course-1';
  const assessmentId = 'assessment-1';
  const questionId = 'question-1';
  const skillId = 'cmv6st8y0000fk4voncpprhsd';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const validSkill: Skill = {
    id: skillId,
    courseId,
    canonicalName: 'TypeScript',
    description: 'Static typing',
    aliases: ['TS'],
    embedding: [0.1, 0.2],
    parentId: null,
    level: 0,
    difficulty: Difficulty.EASY,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const baseAssessment: Assessment = {
    id: assessmentId,
    courseId,
    title: 'TS Quiz',
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
    questionText: 'What is unknown in TypeScript?',
    type: AssessmentQuestionType.MULTIPLE_CHOICE,
    explanation: 'Top type',
    points: 5,
    order: 0,
    skills: [validSkill],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
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
      createQuestionAndSyncTotalPoints: jest
        .fn()
        .mockResolvedValue(baseQuestion),
      getNextOrder: jest.fn().mockResolvedValue(0),
      findQuestionById: jest.fn().mockResolvedValue(baseQuestion),
      findMany: jest.fn().mockResolvedValue([baseQuestion]),
      count: jest.fn(),
      updateQuestionAndSyncTotalPoints: jest
        .fn()
        .mockResolvedValue(baseQuestion),
      softDeleteQuestionAndSyncTotalPoints: jest.fn().mockResolvedValue(true),
      countActiveQuestions: jest.fn().mockResolvedValue(0),
      sumActiveQuestionPoints: jest.fn(),
      syncAssessmentTotalPointsTx: jest.fn(),
      countSkill: jest.fn().mockResolvedValue(1),
    };

    accessService = {
      ensureInstructorCanManageAssessment: jest
        .fn()
        .mockResolvedValue(undefined),
      ensureInstructorCanManageQuestion: jest.fn().mockResolvedValue(undefined),
    };

    skillRepo = {
      getSkillsByCourseId: jest.fn().mockResolvedValue([validSkill]),
    };

    service = new AssessmentQuestionsService(
      assessmentRepo,
      questionRepo,
      accessService as unknown as AssessmentAccessService,
      skillRepo as unknown as SkillRepository,
    );
  });

  describe('createQuestion', () => {
    it('creates a QUIZ question with default points=1, next order, and instructor DTO serialization', async () => {
      questionRepo.getNextOrder.mockResolvedValue(3);

      const result = await service.createQuestion(
        instructorId,
        courseId,
        assessmentId,
        {
          questionText: 'What is unknown in TypeScript?',
          type: AssessmentQuestionType.MULTIPLE_CHOICE,
          skillIds: [skillId],
        },
      );

      expect(
        accessService.ensureInstructorCanManageAssessment,
      ).toHaveBeenCalledWith(instructorId, courseId, assessmentId);
      expect(
        questionRepo.createQuestionAndSyncTotalPoints,
      ).toHaveBeenCalledWith({
        assessmentId,
        questionText: 'What is unknown in TypeScript?',
        type: AssessmentQuestionType.MULTIPLE_CHOICE,
        explanation: null,
        points: 1,
        order: 3,
        isActive: true,
        skillIds: [skillId],
      });
      expect(result.id).toBe(questionId);
      expect(result.skills?.[0].id).toBe(skillId);
      expect(result.skills?.[0]).not.toHaveProperty('embedding');
      expect(result.skills?.[0]).not.toHaveProperty('courseId');
    });

    it('creates a PROJECT question when assessment is PROJECT and has 0 active questions', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        type: AssessmentType.PROJECT,
      });
      questionRepo.countActiveQuestions.mockResolvedValue(0);

      await service.createQuestion(instructorId, courseId, assessmentId, {
        questionText: 'Build a REST API',
        type: AssessmentQuestionType.PROJECT,
        points: 100,
        explanation: 'Include unit tests',
        skillIds: [skillId],
      });

      expect(questionRepo.countActiveQuestions).toHaveBeenCalledWith(
        assessmentId,
      );
      expect(
        questionRepo.createQuestionAndSyncTotalPoints,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AssessmentQuestionType.PROJECT,
          points: 100,
          explanation: 'Include unit tests',
        }),
      );
    });

    it('rejects skillIds not belonging to the course before creating', async () => {
      await expect(
        service.createQuestion(instructorId, courseId, assessmentId, {
          questionText: 'Question',
          type: AssessmentQuestionType.TRUE_FALSE,
          skillIds: ['foreign-skill-id'],
        }),
      ).rejects.toThrow(new BadRequestException('Invalid skill ids'));
      expect(
        questionRepo.createQuestionAndSyncTotalPoints,
      ).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when assessment does not exist', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue(null);

      await expect(
        service.createQuestion(instructorId, courseId, assessmentId, {
          questionText: 'Question',
          type: AssessmentQuestionType.TRUE_FALSE,
          skillIds: [skillId],
        }),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));
    });

    it('throws BadRequestException when assessment is not DRAFT', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });

      await expect(
        service.createQuestion(instructorId, courseId, assessmentId, {
          questionText: 'Question',
          type: AssessmentQuestionType.TRUE_FALSE,
          skillIds: [skillId],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Questions can only be changed while assessment is in DRAFT status',
        ),
      );
    });

    it('rejects PROJECT question type inside a QUIZ assessment', async () => {
      await expect(
        service.createQuestion(instructorId, courseId, assessmentId, {
          questionText: 'Project prompt',
          type: AssessmentQuestionType.PROJECT,
          skillIds: [skillId],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'QUIZ assessment only allows MULTIPLE_CHOICE, TRUE_FALSE, or FILL_IN_THE_BLANK questions',
        ),
      );
    });

    it.each([
      AssessmentQuestionType.MULTIPLE_CHOICE,
      AssessmentQuestionType.TRUE_FALSE,
      AssessmentQuestionType.FILL_IN_THE_BLANK,
    ])('rejects %s question type inside a PROJECT assessment', async (type) => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        type: AssessmentType.PROJECT,
      });

      await expect(
        service.createQuestion(instructorId, courseId, assessmentId, {
          questionText: 'Quiz question',
          type,
          skillIds: [skillId],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'PROJECT assessment only allows PROJECT question type',
        ),
      );
    });

    it('rejects adding a second active question to a PROJECT assessment', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        type: AssessmentType.PROJECT,
      });
      questionRepo.countActiveQuestions.mockResolvedValue(1);

      await expect(
        service.createQuestion(instructorId, courseId, assessmentId, {
          questionText: 'Second project task',
          type: AssessmentQuestionType.PROJECT,
          skillIds: [skillId],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'PROJECT assessment can only have one project question',
        ),
      );
    });
  });

  describe('updateQuestion', () => {
    it('updates question fields and passes skillIds when provided', async () => {
      const result = await service.updateQuestion(
        instructorId,
        courseId,
        assessmentId,
        questionId,
        {
          questionText: 'Updated question',
          explanation: 'Updated explanation',
          points: 10,
          skillIds: [skillId],
        },
      );

      expect(
        accessService.ensureInstructorCanManageQuestion,
      ).toHaveBeenCalledWith(instructorId, courseId, assessmentId, questionId);
      expect(
        questionRepo.updateQuestionAndSyncTotalPoints,
      ).toHaveBeenCalledWith(questionId, assessmentId, {
        questionText: 'Updated question',
        explanation: 'Updated explanation',
        points: 10,
        skillIds: [skillId],
      });
      expect(result.id).toBe(questionId);
    });

    it('passes undefined skillIds when omitted or null', async () => {
      await service.updateQuestion(
        instructorId,
        courseId,
        assessmentId,
        questionId,
        { points: 8 },
      );

      expect(
        questionRepo.updateQuestionAndSyncTotalPoints,
      ).toHaveBeenCalledWith(
        questionId,
        assessmentId,
        expect.objectContaining({ skillIds: undefined }),
      );
    });

    it('rejects invalid skillIds', async () => {
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { skillIds: ['bad-skill'] },
        ),
      ).rejects.toThrow(new BadRequestException('Invalid skill ids'));
    });

    it('throws NotFoundException when question or assessment is missing or update returns null', async () => {
      questionRepo.findQuestionById.mockResolvedValueOnce(null);
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(new NotFoundException('Question not found'));

      assessmentRepo.findAssessmentById.mockResolvedValueOnce(null);
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));

      questionRepo.updateQuestionAndSyncTotalPoints.mockResolvedValueOnce(null);
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          {},
        ),
      ).rejects.toThrow(new NotFoundException('Question not found'));
    });

    it('rejects changing question type after creation', async () => {
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { type: AssessmentQuestionType.TRUE_FALSE },
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Question type cannot be changed after creation. Delete and recreate the question instead.',
        ),
      );
    });

    it('rejects updates when assessment is not DRAFT or access is denied', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValueOnce({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { points: 3 },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      accessService.ensureInstructorCanManageQuestion.mockRejectedValueOnce(
        new ForbiddenException('Access denied'),
      );
      await expect(
        service.updateQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          { points: 3 },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('softDeleteQuestion', () => {
    it('soft deletes a question in a DRAFT assessment', async () => {
      await expect(
        service.softDeleteQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).resolves.toEqual({ deleted: true });

      expect(
        questionRepo.softDeleteQuestionAndSyncTotalPoints,
      ).toHaveBeenCalledWith(assessmentId, questionId);
    });

    it('throws NotFoundException when question, assessment, or delete result is missing', async () => {
      questionRepo.findQuestionById.mockResolvedValueOnce(null);
      await expect(
        service.softDeleteQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toThrow(new NotFoundException('Question not found'));

      assessmentRepo.findAssessmentById.mockResolvedValueOnce(null);
      await expect(
        service.softDeleteQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));

      questionRepo.softDeleteQuestionAndSyncTotalPoints.mockResolvedValueOnce(
        false,
      );
      await expect(
        service.softDeleteQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toThrow(
        new NotFoundException('Can not delete question. Try again'),
      );
    });

    it('throws BadRequestException when assessment is not DRAFT', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });

      await expect(
        service.softDeleteQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getAssessmentQuestions & getSkillCountForQuestion', () => {
    it('returns active questions ordered by order asc with default pagination', async () => {
      const result = await service.getAssessmentQuestions(
        instructorId,
        courseId,
        assessmentId,
      );

      expect(questionRepo.findMany).toHaveBeenCalledWith(
        { assessmentId, isActive: true },
        { field: 'order', direction: 'asc' },
        0,
        50,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(questionId);
    });

    it('throws NotFoundException when assessment does not exist', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue(null);

      await expect(
        service.getAssessmentQuestions(instructorId, courseId, assessmentId),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));
    });

    it('delegates getSkillCountForQuestion to repository countSkill', async () => {
      questionRepo.countSkill.mockResolvedValue(4);

      await expect(service.getSkillCountForQuestion(questionId)).resolves.toBe(
        4,
      );
      expect(questionRepo.countSkill).toHaveBeenCalledWith(questionId);
    });
  });
});
