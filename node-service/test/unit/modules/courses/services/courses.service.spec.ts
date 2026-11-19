jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        code: string;
        meta?: Record<string, unknown>;
        constructor(
          message: string,
          { code, meta }: { code: string; meta?: Record<string, unknown> },
        ) {
          super(message);
          this.code = code;
          this.meta = meta;
        }
      },
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/common/utils/slugify.util',
  () =>
    jest.requireActual<
      typeof import('../../../../../src/common/utils/slugify.util')
    >('../../../../../src/common/utils/slugify.util'),
  { virtual: true },
);

jest.mock(
  'src/common/utils/clean-data-util',
  () =>
    jest.requireActual<
      typeof import('../../../../../src/common/utils/clean-data-util')
    >('../../../../../src/common/utils/clean-data-util'),
  { virtual: true },
);

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';
import type { ICategoryRepository } from '../../../../../src/features/courses/interfaces/category.repository.interface';
import type { ICourseReviewRepository } from '../../../../../src/features/courses/interfaces/course-review.repository.interface';
import type {
  CourseModel,
  ICourseRepository,
} from '../../../../../src/features/courses/interfaces/course.repository.interface';
import type { CourseAccessService } from '../../../../../src/features/courses/services/course-access.service';
import { CoursesService } from '../../../../../src/features/courses/services/courses.service';

