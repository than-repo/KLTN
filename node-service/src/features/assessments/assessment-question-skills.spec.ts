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
  () =>
    jest.requireActual<typeof import('../../../generated/prisma/enums')>(
      '../../../generated/prisma/enums',
    ),
  { virtual: true },
);

jest.mock(
  'src/core/database/prisma.service',
  () => ({ PrismaService: class PrismaService {} }),
  { virtual: true },
);

jest.mock(
  'src/features/skill/repositories/skill.repository',
  () => ({ SkillRepository: class SkillRepository {} }),
  { virtual: true },
);

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Difficulty } from 'generated/prisma/enums';
import { DetailedAssessmentDto } from './dtos/assessment/detailed-assessment.dto';
import { ASSESSMENT_VIEW_GROUPS } from './dtos/assessment/assessment-response';
import {
  CreateAssessmentQuestionDto,
  UpdateAssessmentQuestionDto,
} from './dtos/questions/assessment-question.dto';
import { AssessmentQuestionResponseDto } from './dtos/questions/assessment-question-response.dto';
import { AssessmentQuestionType } from './interfaces/assessment-questions.repository.interface';
import {
  AssessmentStatus,
  AssessmentType,
} from './interfaces/assessment.repository.interface';
import { AssessmentQuestionsRepository } from './repositories/assessment-questions.repository';
import { DetailedAssessmentRepository } from './repositories/detailed-assessment.repository';
import { AssessmentQuestionsService } from './services/assessment-questions.service';

