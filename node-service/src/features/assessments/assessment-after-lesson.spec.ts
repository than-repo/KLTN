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

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Prisma } from 'generated/prisma/client';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
  EnrollmentStatus,
} from 'generated/prisma/enums';
import { CreateAssessmentDto } from './dtos/assessment/create-assessment.dto';
import { UpdateAssessmentDto } from './dtos/assessment/update-assessment.dto';
import { UpdatePublishedAssessmentDto } from './dtos/assessment/update-published-assessment.dto';
import { DetailedAssessmentDto } from './dtos/assessment/detailed-assessment.dto';
import {
  AssessmentStatus,
  AssessmentType,
  InvalidAfterLessonError,
  type Assessment,
  type IAssessmentRepository,
} from './interfaces/assessment.repository.interface';
import type { IAssessmentAccessRepository } from './interfaces/assessment-access.repository.interface';
import type { LearnerCourseAssessmentListRecord } from './interfaces/attempt.repository.interface';
import { AssessmentMapper } from './mappers/assessment.mapper';
import { AssessmentRepository } from './repositories/assessment.repository';
import { AssessmentAccessRepository } from './repositories/assessment-access.repository';
import { AttemptRepository } from './repositories/attempt.repository';
import { DetailedAssessmentRepository } from './repositories/detailed-assessment.repository';
import { AssessmentAccessService } from './services/assessment-access.service';
import { AssessmentsService } from './services/assessments.service';
import { LearnerAssessmentsService } from './services/learner-assessments.service';

const lessonId = '33cecf62-021f-4277-a2ea-86b0d7a00e30';
const otherLessonId = '657978f1-5c14-414f-8baf-7445057740d2';
const courseId = '70fa49c0-c4c3-4a35-9ce2-4bfc33a35976';
const assessmentId = 'cd47f6ae-b53f-47f1-9d44-e9c8107bf307';
const now = new Date('2026-11-13T00:00:00Z');
const storedAssessment: Prisma.AssessmentModel = {
  id: assessmentId,
  courseId,
  afterLessonId: lessonId,
  title: 'Lesson quiz',
  description: null,
  type: AssessmentType.QUIZ,
  status: AssessmentStatus.DRAFT,
  order: 0,
  totalPoints: 0,
  passingScore: null,
  maxAttempts: null,
  timeLimitMinutes: null,
  availableFrom: null,
  availableUntil: null,
  reviewTiming: AssessmentReviewTiming.AFTER_GRADED,
  reviewContent: AssessmentReviewContent.SCORE_ONLY,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const dtoClasses: Array<new () => { afterLesson?: string | null }> = [
  CreateAssessmentDto,
  UpdateAssessmentDto,
  UpdatePublishedAssessmentDto,
];

describe.each(dtoClasses)('%p lesson input', (Dto) => {
  it.each([undefined, null, lessonId])('accepts %p', (afterLesson) => {
    const dto = plainToInstance(
      Dto,
      { title: 'Lesson quiz', type: AssessmentType.QUIZ, afterLesson },
      { enableImplicitConversion: true },
    );
    expect(validateSync(dto)).toEqual([]);
  });

  it.each(['', ' ', 'not-a-uuid', 42, false, [], {}])(
    'rejects an invalid lesson ID: %p',
    (afterLesson) => {
      const dto = plainToInstance(
        Dto,
        { title: 'Lesson quiz', type: AssessmentType.QUIZ, afterLesson },
        { enableImplicitConversion: true },
      );
      expect(validateSync(dto)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'afterLesson' }),
        ]),
      );
    },
  );
});

