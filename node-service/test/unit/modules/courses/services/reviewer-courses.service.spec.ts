jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

jest.mock(
  'src/features/skill/dtos/skill-response.dto',
  () => ({
    SkillResponseDto: class SkillResponseDto {},
  }),
  { virtual: true },
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
  MediaTypeEnum,
} from 'generated/prisma/enums';
import {
  AvailableReviewerCourseSortField,
  ReviewerCourseSortField,
  SortDirection,
} from '../../../../../src/features/courses/dtos/course/reviewer-course-query.dto';
import type {
  AvailableReviewCourseModel,
  CourseReviewCourseModel,
  CourseReviewDecisionModel,
  CourseReviewWorkspaceModel,
  ICourseReviewRepository,
} from '../../../../../src/features/courses/interfaces/course-review.repository.interface';
import { ReviewerCoursesService } from '../../../../../src/features/courses/services/reviewer-courses.service';

describe('ReviewerCoursesService', () => {
  let reviewRepo: jest.Mocked<ICourseReviewRepository>;
  let service: ReviewerCoursesService;

  const reviewerId = 'reviewer-1';
  const courseId = 'course-1';
  const reviewId = 'review-1';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const availableCourse: AvailableReviewCourseModel = {
    id: courseId,
    title: 'NestJS Masterclass',
    slug: 'nestjs-masterclass',
    shortDescription: 'Production NestJS',
    level: CourseLevel.BEGINNER,
    certificateEnabled: true,
    status: CourseStatus.IN_REVIEW,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const reviewableCourse: CourseReviewCourseModel = {
    reviewId,
    reviewStatus: CourseReviewStatus.PENDING,
    reviewNote: null,
    submittedAt: now,
    reviewedAt: null,
    course: availableCourse,
  };

  const workspaceModel: CourseReviewWorkspaceModel = {
    ...reviewableCourse,
    isReviewerAuthorized: true,
    course: {
      ...availableCourse,
      categories: [{ id: 'cat-1', name: 'Backend', slug: 'backend' }],
      instructors: [{ id: 'inst-1', fullName: 'Jane Doe' }],
      sections: [
        {
          id: 'sec-1',
          courseId,
          title: 'Intro',
          description: null,
          sectionIndex: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          lessons: [
            {
              id: 'les-1',
              sectionId: 'sec-1',
              title: 'Lesson 1',
              description: null,
              lessonIndex: 0,
              skills: [],
              isActive: true,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              files: [
                {
                  id: 'file-1',
                  lessonId: 'les-1',
                  cloudinaryPublicId: 'vid-1',
                  url: 'https://cdn.example.com/vid.mp4',
                  type: MediaTypeEnum.VIDEO,
                  filename: 'vid.mp4',
                  mimeType: 'video/mp4',
                  sizeInBytes: 1024,
                  createdAt: now,
                  updatedAt: now,
                  deletedAt: null,
                },
              ],
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    reviewRepo = {
      findAvailableCourses: jest.fn().mockResolvedValue([availableCourse]),
      countAvailableCourses: jest.fn().mockResolvedValue(1),
      claimCourseForReview: jest.fn().mockResolvedValue({
        status: 'claimed',
        data: {
          reviewId,
          reviewStatus: CourseReviewStatus.PENDING,
          submittedAt: now,
          course: {
            id: courseId,
            status: CourseStatus.IN_REVIEW,
            reviewClaimedById: reviewerId,
            reviewClaimedAt: now,
          },
        },
      }),
      findReviewableCourses: jest.fn().mockResolvedValue([reviewableCourse]),
      countReviewableCourses: jest.fn().mockResolvedValue(1),
      findReviewWorkspace: jest.fn().mockResolvedValue(workspaceModel),
      submitReviewDecision: jest.fn().mockResolvedValue({
        reviewId,
        reviewStatus: CourseReviewStatus.APPROVED,
        reviewNote: null,
        submittedAt: now,
        reviewedAt: now,
        course: {
          id: courseId,
          status: CourseStatus.PUBLISHED,
          publishedAt: now,
          updatedAt: now,
        },
      } satisfies CourseReviewDecisionModel),
      findLatestCompletedReviewByCourseId: jest.fn(),
      findMyChangedRequest: jest.fn(),
    };

    service = new ReviewerCoursesService(reviewRepo);
  });

  describe('findAvailableCourses', () => {
    it('queries available courses with defaults and serializes with REVIEWER group', async () => {
      const result = await service.findAvailableCourses(reviewerId, {
        search: 'nestjs',
      });

      expect(reviewRepo.findAvailableCourses).toHaveBeenCalledWith({
        reviewerId,
        search: 'nestjs',
        level: undefined,
        categoryId: undefined,
        limit: 10,
        offset: 0,
        sortField: AvailableReviewerCourseSortField.UPDATED_AT,
        sortDirection: SortDirection.DESC,
      });
      expect(result.data[0].status).toBe(CourseStatus.IN_REVIEW);
      expect(result.data[0].deletedAt).toBeUndefined(); // ADMIN-only field
    });
  });

  describe('claimCourseForReview', () => {
    it('returns ClaimCourseReviewResponseDto when claimed', async () => {
      const result = await service.claimCourseForReview(reviewerId, courseId);

      expect(reviewRepo.claimCourseForReview).toHaveBeenCalledWith(
        reviewerId,
        courseId,
      );
      expect(result.reviewId).toBe(reviewId);
      expect(result.course.reviewClaimedById).toBe(reviewerId);
    });

    it('throws NotFoundException when course is not available for review', async () => {
      reviewRepo.claimCourseForReview.mockResolvedValue({
        status: 'not_found',
      });

      await expect(
        service.claimCourseForReview(reviewerId, courseId),
      ).rejects.toThrow(
        new NotFoundException('COURSE_NOT_AVAILABLE_FOR_REVIEW'),
      );
    });

    it('throws ConflictException when course is already claimed', async () => {
      reviewRepo.claimCourseForReview.mockResolvedValue({
        status: 'already_claimed',
      });

      await expect(
        service.claimCourseForReview(reviewerId, courseId),
      ).rejects.toThrow(
        new ConflictException('COURSE_ALREADY_CLAIMED_FOR_REVIEW'),
      );
    });
  });

  describe('findReviewableCourses', () => {
    it('defaults reviewStatus to PENDING and status to IN_REVIEW', async () => {
      const result = await service.findReviewableCourses(reviewerId, {});

      expect(reviewRepo.findReviewableCourses).toHaveBeenCalledWith({
        reviewerId,
        search: undefined,
        level: undefined,
        status: CourseStatus.IN_REVIEW,
        categoryId: undefined,
        reviewStatus: CourseReviewStatus.PENDING,
        limit: 10,
        offset: 0,
        sortField: ReviewerCourseSortField.SUBMITTED_AT,
        sortDirection: SortDirection.DESC,
      });
      expect(result.data[0].reviewId).toBe(reviewId);
      expect(result.data[0].course.id).toBe(courseId);
    });
  });

  describe('getReviewWorkspace', () => {
    it('returns full course review workspace when reviewer is authorized', async () => {
      const result = await service.getReviewWorkspace(reviewerId, reviewId);

      expect(result.reviewId).toBe(reviewId);
      expect(result.course.sections).toHaveLength(1);
      expect(result.course.sections[0].lessons[0].files).toHaveLength(1);
      expect(result).not.toHaveProperty('isReviewerAuthorized');
    });

    it('throws NotFoundException when review task is not found', async () => {
      reviewRepo.findReviewWorkspace.mockResolvedValue(null);

      await expect(
        service.getReviewWorkspace(reviewerId, reviewId),
      ).rejects.toThrow(new NotFoundException('REVIEW_TASK_NOT_FOUND'));
    });

    it('throws ForbiddenException when reviewer is not authorized for course category', async () => {
      reviewRepo.findReviewWorkspace.mockResolvedValue({
        ...workspaceModel,
        isReviewerAuthorized: false,
      });

      await expect(
        service.getReviewWorkspace(reviewerId, reviewId),
      ).rejects.toThrow(
        new ForbiddenException('REVIEWER_NOT_AUTHORIZED_FOR_COURSE_CATEGORY'),
      );
    });
  });

  describe('submitReviewDecision', () => {
    it.each([
      [CourseReviewStatus.APPROVED, '   ', null, CourseStatus.PUBLISHED],
      [
        CourseReviewStatus.CHANGES_REQUESTED,
        '  Improve audio in lesson 1  ',
        'Improve audio in lesson 1',
        CourseStatus.CHANGES_REQUESTED,
      ],
      [
        CourseReviewStatus.REJECTED,
        'Violates content policy',
        'Violates content policy',
        CourseStatus.ARCHIVED,
      ],
    ] as const)(
      'maps decision %s to courseStatus %s with normalized reviewNote',
      async (decisionStatus, rawNote, expectedNote, expectedCourseStatus) => {
        reviewRepo.submitReviewDecision.mockResolvedValue({
          reviewId,
          reviewStatus: decisionStatus,
          reviewNote: expectedNote,
          submittedAt: now,
          reviewedAt: now,
          course: {
            id: courseId,
            status: expectedCourseStatus,
            publishedAt:
              expectedCourseStatus === CourseStatus.PUBLISHED ? now : null,
            updatedAt: now,
          },
        });

        const result = await service.submitReviewDecision(
          reviewerId,
          reviewId,
          {
            status: decisionStatus,
            reviewNote: rawNote,
          },
        );

        expect(reviewRepo.submitReviewDecision).toHaveBeenCalledWith({
          reviewerId,
          reviewId,
          reviewStatus: decisionStatus,
          reviewNote: expectedNote,
          courseStatus: expectedCourseStatus,
        });
        expect(result.reviewStatus).toBe(decisionStatus);
        expect(result.course.status).toBe(expectedCourseStatus);
      },
    );

    it.each([
      CourseReviewStatus.CHANGES_REQUESTED,
      CourseReviewStatus.REJECTED,
    ] as const)(
      'throws BadRequestException REVIEW_NOTE_REQUIRED when %s has blank/missing note',
      async (decisionStatus) => {
        await expect(
          service.submitReviewDecision(reviewerId, reviewId, {
            status: decisionStatus,
            reviewNote: '   ',
          }),
        ).rejects.toThrow(new BadRequestException('REVIEW_NOTE_REQUIRED'));
        expect(reviewRepo.submitReviewDecision).not.toHaveBeenCalled();
      },
    );

    it('throws BadRequestException REVIEW_TASK_NOT_PENDING when review is already decided', async () => {
      reviewRepo.findReviewWorkspace.mockResolvedValue({
        ...workspaceModel,
        reviewStatus: CourseReviewStatus.APPROVED,
      });

      await expect(
        service.submitReviewDecision(reviewerId, reviewId, {
          status: CourseReviewStatus.APPROVED,
        }),
      ).rejects.toThrow(new BadRequestException('REVIEW_TASK_NOT_PENDING'));
    });

    it('throws ForbiddenException when reviewer is unauthorized', async () => {
      reviewRepo.findReviewWorkspace.mockResolvedValue({
        ...workspaceModel,
        isReviewerAuthorized: false,
      });

      await expect(
        service.submitReviewDecision(reviewerId, reviewId, {
          status: CourseReviewStatus.APPROVED,
        }),
      ).rejects.toThrow(
        new ForbiddenException('REVIEWER_NOT_AUTHORIZED_FOR_COURSE_CATEGORY'),
      );
    });

    it('throws NotFoundException when workspace or atomic submitReviewDecision returns null', async () => {
      reviewRepo.submitReviewDecision.mockResolvedValueOnce(null);
      await expect(
        service.submitReviewDecision(reviewerId, reviewId, {
          status: CourseReviewStatus.APPROVED,
        }),
      ).rejects.toThrow(new NotFoundException('REVIEW_TASK_NOT_FOUND'));

      reviewRepo.findReviewWorkspace.mockResolvedValueOnce(null);
      await expect(
        service.submitReviewDecision(reviewerId, reviewId, {
          status: CourseReviewStatus.APPROVED,
        }),
      ).rejects.toThrow(new NotFoundException('REVIEW_TASK_NOT_FOUND'));
    });
  });
});