describe('CoursesService', () => {
  let courseAccessService: jest.Mocked<
    Pick<CourseAccessService, 'ensureInstructorCanManageCourse'>
  >;
  let courseRepo: jest.Mocked<ICourseRepository>;
  let categoryRepo: jest.Mocked<ICategoryRepository>;
  let reviewRepo: jest.Mocked<ICourseReviewRepository>;
  let service: CoursesService;

  const instructorId = 'instructor-1';
  const courseId = 'course-1';
  const categoryId = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const baseCourse: CourseModel = {
    id: courseId,
    title: 'NestJS Masterclass',
    slug: 'nestjs-masterclass',
    shortDescription: 'Learn production NestJS APIs',
    description: 'Full description',
    whatYouWillLearn: ['NestJS'],
    requirements: ['TypeScript'],
    thumbnailUrl: 'https://cdn.example.com/thumb.png',
    cloudinaryPublicId: 'courses/thumb',
    level: CourseLevel.BEGINNER,
    status: CourseStatus.DRAFT,
    price: 49.99,
    language: 'English',
    durationInMinutes: 120,
    isActive: true,
    certificateEnabled: true,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    categories: [{ id: categoryId, name: 'Backend', slug: 'backend' }],
    instructors: [{ id: instructorId, fullName: 'Jane Doe' }],
  };

  function makeSlugUniqueError(target: string | string[] = ['slug']) {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.8.0',
        meta: { target },
      },
    );
  }

  beforeEach(() => {
    courseAccessService = {
      ensureInstructorCanManageCourse: jest.fn().mockResolvedValue(undefined),
    };

    courseRepo = {
      create: jest.fn(),
      createDraftCourse: jest.fn().mockResolvedValue(baseCourse),
      findById: jest.fn().mockResolvedValue(baseCourse),
      findActiveById: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(baseCourse),
      findPublicByIds: jest.fn().mockResolvedValue([baseCourse]),
      findMany: jest.fn().mockResolvedValue([baseCourse]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
      updateDraftCourse: jest.fn().mockResolvedValue(baseCourse),
      submitForReview: jest.fn().mockResolvedValue({
        ...baseCourse,
        status: CourseStatus.IN_REVIEW,
      }),
      softDelete: jest.fn().mockResolvedValue(baseCourse),
      restore: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      existsOwnedByInstructor: jest.fn(),
      existsBySlug: jest.fn().mockResolvedValue(false),
      canEdit: jest.fn().mockResolvedValue(true),
    };

    categoryRepo = {
      getNextOrder: jest.fn(),
      existsBySlug: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByIdIncludingDeleted: jest.fn(),
      findBySlug: jest.fn(),
      findMany: jest.fn(),
      findManyByIds: jest.fn().mockResolvedValue([
        {
          id: categoryId,
          name: 'Backend',
          slug: 'backend',
          order: 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ]),
      findAllActive: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasAssociatedCourses: jest.fn(),
      count: jest.fn(),
    };

    reviewRepo = {
      findAvailableCourses: jest.fn(),
      countAvailableCourses: jest.fn(),
      claimCourseForReview: jest.fn(),
      findReviewableCourses: jest.fn(),
      countReviewableCourses: jest.fn(),
      findReviewWorkspace: jest.fn(),
      submitReviewDecision: jest.fn(),
      findLatestCompletedReviewByCourseId: jest.fn().mockResolvedValue({
        reviewId: 'rev-1',
        courseId,
        courseStatus: CourseStatus.CHANGES_REQUESTED,
        reviewStatus: CourseReviewStatus.CHANGES_REQUESTED,
        reviewNote: 'Fix lesson 1',
        submittedAt: now,
        reviewedAt: now,
      }),
      findMyChangedRequest: jest.fn(),
    };

    service = new CoursesService(
      courseAccessService as unknown as CourseAccessService,
      courseRepo,
      categoryRepo,
      reviewRepo,
    );
  });

  describe('getLatestReviewForInstructorCourse', () => {
    it('returns the latest completed review for an owned course', async () => {
      const result = await service.getLatestReviewForInstructorCourse(
        instructorId,
        courseId,
      );

      expect(
        courseAccessService.ensureInstructorCanManageCourse,
      ).toHaveBeenCalledWith(courseId, instructorId);
      expect(result.reviewId).toBe('rev-1');
      expect(result.reviewNote).toBe('Fix lesson 1');
    });

    it('throws NotFoundException when course or completed review does not exist', async () => {
      courseRepo.findById.mockResolvedValueOnce(null);
      await expect(
        service.getLatestReviewForInstructorCourse(instructorId, courseId),
      ).rejects.toThrow(new NotFoundException('COURSE_NOT_FOUND'));

      reviewRepo.findLatestCompletedReviewByCourseId.mockResolvedValueOnce(
        null,
      );
      await expect(
        service.getLatestReviewForInstructorCourse(instructorId, courseId),
      ).rejects.toThrow(new NotFoundException('COURSE_REVIEW_NOT_FOUND'));
    });
  });

  describe('findAllPublic, findCourseBySlug & findPublicCoursesByIds', () => {
    it('queries published active courses and strips management-only fields in PUBLIC view group', async () => {
      const result = await service.findAllPublic({
        search: 'nestjs',
        limit: 100, // clamped to 50
      });

      expect(courseRepo.findMany).toHaveBeenCalledWith({
        where: {
          search: 'nestjs',
          status: CourseStatus.PUBLISHED,
          isActive: true,
        },
        orderBy: { field: 'publishedAt', direction: 'desc' },
        limit: 50,
        offset: 0,
      });
      expect(result.data[0].id).toBe(courseId);
      expect(result.data[0].status).toBeUndefined();
      expect(result.data[0].isActive).toBeUndefined();
      expect(result.data[0]).not.toHaveProperty('cloudinaryPublicId');
    });

    it.each([
      [{ minPrice: 50, maxPrice: 10 }, 'MIN_PRICE_CANNOT_EXCEED_MAX_PRICE'],
      [
        {
          publishedFrom: '2026-12-01T00:00:00.000Z',
          publishedTo: '2026-01-01T00:00:00.000Z',
        },
        'PUBLISHED_FROM_CANNOT_EXCEED_PUBLISHED_TO',
      ],
    ])('rejects invalid query ranges (%s)', async (query, expectedMsg) => {
      await expect(service.findAllPublic(query)).rejects.toThrow(
        new BadRequestException(expectedMsg),
      );
    });

    it('finds public course by slug and throws NotFoundException when missing', async () => {
      const found = await service.findCourseBySlug('nestjs-masterclass');
      expect(found.slug).toBe('nestjs-masterclass');

      courseRepo.findBySlug.mockResolvedValueOnce(null);
      await expect(service.findCourseBySlug('missing')).rejects.toThrow(
        new NotFoundException('COURSE NOT FOUND'),
      );
    });

    it('short-circuits findPublicCoursesByIds when ids array is empty', async () => {
      await expect(service.findPublicCoursesByIds([])).resolves.toEqual([]);
      expect(courseRepo.findPublicByIds).not.toHaveBeenCalled();

      const found = await service.findPublicCoursesByIds([courseId]);
      expect(found).toHaveLength(1);
    });
  });

  describe('createDraftCourse', () => {
    const dto = {
      title: 'NestJS Masterclass',
      shortDescription: 'Learn production NestJS APIs',
      level: CourseLevel.BEGINNER,
      categoryIds: [categoryId],
    };

    it('validates categories, creates draft course, and retries on P2002 slug conflict', async () => {
      courseRepo.createDraftCourse
        .mockRejectedValueOnce(makeSlugUniqueError(['slug']))
        .mockResolvedValueOnce(baseCourse);

      const result = await service.createDraftCourse(instructorId, dto);

      expect(courseRepo.createDraftCourse).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(CourseStatus.DRAFT);
      expect(result.deletedAt).toBeUndefined(); // ADMIN-only field
    });

    it('rethrows after exhausting MAX_SLUG_RETRY_ATTEMPTS (3)', async () => {
      courseRepo.createDraftCourse.mockRejectedValue(
        makeSlugUniqueError('courses_slug_key'),
      );

      await expect(
        service.createDraftCourse(instructorId, dto),
      ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect(courseRepo.createDraftCourse).toHaveBeenCalledTimes(3);
    });

    it.each([
      [[], BadRequestException, 'COURSE_REQUIRES_AT_LEAST_ONE_CATEGORY'],
      [[categoryId, categoryId], BadRequestException, 'DUPLICATE_CATEGORY_IDS'],
    ])(
      'rejects invalid categoryIds %p',
      async (categoryIds, ErrorClass, message) => {
        await expect(
          service.createDraftCourse(instructorId, { ...dto, categoryIds }),
        ).rejects.toThrow(new ErrorClass(message));
      },
    );

    it('throws NotFoundException when a category is missing or inactive', async () => {
      categoryRepo.findManyByIds.mockResolvedValueOnce([
        {
          id: categoryId,
          name: 'Backend',
          slug: 'backend',
          order: 1,
          isActive: false,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ]);

      await expect(
        service.createDraftCourse(instructorId, dto),
      ).rejects.toThrow(new NotFoundException('CATEGORY_ID_NOT_FOUND'));
    });

    it('throws BadRequestException when title produces an empty slug', async () => {
      await expect(
        service.createDraftCourse(instructorId, { ...dto, title: '!!!' }),
      ).rejects.toThrow(
        new BadRequestException('COURSE_TITLE_CANNOT_GENERATE_SLUG'),
      );
    });
  });

  describe('updateDraftCourse', () => {
    it.each([CourseStatus.DRAFT, CourseStatus.CHANGES_REQUESTED])(
      'allows updating course in %s status and regenerates slug when title changes',
      async (status) => {
        courseRepo.findById.mockResolvedValue({ ...baseCourse, status });

        await service.updateDraftCourse(instructorId, courseId, {
          title: 'Advanced NestJS',
          categoryIds: [categoryId],
        });

        expect(courseRepo.existsBySlug).toHaveBeenCalledWith(
          'advanced-nestjs',
          courseId,
        );
        expect(courseRepo.updateDraftCourse).toHaveBeenCalledWith(
          courseId,
          expect.objectContaining({
            title: 'Advanced NestJS',
            slug: 'advanced-nestjs',
          }),
        );
      },
    );

    it.each([
      CourseStatus.IN_REVIEW,
      CourseStatus.PUBLISHED,
      CourseStatus.ARCHIVED,
    ])('rejects updating course in %s status', async (status) => {
      courseRepo.findById.mockResolvedValue({ ...baseCourse, status });

      await expect(
        service.updateDraftCourse(instructorId, courseId, { title: 'New' }),
      ).rejects.toThrow(
        new BadRequestException('ONLY_DRAFT_COURSE_CAN_BE_UPDATED'),
      );
    });
  });

  describe('submitDraftCourseForReview & deleteDraftCourse', () => {
    it.each([CourseStatus.DRAFT, CourseStatus.CHANGES_REQUESTED])(
      'submits %s course for review',
      async (status) => {
        courseRepo.findById.mockResolvedValue({ ...baseCourse, status });

        const result = await service.submitDraftCourseForReview(
          instructorId,
          courseId,
        );

        expect(courseRepo.submitForReview).toHaveBeenCalledWith(courseId);
        expect(result.status).toBe(CourseStatus.IN_REVIEW);
      },
    );

    it('throws BadRequestException when submitForReview returns null or status is invalid', async () => {
      courseRepo.findById.mockResolvedValueOnce({
        ...baseCourse,
        status: CourseStatus.PUBLISHED,
      });
      await expect(
        service.submitDraftCourseForReview(instructorId, courseId),
      ).rejects.toThrow(
        new BadRequestException(
          'ONLY_DRAFT_OR_CHANGES_REQUESTED_COURSE_CAN_BE_SUBMITTED_FOR_REVIEW',
        ),
      );

      courseRepo.submitForReview.mockResolvedValueOnce(null);
      await expect(
        service.submitDraftCourseForReview(instructorId, courseId),
      ).rejects.toThrow(
        new BadRequestException(
          'ONLY_DRAFT_OR_CHANGES_REQUESTED_COURSE_CAN_BE_SUBMITTED_FOR_REVIEW',
        ),
      );
    });

    it('deletes DRAFT course and rejects non-DRAFT course deletion', async () => {
      await expect(
        service.deleteDraftCourse(instructorId, courseId),
      ).resolves.toEqual({ message: 'DRAFT_COURSE_DELETED_SUCCESSFULLY' });

      courseRepo.findById.mockResolvedValueOnce({
        ...baseCourse,
        status: CourseStatus.CHANGES_REQUESTED,
      });
      await expect(
        service.deleteDraftCourse(instructorId, courseId),
      ).rejects.toThrow(
        new BadRequestException('ONLY_DRAFT_COURSE_CAN_BE_DELETED'),
      );
    });

    it('propagates ownership failure from CourseAccessService', async () => {
      courseAccessService.ensureInstructorCanManageCourse.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.deleteDraftCourse(instructorId, courseId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findInstructorCourses & canEditCourse', () => {
    it('scopes query to instructorId and returns paginated instructor DTOs', async () => {
      const result = await service.findInstructorCourses(instructorId, {
        status: CourseStatus.DRAFT,
        page: 1,
        limit: 10,
      });

      expect(courseRepo.findMany).toHaveBeenCalledWith({
        where: {
          status: CourseStatus.DRAFT,
          instructorId,
        },
        orderBy: { field: 'createdAt', direction: 'desc' },
        limit: 10,
        offset: 0,
      });
      expect(result.data).toHaveLength(1);
    });

    it('delegates canEditCourse to repository', async () => {
      await expect(service.canEditCourse(courseId)).resolves.toBe(true);
      expect(courseRepo.canEdit).toHaveBeenCalledWith(courseId);
    });
  });
});