function createServiceRepositories(assessment: Assessment) {
  const updatePlacement = (
    _assessmentId: string,
    input: { afterLesson?: string | null },
  ): Promise<Assessment> =>
    Promise.resolve({
      ...assessment,
      afterLesson:
        input.afterLesson === undefined
          ? assessment.afterLesson
          : input.afterLesson,
    });

  return {
    repository: {
      createDraftAssessment: jest.fn().mockResolvedValue(assessment),
      getNextOrder: jest.fn().mockResolvedValue(0),
      findAssessmentById: jest.fn().mockResolvedValue(assessment),
      updateDraftAssessment: jest.fn(updatePlacement),
      updatePublishAssessment: jest.fn(updatePlacement),
      softDeleteAssessment: jest.fn(),
      findMany: jest.fn().mockResolvedValue([assessment]),
      count: jest.fn().mockResolvedValue(1),
    } satisfies jest.Mocked<IAssessmentRepository>,
    accessRepository: {
      existsCourseByInstructor: jest.fn().mockResolvedValue(true),
      existsAssessmentInCourse: jest.fn().mockResolvedValue(true),
      existsQuestionInAssessment: jest.fn(),
      existsAnswerInQuestion: jest.fn(),
      existsActiveLessonInCourse: jest.fn().mockResolvedValue(true),
    } satisfies jest.Mocked<IAssessmentAccessRepository>,
  };
}

