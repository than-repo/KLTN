jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

jest.mock(
  '../../../../../src/features/courses/repositories/lesson.repository',
  () => ({ lessonSkillsInclude: {} }),
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentQuestionType,
  type IAssessmentQuestionRepository,
} from '../../../../../src/features/assessments/interfaces/assessment-questions.repository.interface';
import {
  AssessmentOrderField,
  AssessmentReviewContent,
  AssessmentReviewTiming,
  AssessmentStatus,
  AssessmentType,
  InvalidAfterLessonError,
  OrderDirection,
  type Assessment,
  type AssessmentPublishSession,
  type AssessmentPublishValidationRecord,
  type IAssessmentRepository,
} from '../../../../../src/features/assessments/interfaces/assessment.repository.interface';
import type {
  DetailedAssessment,
  IDetailedAssessmentRepository,
} from '../../../../../src/features/assessments/interfaces/detailed-assessment.interface';
import type { AssessmentAccessService } from '../../../../../src/features/assessments/services/assessment-access.service';
import { AssessmentsService } from '../../../../../src/features/assessments/services/assessments.service';

describe('AssessmentsService', () => {
  let assessmentRepo: jest.Mocked<IAssessmentRepository>;
  let questionRepo: jest.Mocked<IAssessmentQuestionRepository>;
  let accessService: jest.Mocked<
    Pick<
      AssessmentAccessService,
      | 'ensureInstructorCanManageCourse'
      | 'ensureInstructorCanManageAssessment'
      | 'ensureActiveLessonInCourse'
    >
  >;
  let detailedRepo: jest.Mocked<IDetailedAssessmentRepository>;
  let service: AssessmentsService;

  const instructorId = 'instructor-1';
  const courseId = 'course-1';
  const assessmentId = 'assessment-1';
  const lessonId = 'lesson-1';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const baseAssessment: Assessment = {
    id: assessmentId,
    courseId,
    title: 'Midterm Quiz',
    description: 'Covers modules 1-3',
    type: AssessmentType.QUIZ,
    status: AssessmentStatus.DRAFT,
    order: 1,
    totalPoints: 20,
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

  function makePublishRecord(
    overrides: Partial<AssessmentPublishValidationRecord> = {},
  ): AssessmentPublishValidationRecord {
    return {
      id: assessmentId,
      courseId,
      type: AssessmentType.QUIZ,
      status: AssessmentStatus.DRAFT,
      isActive: true,
      deletedAt: null,
      passingScore: 70,
      afterLessonId: null,
      questions: [
        {
          id: 'q-mc',
          type: AssessmentQuestionType.MULTIPLE_CHOICE,
          points: 10,
          answer: {
            correctOptionAnswer: 'A',
            correctTextAnswer: null,
            wrongAnswers: ['B', 'C'],
          },
        },
        {
          id: 'q-tf',
          type: AssessmentQuestionType.TRUE_FALSE,
          points: 5,
          answer: {
            correctOptionAnswer: 'true',
            correctTextAnswer: null,
            wrongAnswers: ['false'],
          },
        },
        {
          id: 'q-fib',
          type: AssessmentQuestionType.FILL_IN_THE_BLANK,
          points: 5,
          answer: {
            correctOptionAnswer: null,
            correctTextAnswer: 'TypeScript',
            wrongAnswers: null,
          },
        },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    assessmentRepo = {
      createDraftAssessment: jest.fn().mockResolvedValue(baseAssessment),
      getNextOrder: jest.fn().mockResolvedValue(1),
      findAssessmentById: jest.fn().mockResolvedValue(baseAssessment),
      updateDraftAssessment: jest.fn().mockResolvedValue(baseAssessment),
      updatePublishAssessment: jest.fn().mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      }),
      softDeleteAssessment: jest.fn().mockResolvedValue(true),
      findMany: jest.fn().mockResolvedValue([baseAssessment]),
      count: jest.fn().mockResolvedValue(1),
      withPublishSession: jest.fn(),
    };

    questionRepo = {
      createQuestionAndSyncTotalPoints: jest.fn(),
      getNextOrder: jest.fn(),
      findQuestionById: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateQuestionAndSyncTotalPoints: jest.fn(),
      softDeleteQuestionAndSyncTotalPoints: jest.fn(),
      countActiveQuestions: jest.fn().mockResolvedValue(0),
      sumActiveQuestionPoints: jest.fn(),
      syncAssessmentTotalPointsTx: jest.fn(),
      countSkill: jest.fn(),
    };

    accessService = {
      ensureInstructorCanManageCourse: jest.fn().mockResolvedValue(undefined),
      ensureInstructorCanManageAssessment: jest
        .fn()
        .mockResolvedValue(undefined),
      ensureActiveLessonInCourse: jest.fn().mockResolvedValue(undefined),
    };

    detailedRepo = {
      findDetailedAssessment: jest.fn(),
    };

    service = new AssessmentsService(
      assessmentRepo,
      questionRepo,
      accessService as unknown as AssessmentAccessService,
      detailedRepo,
    );
  });

  describe('createDraftAssessment', () => {
    it('creates a draft QUIZ assessment and strips non-exposed fields', async () => {
      const from = '2026-12-01T00:00:00.000Z';
      const until = '2026-12-10T00:00:00.000Z';

      const result = await service.createDraftAssessment(
        instructorId,
        courseId,
        {
          title: 'Midterm Quiz',
          description: 'Covers modules 1-3',
          type: AssessmentType.QUIZ,
          passingScore: 70,
          maxAttempts: 2,
          timeLimitMinutes: 30,
          availableFrom: from,
          availableUntil: until,
          afterLesson: lessonId,
        },
      );

      expect(
        accessService.ensureInstructorCanManageCourse,
      ).toHaveBeenCalledWith(instructorId, courseId);
      expect(accessService.ensureActiveLessonInCourse).toHaveBeenCalledWith(
        lessonId,
        courseId,
      );
      expect(assessmentRepo.createDraftAssessment).toHaveBeenCalledWith({
        courseId,
        afterLesson: lessonId,
        title: 'Midterm Quiz',
        description: 'Covers modules 1-3',
        type: AssessmentType.QUIZ,
        status: AssessmentStatus.DRAFT,
        order: 1,
        passingScore: 70,
        maxAttempts: 2,
        timeLimitMinutes: 30,
        availableFrom: new Date(from),
        availableUntil: new Date(until),
        isActive: true,
      });
      expect(result.id).toBe(assessmentId);
      expect(result).not.toHaveProperty('assessmentReviewTiming');
    });

    it('forces timeLimitMinutes to null for PROJECT assessments', async () => {
      await service.createDraftAssessment(instructorId, courseId, {
        title: 'Capstone Project',
        type: AssessmentType.PROJECT,
        timeLimitMinutes: 45,
      });

      expect(assessmentRepo.createDraftAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AssessmentType.PROJECT,
          timeLimitMinutes: null,
          afterLesson: null,
        }),
      );
    });

    it.each([
      ['invalid availableFrom', 'not-a-date', undefined],
      ['invalid availableUntil', undefined, 'not-a-date'],
      [
        'availableFrom >= availableUntil',
        '2026-12-10T00:00:00.000Z',
        '2026-12-01T00:00:00.000Z',
      ],
    ])(
      'throws BadRequestException when %s',
      async (_label, availableFrom, availableUntil) => {
        await expect(
          service.createDraftAssessment(instructorId, courseId, {
            title: 'Quiz',
            type: AssessmentType.QUIZ,
            availableFrom,
            availableUntil,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(assessmentRepo.createDraftAssessment).not.toHaveBeenCalled();
      },
    );

    it('maps InvalidAfterLessonError to BadRequestException', async () => {
      assessmentRepo.createDraftAssessment.mockRejectedValue(
        new InvalidAfterLessonError(),
      );

      await expect(
        service.createDraftAssessment(instructorId, courseId, {
          title: 'Quiz',
          type: AssessmentType.QUIZ,
          afterLesson: lessonId,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'afterLesson must reference an active lesson in an active section of this course.',
        ),
      );
    });
  });

  describe('updateDraftAssessment', () => {
    it('updates a draft assessment', async () => {
      const result = await service.updateDraftAssessment(
        instructorId,
        courseId,
        assessmentId,
        {
          title: 'Updated Title',
          timeLimitMinutes: 45,
        },
      );

      expect(assessmentRepo.updateDraftAssessment).toHaveBeenCalledWith(
        assessmentId,
        expect.objectContaining({
          title: 'Updated Title',
          timeLimitMinutes: 45,
        }),
        courseId,
      );
      expect(result.id).toBe(assessmentId);
    });

    it('throws NotFoundException when assessment does not exist', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue(null);

      await expect(
        service.updateDraftAssessment(instructorId, courseId, assessmentId, {
          title: 'New',
        }),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));
    });

    it('throws BadRequestException when assessment is not DRAFT', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });

      await expect(
        service.updateDraftAssessment(instructorId, courseId, assessmentId, {
          title: 'New',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Assessment can only be changed while it is in DRAFT status',
        ),
      );
    });

    it('blocks changing assessment type when active questions already exist', async () => {
      questionRepo.countActiveQuestions.mockResolvedValue(2);

      await expect(
        service.updateDraftAssessment(instructorId, courseId, assessmentId, {
          type: AssessmentType.PROJECT,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Assessment type can not be changed after questions are added',
        ),
      );
    });

    it('allows changing assessment type when zero active questions exist and clears timeLimitMinutes for PROJECT', async () => {
      questionRepo.countActiveQuestions.mockResolvedValue(0);

      await service.updateDraftAssessment(
        instructorId,
        courseId,
        assessmentId,
        {
          type: AssessmentType.PROJECT,
          timeLimitMinutes: 30,
        },
      );

      expect(assessmentRepo.updateDraftAssessment).toHaveBeenCalledWith(
        assessmentId,
        expect.objectContaining({
          type: AssessmentType.PROJECT,
          timeLimitMinutes: null,
        }),
        courseId,
      );
    });

    it('validates combined availability window against existing dates', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...baseAssessment,
        availableUntil: new Date('2026-12-05T00:00:00.000Z'),
      });

      await expect(
        service.updateDraftAssessment(instructorId, courseId, assessmentId, {
          availableFrom: '2026-12-10T00:00:00.000Z',
        }),
      ).rejects.toThrow(
        new BadRequestException('availableFrom must be before availableUntil'),
      );
    });
  });

  describe('updatePublishAssessment', () => {
    const publishedAssessment: Assessment = {
      ...baseAssessment,
      status: AssessmentStatus.PUBLISHED,
    };

    beforeEach(() => {
      assessmentRepo.findAssessmentById.mockResolvedValue(publishedAssessment);
    });

    it('updates allowed settings on a published QUIZ assessment', async () => {
      const result = await service.updatePublishAssessment(
        instructorId,
        courseId,
        assessmentId,
        {
          maxAttempts: 5,
          timeLimitMinutes: 25,
          availableFrom: null,
          assessmentReviewTiming: AssessmentReviewTiming.AFTER_SUBMIT,
          assessmentReviewContent: AssessmentReviewContent.FULL_REVIEW,
          isActive: false,
        },
      );

      expect(assessmentRepo.updatePublishAssessment).toHaveBeenCalledWith(
        assessmentId,
        {
          afterLesson: undefined,
          maxAttempts: 5,
          timeLimitMinutes: 25,
          availableFrom: null,
          availableUntil: undefined,
          assessmentReviewTiming: AssessmentReviewTiming.AFTER_SUBMIT,
          assessmentReviewContent: AssessmentReviewContent.FULL_REVIEW,
          isActive: false,
        },
        courseId,
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when assessment is missing or belongs to another course', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValueOnce(null);
      await expect(
        service.updatePublishAssessment(
          instructorId,
          courseId,
          assessmentId,
          {},
        ),
      ).rejects.toThrow(new NotFoundException('Assessment not found'));

      assessmentRepo.findAssessmentById.mockResolvedValueOnce({
        ...publishedAssessment,
        courseId: 'other-course',
      });
      await expect(
        service.updatePublishAssessment(
          instructorId,
          courseId,
          assessmentId,
          {},
        ),
      ).rejects.toThrow(
        new NotFoundException('Assessment not found in course'),
      );
    });

    it('throws BadRequestException when assessment is not PUBLISHED', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue(baseAssessment);

      await expect(
        service.updatePublishAssessment(
          instructorId,
          courseId,
          assessmentId,
          {},
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Only PUBLISHED assessments can be updated with this endpoint',
        ),
      );
    });

    it('rejects timeLimitMinutes on published PROJECT assessments', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue({
        ...publishedAssessment,
        type: AssessmentType.PROJECT,
      });

      await expect(
        service.updatePublishAssessment(instructorId, courseId, assessmentId, {
          timeLimitMinutes: 20,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'timeLimitMinutes is only allowed for QUIZ assessments',
        ),
      );
    });
  });

  describe('publishAssessment', () => {
    let session: jest.Mocked<AssessmentPublishSession>;

    beforeEach(() => {
      session = {
        findForUpdate: jest.fn().mockResolvedValue(makePublishRecord()),
        publish: jest.fn().mockResolvedValue(true),
        findAssessment: jest.fn().mockResolvedValue({
          ...baseAssessment,
          status: AssessmentStatus.PUBLISHED,
          totalPoints: 20,
        }),
      };

      assessmentRepo.withPublishSession.mockImplementation(
        async (_cId, _aId, work) => work(session),
      );
    });

    it('publishes a valid QUIZ assessment with summed totalPoints', async () => {
      const result = await service.publishAssessment(
        instructorId,
        courseId,
        assessmentId,
      );

      expect(session.publish).toHaveBeenCalledWith(20);
      expect(result.status).toBe(AssessmentStatus.PUBLISHED);
      expect(result.totalPoints).toBe(20);
    });

    it('publishes a valid PROJECT assessment with one PROJECT question and no answer key', async () => {
      session.findForUpdate.mockResolvedValue(
        makePublishRecord({
          type: AssessmentType.PROJECT,
          questions: [
            {
              id: 'q-proj',
              type: AssessmentQuestionType.PROJECT,
              points: 100,
              answer: null,
            },
          ],
        }),
      );

      await service.publishAssessment(instructorId, courseId, assessmentId);

      expect(session.publish).toHaveBeenCalledWith(100);
    });

    it('revalidates afterLesson when present', async () => {
      session.findForUpdate.mockResolvedValue(
        makePublishRecord({ afterLessonId: lessonId }),
      );

      await service.publishAssessment(instructorId, courseId, assessmentId);

      expect(accessService.ensureActiveLessonInCourse).toHaveBeenCalledWith(
        lessonId,
        courseId,
      );
    });

    it.each([
      ['missing', null],
      ['soft-deleted', makePublishRecord({ deletedAt: now })],
    ])(
      'throws NotFoundException when assessment is %s',
      async (_label, record) => {
        session.findForUpdate.mockResolvedValue(record);

        await expect(
          service.publishAssessment(instructorId, courseId, assessmentId),
        ).rejects.toThrow(new NotFoundException('Assessment not found'));
      },
    );

    it('throws BadRequestException when assessment is inactive', async () => {
      session.findForUpdate.mockResolvedValue(
        makePublishRecord({ isActive: false }),
      );

      await expect(
        service.publishAssessment(instructorId, courseId, assessmentId),
      ).rejects.toThrow(new BadRequestException('Assessment is inactive.'));
    });

    it('throws ConflictException when assessment is not DRAFT or publish returns false', async () => {
      session.findForUpdate.mockResolvedValueOnce(
        makePublishRecord({ status: AssessmentStatus.PUBLISHED }),
      );
      await expect(
        service.publishAssessment(instructorId, courseId, assessmentId),
      ).rejects.toThrow(
        new ConflictException('Only DRAFT assessments can be published.'),
      );

      session.publish.mockResolvedValueOnce(false);
      await expect(
        service.publishAssessment(instructorId, courseId, assessmentId),
      ).rejects.toThrow(
        new ConflictException('Assessment could not be published.'),
      );
    });

    it.each([
      ['no questions', makePublishRecord({ questions: [] })],
      ['invalid passingScore > 100', makePublishRecord({ passingScore: 101 })],
      ['negative passingScore', makePublishRecord({ passingScore: -1 })],
      [
        'zero totalPoints',
        makePublishRecord({
          questions: [
            {
              id: 'q1',
              type: AssessmentQuestionType.FILL_IN_THE_BLANK,
              points: 0,
              answer: {
                correctOptionAnswer: null,
                correctTextAnswer: 'ans',
                wrongAnswers: null,
              },
            },
          ],
        }),
      ],
      [
        'PROJECT with answer key',
        makePublishRecord({
          type: AssessmentType.PROJECT,
          questions: [
            {
              id: 'q1',
              type: AssessmentQuestionType.PROJECT,
              points: 10,
              answer: {
                correctOptionAnswer: null,
                correctTextAnswer: 'nope',
                wrongAnswers: null,
              },
            },
          ],
        }),
      ],
      [
        'QUIZ with missing answer key',
        makePublishRecord({
          questions: [
            {
              id: 'q1',
              type: AssessmentQuestionType.MULTIPLE_CHOICE,
              points: 10,
              answer: null,
            },
          ],
        }),
      ],
      [
        'MULTIPLE_CHOICE with duplicate options',
        makePublishRecord({
          questions: [
            {
              id: 'q1',
              type: AssessmentQuestionType.MULTIPLE_CHOICE,
              points: 10,
              answer: {
                correctOptionAnswer: 'Option A',
                correctTextAnswer: null,
                wrongAnswers: ['option a'],
              },
            },
          ],
        }),
      ],
      [
        'TRUE_FALSE without opposite wrongAnswer',
        makePublishRecord({
          questions: [
            {
              id: 'q1',
              type: AssessmentQuestionType.TRUE_FALSE,
              points: 10,
              answer: {
                correctOptionAnswer: 'true',
                correctTextAnswer: null,
                wrongAnswers: ['true'],
              },
            },
          ],
        }),
      ],
      [
        'FILL_IN_THE_BLANK with wrongAnswers present',
        makePublishRecord({
          questions: [
            {
              id: 'q1',
              type: AssessmentQuestionType.FILL_IN_THE_BLANK,
              points: 10,
              answer: {
                correctOptionAnswer: null,
                correctTextAnswer: 'answer',
                wrongAnswers: ['extra'],
              },
            },
          ],
        }),
      ],
    ])('rejects invalid content: %s', async (_label, invalidRecord) => {
      session.findForUpdate.mockResolvedValue(invalidRecord);

      await expect(
        service.publishAssessment(instructorId, courseId, assessmentId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(session.publish).not.toHaveBeenCalled();
    });
  });

  describe('deleteAssessment', () => {
    it('soft deletes a DRAFT assessment', async () => {
      await expect(
        service.deleteAssessment(instructorId, courseId, assessmentId),
      ).resolves.toEqual({ deleted: true });
      expect(assessmentRepo.softDeleteAssessment).toHaveBeenCalledWith(
        assessmentId,
      );
    });

    it('throws NotFoundException when assessment does not exist', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValue(null);

      await expect(
        service.deleteAssessment(instructorId, courseId, assessmentId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when assessment is not DRAFT or softDelete fails', async () => {
      assessmentRepo.findAssessmentById.mockResolvedValueOnce({
        ...baseAssessment,
        status: AssessmentStatus.PUBLISHED,
      });
      await expect(
        service.deleteAssessment(instructorId, courseId, assessmentId),
      ).rejects.toBeInstanceOf(BadRequestException);

      assessmentRepo.softDeleteAssessment.mockResolvedValueOnce(false);
      await expect(
        service.deleteAssessment(instructorId, courseId, assessmentId),
      ).rejects.toThrow(
        new BadRequestException('Can not delete assessment. Try again'),
      );
    });
  });

  describe('findMany', () => {
    it('returns paginated instructor assessments with defaults and capped limit', async () => {
      assessmentRepo.count.mockResolvedValue(25);

      const result = await service.findMany(instructorId, courseId, {
        page: 2,
        limit: 500,
        search: 'Midterm',
      });

      expect(assessmentRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId,
          includeDeleted: false,
          search: 'Midterm',
        }),
        {
          field: AssessmentOrderField.ORDER,
          direction: OrderDirection.ASC,
        },
        100,
        100,
      );
      expect(result.meta).toEqual({
        limit: 100,
        total: 25,
        page: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findDetailedAssessment', () => {
    it('returns transformed DetailedAssessmentDto', async () => {
      const detailed: DetailedAssessment = {
        ...baseAssessment,
        reviewTiming: AssessmentReviewTiming.AFTER_GRADED,
        reviewContent: AssessmentReviewContent.SCORE_ONLY,
        questions: [],
      };
      detailedRepo.findDetailedAssessment.mockResolvedValue(detailed);

      const result = await service.findDetailedAssessment(
        instructorId,
        courseId,
        assessmentId,
      );

      expect(result.id).toBe(assessmentId);
      expect(result.questions).toEqual([]);
    });

    it('throws NotFoundException when detailed assessment is not found', async () => {
      detailedRepo.findDetailedAssessment.mockResolvedValue(null);

      await expect(
        service.findDetailedAssessment(instructorId, courseId, assessmentId),
      ).rejects.toThrow(new NotFoundException('Detailed assessment not found'));
    });
  });
});