const now = new Date('2026-01-01T00:00:00Z');
const skill = {
  id: 'cmv6st8y0000fk4voncpprhsd',
  courseId: 'course',
  canonicalName: 'TypeScript',
  description: null,
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
const question = {
  id: 'question',
  assessmentId: 'assessment',
  questionText: 'Is TypeScript typed?',
  type: AssessmentQuestionType.TRUE_FALSE,
  explanation: null,
  points: 1,
  order: 0,
  skills: [skill],
  isActive: true,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

describe('Question skill input validation', () => {
  it.each([
    { skillIds: undefined },
    { skillIds: null },
    { skillIds: [] },
    { skillIds: [skill.id, skill.id] },
    { skillIds: [1] },
    { skillIds: [''] },
    { skillIds: ['x'.repeat(51)] },
  ])('rejects invalid create skillIds: %j', ({ skillIds }) => {
    const dto = plainToInstance(CreateAssessmentQuestionDto, {
      questionText: question.questionText,
      type: question.type,
      skillIds,
    });

    expect(
      validateSync(dto).some((error) => error.property === 'skillIds'),
    ).toBe(true);
  });

  it('accepts existing skill IDs and permits updates that omit skills', () => {
    const dto = plainToInstance(CreateAssessmentQuestionDto, {
      questionText: question.questionText,
      type: question.type,
      skillIds: [skill.id],
    });

    expect(validateSync(dto)).toEqual([]);
    expect(
      validateSync(plainToInstance(UpdateAssessmentQuestionDto, { points: 2 })),
    ).toEqual([]);
    expect(
      validateSync(
        plainToInstance(UpdateAssessmentQuestionDto, { skillIds: [] }),
      ),
    ).not.toEqual([]);
  });
});

describe('Question skill persistence', () => {
  const tx = {
    assessmentQuestion: {
      create: jest.fn<Promise<typeof question>, [unknown]>(),
      findFirst: jest.fn(),
      update: jest.fn<Promise<typeof question>, [unknown]>(),
      aggregate: jest.fn(),
    },
    assessment: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const repository = new AssessmentQuestionsRepository(
    prisma as unknown as ConstructorParameters<
      typeof AssessmentQuestionsRepository
    >[0],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.assessmentQuestion.create.mockResolvedValue(question);
    tx.assessmentQuestion.findFirst.mockResolvedValue({ id: question.id });
    tx.assessmentQuestion.update.mockResolvedValue(question);
    tx.assessmentQuestion.aggregate.mockResolvedValue({ _sum: { points: 1 } });
  });

  it('creates skill assignments and returns them while synchronizing points', async () => {
    const result = await repository.createQuestionAndSyncTotalPoints({
      assessmentId: question.assessmentId,
      questionText: question.questionText,
      type: question.type,
      skillIds: [skill.id],
    });

    expect(tx.assessmentQuestion.create).toHaveBeenCalledTimes(1);
    expect(tx.assessmentQuestion.create.mock.calls[0][0]).toMatchObject({
      data: { skills: { connect: [{ id: skill.id }] } },
      include: { skills: true },
    });
    expect(result.skills).toEqual([skill]);
    expect(tx.assessment.update).toHaveBeenCalledWith({
      where: { id: question.assessmentId },
      data: { totalPoints: 1 },
    });
  });

  it('replaces the complete skill selection and returns assigned skills', async () => {
    const result = await repository.updateQuestionAndSyncTotalPoints(
      question.id,
      question.assessmentId,
      { skillIds: [skill.id] },
    );

    expect(tx.assessmentQuestion.update).toHaveBeenCalledTimes(1);
    expect(tx.assessmentQuestion.update.mock.calls[0][0]).toMatchObject({
      where: {
        id: question.id,
        assessmentId: question.assessmentId,
        isActive: true,
        deletedAt: null,
      },
      data: { skills: { set: [{ id: skill.id }] } },
      include: { skills: true },
    });
    expect(result?.skills).toEqual([skill]);
  });

  it('preserves assignments when an update omits skillIds', async () => {
    await repository.updateQuestionAndSyncTotalPoints(
      question.id,
      question.assessmentId,
      { questionText: 'Updated question' },
    );

    expect(tx.assessmentQuestion.update.mock.calls[0][0]).toMatchObject({
      data: { skills: undefined },
    });
  });

  it('does not write or synchronize points for a missing or unavailable question', async () => {
    tx.assessmentQuestion.findFirst.mockResolvedValue(null);

    await expect(
      repository.updateQuestionAndSyncTotalPoints(
        question.id,
        question.assessmentId,
        { skillIds: [skill.id] },
      ),
    ).resolves.toBeNull();
    expect(tx.assessmentQuestion.update).not.toHaveBeenCalled();
    expect(tx.assessment.update).not.toHaveBeenCalled();
  });
});

describe('Question skill service behavior', () => {
  const assessments = { findAssessmentById: jest.fn() };
  const questions = {
    findQuestionById: jest.fn(),
    updateQuestionAndSyncTotalPoints: jest.fn(),
  };
  const access = { ensureInstructorCanManageQuestion: jest.fn() };
  const skills = { getSkillsByCourseId: jest.fn() };
  const service = new AssessmentQuestionsService(
    assessments as unknown as ConstructorParameters<
      typeof AssessmentQuestionsService
    >[0],
    questions as unknown as ConstructorParameters<
      typeof AssessmentQuestionsService
    >[1],
    access as unknown as ConstructorParameters<
      typeof AssessmentQuestionsService
    >[2],
    skills as unknown as ConstructorParameters<
      typeof AssessmentQuestionsService
    >[3],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    assessments.findAssessmentById.mockResolvedValue({
      id: question.assessmentId,
      status: AssessmentStatus.DRAFT,
      type: AssessmentType.QUIZ,
    });
    questions.findQuestionById.mockResolvedValue(question);
    questions.updateQuestionAndSyncTotalPoints.mockResolvedValue(question);
    access.ensureInstructorCanManageQuestion.mockResolvedValue(undefined);
    skills.getSkillsByCourseId.mockResolvedValue([skill]);
  });

  it.each([{}, { skillIds: null }])(
    'preserves skills for an omitted or null selection: %j',
    async (payload) => {
      const dto = plainToInstance(UpdateAssessmentQuestionDto, payload);
      expect(validateSync(dto)).toEqual([]);

      const response = await service.updateQuestion(
        'instructor',
        skill.courseId,
        question.assessmentId,
        question.id,
        dto,
      );

      expect(questions.updateQuestionAndSyncTotalPoints).toHaveBeenCalledWith(
        question.id,
        question.assessmentId,
        expect.objectContaining({ skillIds: undefined }),
      );
      expect(response.skills?.[0].id).toBe(skill.id);
      expect(response.skills?.[0]).not.toHaveProperty('embedding');
      expect(response.skills?.[0]).not.toHaveProperty('courseId');
    },
  );

  it('rejects skills absent from the active skills of the requested course', async () => {
    await expect(
      service.updateQuestion(
        'instructor',
        skill.courseId,
        question.assessmentId,
        question.id,
        { skillIds: ['another-course-skill'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(skills.getSkillsByCourseId).toHaveBeenCalledWith(skill.courseId);
    expect(questions.updateQuestionAndSyncTotalPoints).not.toHaveBeenCalled();
  });

  it('preserves ownership and draft-only restrictions', async () => {
    access.ensureInstructorCanManageQuestion.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(
      service.updateQuestion(
        'other',
        skill.courseId,
        'assessment',
        'question',
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    assessments.findAssessmentById.mockResolvedValue({
      status: AssessmentStatus.PUBLISHED,
      type: AssessmentType.QUIZ,
    });
    await expect(
      service.updateQuestion(
        'instructor',
        skill.courseId,
        'assessment',
        'question',
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(questions.updateQuestionAndSyncTotalPoints).not.toHaveBeenCalled();
  });
});

describe('Assessment detail skill serialization', () => {
  it('retains lowercase skills through repository mapping and response serialization', async () => {
    const prisma = {
      assessment: {
        findFirst: jest.fn().mockResolvedValue({
          id: question.assessmentId,
          questions: [{ ...question, answers: [] }],
        }),
      },
    };
    const repository = new DetailedAssessmentRepository(
      prisma as unknown as ConstructorParameters<
        typeof DetailedAssessmentRepository
      >[0],
    );
    const detail = await repository.findDetailedAssessment(
      question.assessmentId,
    );
    const response = plainToInstance(DetailedAssessmentDto, detail, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    expect(response?.questions[0].skills[0].id).toBe(skill.id);
    expect(response?.questions[0]).not.toHaveProperty('Skills');
    expect(response?.questions[0].skills[0]).not.toHaveProperty('embedding');
    expect(response?.questions[0].skills[0]).not.toHaveProperty('courseId');
    expect(response?.questions[0].skills[0].createdAt).toBe(now.toISOString());
  });

  it('keeps question skills restricted to instructor responses', () => {
    const response = plainToInstance(AssessmentQuestionResponseDto, question, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.LEARNER],
    });

    expect(JSON.stringify(response)).not.toContain('"skills"');
  });
});