describe('Assessment lesson placement services', () => {
  let repository: ReturnType<typeof createServiceRepositories>['repository'];
  let accessRepository: ReturnType<
    typeof createServiceRepositories
  >['accessRepository'];
  let service: AssessmentsService;
  let assessment: Assessment;

  beforeEach(() => {
    assessment = AssessmentMapper.toAssessment(storedAssessment);
    ({ repository, accessRepository } = createServiceRepositories(assessment));
    service = new AssessmentsService(
      repository,
      {
        countActiveQuestions: jest.fn().mockResolvedValue(0),
      } as unknown as ConstructorParameters<typeof AssessmentsService>[1],
      new AssessmentAccessService(accessRepository),
      {
        findDetailedAssessment: jest.fn().mockResolvedValue({
          ...assessment,
          questions: [],
        }),
      },
    );
  });

  it('validates and saves the linked lesson and returns it', async () => {
    const response = await service.createDraftAssessment(
      'instructor',
      courseId,
      {
        title: 'Lesson quiz',
        type: AssessmentType.QUIZ,
        afterLesson: lessonId,
      },
    );
    expect(accessRepository.existsActiveLessonInCourse).toHaveBeenCalledWith(
      lessonId,
      courseId,
    );
    expect(repository.createDraftAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ courseId, afterLesson: lessonId }),
    );
    expect(response.afterLesson).toBe(lessonId);
    expect(response).not.toHaveProperty('afterLessonId');
  });

  it.each([undefined, null])(
    'creates an unlinked assessment with %p',
    async (afterLesson) => {
      repository.createDraftAssessment.mockResolvedValue({
        ...assessment,
        afterLesson: null,
      });
      const response = await service.createDraftAssessment(
        'instructor',
        courseId,
        {
          title: 'Course quiz',
          type: AssessmentType.QUIZ,
          afterLesson,
        },
      );
      expect(
        accessRepository.existsActiveLessonInCourse,
      ).not.toHaveBeenCalled();
      expect(repository.createDraftAssessment).toHaveBeenCalledWith(
        expect.objectContaining({ afterLesson: null }),
      );
      expect(response.afterLesson).toBeNull();
    },
  );

  it('rejects an ineligible lesson before writing', async () => {
    accessRepository.existsActiveLessonInCourse.mockResolvedValue(false);
    await expect(
      service.createDraftAssessment('instructor', courseId, {
        title: 'Lesson quiz',
        type: AssessmentType.QUIZ,
        afterLesson: lessonId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createDraftAssessment).not.toHaveBeenCalled();
  });

  it('checks instructor access before looking up a lesson', async () => {
    accessRepository.existsCourseByInstructor.mockResolvedValue(false);
    await expect(
      service.createDraftAssessment('other', courseId, {
        title: 'Lesson quiz',
        type: AssessmentType.QUIZ,
        afterLesson: lessonId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(accessRepository.existsActiveLessonInCourse).not.toHaveBeenCalled();
    expect(repository.createDraftAssessment).not.toHaveBeenCalled();
  });

  it.each([undefined, null, otherLessonId])(
    'supports omitted, cleared, or changed draft placement: %p',
    async (afterLesson) => {
      const response = await service.updateDraftAssessment(
        'instructor',
        courseId,
        assessmentId,
        {
          afterLesson,
        },
      );
      expect(response.afterLesson).toBe(
        afterLesson === undefined ? lessonId : afterLesson,
      );
      expect(repository.updateDraftAssessment).toHaveBeenCalledWith(
        assessmentId,
        expect.objectContaining({ afterLesson }),
        courseId,
      );
      expect(accessRepository.existsActiveLessonInCourse).toHaveBeenCalledTimes(
        typeof afterLesson === 'string' ? 1 : 0,
      );
    },
  );

  it.each([undefined, null, otherLessonId])(
    'supports omitted, cleared, or changed published placement: %p',
    async (afterLesson) => {
      repository.findAssessmentById.mockResolvedValue({
        ...assessment,
        status: AssessmentStatus.PUBLISHED,
      });
      const response = await service.updatePublishAssessment(
        'instructor',
        courseId,
        assessmentId,
        { afterLesson },
      );
      expect(repository.updatePublishAssessment).toHaveBeenCalledWith(
        assessmentId,
        expect.objectContaining({ afterLesson }),
        courseId,
      );
      expect(accessRepository.existsActiveLessonInCourse).toHaveBeenCalledTimes(
        typeof afterLesson === 'string' ? 1 : 0,
      );
      expect(response.afterLesson).toBe(
        afterLesson === undefined ? lessonId : afterLesson,
      );
    },
  );

  it('revalidates the current link when publishing', async () => {
    const response = await service.publishAssessment(
      'instructor',
      courseId,
      assessmentId,
    );
    expect(response.afterLesson).toBe(lessonId);
    expect(repository.updateDraftAssessment).toHaveBeenCalledWith(
      assessmentId,
      { status: AssessmentStatus.PUBLISHED, afterLesson: lessonId },
      courseId,
    );
  });

  it('rejects publishing a stale lesson link', async () => {
    accessRepository.existsActiveLessonInCourse.mockResolvedValue(false);
    await expect(
      service.publishAssessment('instructor', courseId, assessmentId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateDraftAssessment).not.toHaveBeenCalled();
  });

  it('returns placement in the instructor list and detail', async () => {
    const list = await service.findMany('instructor', courseId, {});
    const detail = await service.findDetailedAssessment(
      'instructor',
      courseId,
      assessmentId,
    );
    expect(list.data[0].afterLesson).toBe(lessonId);
    expect(detail.afterLesson).toBe(lessonId);
  });

  it.each(['create', 'draft', 'published', 'publish'] as const)(
    'maps a concurrent lesson conflict to HTTP 400 for %s',
    async (operation) => {
      repository.createDraftAssessment.mockRejectedValue(
        new InvalidAfterLessonError(),
      );
      repository.updateDraftAssessment.mockRejectedValue(
        new InvalidAfterLessonError(),
      );
      repository.updatePublishAssessment.mockRejectedValue(
        new InvalidAfterLessonError(),
      );
      if (operation === 'published') {
        repository.findAssessmentById.mockResolvedValue({
          ...assessment,
          status: AssessmentStatus.PUBLISHED,
        });
      }
      const write =
        operation === 'create'
          ? service.createDraftAssessment('instructor', courseId, {
              title: 'Lesson quiz',
              type: AssessmentType.QUIZ,
              afterLesson: lessonId,
            })
          : operation === 'draft'
            ? service.updateDraftAssessment(
                'instructor',
                courseId,
                assessmentId,
                { afterLesson: lessonId },
              )
            : operation === 'published'
              ? service.updatePublishAssessment(
                  'instructor',
                  courseId,
                  assessmentId,
                  { afterLesson: lessonId },
                )
              : service.publishAssessment('instructor', courseId, assessmentId);
      await expect(write).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('preserves draft-only editing restrictions', async () => {
    repository.findAssessmentById.mockResolvedValue({
      ...assessment,
      status: AssessmentStatus.PUBLISHED,
    });
    await expect(
      service.updateDraftAssessment('instructor', courseId, assessmentId, {
        afterLesson: lessonId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateDraftAssessment).not.toHaveBeenCalled();
  });
});

describe('Assessment lesson persistence', () => {
  function setup() {
    const tx = {
      $queryRaw: jest
        .fn<Promise<{ id: string }[]>, [TemplateStringsArray, ...unknown[]]>()
        .mockResolvedValue([{ id: lessonId }]),
      assessment: {
        create: jest
          .fn<Promise<Prisma.AssessmentModel>, [Prisma.AssessmentCreateArgs]>()
          .mockResolvedValue(storedAssessment),
        update: jest
          .fn<Promise<Prisma.AssessmentModel>, [Prisma.AssessmentUpdateArgs]>()
          .mockResolvedValue(storedAssessment),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (write: (transaction: typeof tx) => Promise<unknown>) => write(tx),
      ),
    };
    return {
      tx,
      repository: new AssessmentRepository(
        prisma as unknown as ConstructorParameters<
          typeof AssessmentRepository
        >[0],
      ),
    };
  }

  it('locks the lesson and section before creating the assessment', async () => {
    const { tx, repository } = setup();
    const response = await repository.createDraftAssessment({
      courseId,
      title: 'Lesson quiz',
      type: AssessmentType.QUIZ,
      afterLesson: lessonId,
    });
    expect(tx.$queryRaw.mock.calls[0].slice(1)).toEqual([lessonId, courseId]);
    const sql = tx.$queryRaw.mock.calls[0][0].join('?');
    expect(sql).toContain('INNER JOIN course_sections');
    expect(sql).toContain('FOR UPDATE');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.assessment.create.mock.invocationCallOrder[0],
    );
    expect(tx.assessment.create.mock.calls[0][0].data.afterLessonId).toBe(
      lessonId,
    );
    expect(response.afterLesson).toBe(lessonId);
  });

  it.each(['create', 'draft', 'published'] as const)(
    'does not write after the locked lesson check fails: %s',
    async (operation) => {
      const { tx, repository } = setup();
      tx.$queryRaw.mockResolvedValue([]);
      const write =
        operation === 'create'
          ? repository.createDraftAssessment({
              courseId,
              title: 'Lesson quiz',
              type: AssessmentType.QUIZ,
              afterLesson: lessonId,
            })
          : operation === 'draft'
            ? repository.updateDraftAssessment(
                assessmentId,
                { afterLesson: lessonId },
                courseId,
              )
            : repository.updatePublishAssessment(
                assessmentId,
                { afterLesson: lessonId },
                courseId,
              );
      await expect(write).rejects.toBeInstanceOf(InvalidAfterLessonError);
      expect(tx.assessment.create).not.toHaveBeenCalled();
      expect(tx.assessment.update).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, lessonId])(
    'maps draft placement without passing the API alias to Prisma: %p',
    async (afterLesson) => {
      const { tx, repository } = setup();
      await repository.updateDraftAssessment(
        assessmentId,
        { afterLesson },
        courseId,
      );
      expect(tx.assessment.update).toHaveBeenCalledWith({
        where: { id: assessmentId, courseId },
        data: { afterLessonId: afterLesson },
      });
      expect(tx.$queryRaw).toHaveBeenCalledTimes(
        typeof afterLesson === 'string' ? 1 : 0,
      );
    },
  );

  it.each([undefined, null, lessonId])(
    'maps published placement: %p',
    async (afterLesson) => {
      const { tx, repository } = setup();
      await repository.updatePublishAssessment(
        assessmentId,
        { afterLesson },
        courseId,
      );
      expect(tx.assessment.update.mock.calls[0][0].where).toEqual({
        id: assessmentId,
        courseId,
      });
      expect(tx.assessment.update.mock.calls[0][0].data.afterLessonId).toBe(
        afterLesson,
      );
    },
  );

  it('checks both lesson state and parent section state in the access lookup', async () => {
    const prisma = { lesson: { findFirst: jest.fn().mockResolvedValue(null) } };
    const repository = new AssessmentAccessRepository(
      prisma as unknown as ConstructorParameters<
        typeof AssessmentAccessRepository
      >[0],
    );
    await expect(
      repository.existsActiveLessonInCourse(lessonId, courseId),
    ).resolves.toBe(false);
    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: {
        id: lessonId,
        isActive: true,
        deletedAt: null,
        section: { courseId, isActive: true, deletedAt: null },
      },
      select: { id: true },
    });
  });

  it('maps and serializes placement in detailed assessments', async () => {
    const prisma = {
      assessment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...storedAssessment, questions: [] }),
      },
    };
    const repository = new DetailedAssessmentRepository(
      prisma as unknown as ConstructorParameters<
        typeof DetailedAssessmentRepository
      >[0],
    );
    const detail = await repository.findDetailedAssessment(assessmentId);
    const response = plainToInstance(DetailedAssessmentDto, detail, {
      excludeExtraneousValues: true,
    });
    expect(response?.afterLesson).toBe(lessonId);
    expect(response).not.toHaveProperty('afterLessonId');
  });
});

describe('Learner assessment placement', () => {
  const lessonContext = {
    isActive: true,
    deletedAt: null,
    section: { courseId, isActive: true, deletedAt: null },
  };
  const record: LearnerCourseAssessmentListRecord = {
    id: assessmentId,
    courseId,
    afterLesson: lessonId,
    afterLessonContext: lessonContext,
    title: 'Lesson quiz',
    description: null,
    type: AssessmentType.QUIZ,
    order: 0,
    totalPoints: 0,
    passingScore: null,
    maxAttempts: null,
    timeLimitMinutes: null,
    availableFrom: null,
    availableUntil: null,
  };

  it.each([
    { context: lessonContext, expected: lessonId },
    { context: null, expected: null },
    { context: { ...lessonContext, isActive: false }, expected: null },
    { context: { ...lessonContext, deletedAt: now }, expected: null },
    {
      context: {
        ...lessonContext,
        section: { ...lessonContext.section, isActive: false },
      },
      expected: null,
    },
    {
      context: {
        ...lessonContext,
        section: { ...lessonContext.section, deletedAt: now },
      },
      expected: null,
    },
    {
      context: {
        ...lessonContext,
        section: { ...lessonContext.section, courseId: 'other-course' },
      },
      expected: null,
    },
  ])('returns safe placement for $context', async ({ context, expected }) => {
    const repository = {
      findLearnerEnrollment: jest.fn().mockResolvedValue({
        isActive: true,
        deletedAt: null,
        status: EnrollmentStatus.ACTIVE,
      }),
      findPublishedAssessmentsForLearnerCourse: jest
        .fn()
        .mockResolvedValue([{ ...record, afterLessonContext: context }]),
    };
    const service = new LearnerAssessmentsService(
      repository as unknown as ConstructorParameters<
        typeof LearnerAssessmentsService
      >[0],
    );
    const response = await service.getLearnerCourseAssessments({
      courseId,
      learnerId: 'learner',
    });
    expect(response.assessments).toHaveLength(1);
    expect(response.assessments[0].afterLesson).toBe(expected);
    expect(response.assessments[0]).not.toHaveProperty('afterLessonContext');
    expect(response.assessments[0]).not.toHaveProperty('afterLessonId');
  });

  it('loads only published, active, non-deleted assessments with stable ordering', async () => {
    const prisma = {
      assessment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { ...record, afterLessonId: lessonId, afterLesson: lessonContext },
          ]),
      },
    };
    const repository = new AttemptRepository(
      prisma as unknown as ConstructorParameters<typeof AttemptRepository>[0],
    );
    const result =
      await repository.findPublishedAssessmentsForLearnerCourse(courseId);
    expect(result[0].afterLesson).toBe(lessonId);
    expect(result[0].afterLessonContext).toEqual(lessonContext);
    expect(prisma.assessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId,
          status: 'PUBLISHED',
          isActive: true,
          deletedAt: null,
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  });
});
