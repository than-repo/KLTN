jest.mock(
  'generated/prisma/enums',
  () => ({
    CourseLevel: {
      BEGINNER: 'BEGINNER',
    },
    EnrollmentStatus: {
      ACTIVE: 'ACTIVE',
    },
    MediaTypeEnum: {
      AUDIO: 'AUDIO',
      DOCUMENT: 'DOCUMENT',
      IMAGE: 'IMAGE',
      OTHER: 'OTHER',
      VIDEO: 'VIDEO',
    },
    PaymentMethod: {
      SIMULATION: 'SIMULATION',
      VNPAY: 'VNPAY',
    },
    PaymentStatus: {
      PAID: 'PAID',
    },
  }),
  { virtual: true },
);

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import type { ILearningCourseV2Repository } from '../interfaces/learning-course-v2.repository.interface';
import { LEARNING_COURSE_V2_REPOSITORY } from '../repositories/learning-course-v2.repository.token';
import { LearningCoursesV2Service } from './learning-courses-v2.service';

type LearningCourseV2RepositoryMock = jest.Mocked<ILearningCourseV2Repository>;

const learnerId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const sectionId = '33333333-3333-4333-8333-333333333333';
const lessonId = '44444444-4444-4444-8444-444444444444';

describe('LearningCoursesV2Service', () => {
  let service: LearningCoursesV2Service;
  let learningCourseRepository: LearningCourseV2RepositoryMock;
  let enrollmentsService: jest.Mocked<
    Pick<EnrollmentsService, 'findByCourseIdAndUserId'>
  >;

  beforeEach(async () => {
    learningCourseRepository = {
      existsCourseForLearning: jest.fn(),
      existsSectionForLearning: jest.fn(),
      findCourseOverview: jest.fn(),
      findSections: jest.fn(),
      findLessons: jest.fn(),
      findLessonDetail: jest.fn(),
    };
    enrollmentsService = {
      findByCourseIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningCoursesV2Service,
        {
          provide: LEARNING_COURSE_V2_REPOSITORY,
          useValue: learningCourseRepository,
        },
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    service = module.get(LearningCoursesV2Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('denies learners without a current enrollment', async () => {
    enrollmentsService.findByCourseIdAndUserId.mockResolvedValue(null);

    await expect(
      service.getCourseOverview(learnerId, courseId),
    ).rejects.toThrow(ForbiddenException);
    expect(learningCourseRepository.findCourseOverview).not.toHaveBeenCalled();
  });

  it('returns a lightweight course overview with learner progress', async () => {
    enrollmentsService.findByCourseIdAndUserId.mockResolvedValue(
      makeEnrollment(37),
    );
    learningCourseRepository.findCourseOverview.mockResolvedValue({
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      contentSummary: {
        sectionCount: 4,
        lessonCount: 42,
      },
    });

    await expect(
      service.getCourseOverview(learnerId, courseId),
    ).resolves.toEqual({
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      progressPercentage: 37,
      contentSummary: {
        sectionCount: 4,
        lessonCount: 42,
      },
    });
  });

  it('returns paginated sections and clamps large limits', async () => {
    enrollmentsService.findByCourseIdAndUserId.mockResolvedValue(
      makeEnrollment(),
    );
    learningCourseRepository.existsCourseForLearning.mockResolvedValue(true);
    learningCourseRepository.findSections.mockResolvedValue({
      data: [
        {
          id: sectionId,
          title: 'Getting started',
          description: null,
          sectionIndex: 0,
          lessonCount: 12,
        },
      ],
      total: 51,
    });

    const result = await service.getSections(learnerId, courseId, {
      page: 2,
      limit: 200,
    });

    expect(learningCourseRepository.findSections).toHaveBeenCalledWith(
      courseId,
      {
        page: 2,
        limit: 50,
        offset: 50,
      },
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 50,
      total: 51,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('throws not found before listing lessons for an invalid section', async () => {
    enrollmentsService.findByCourseIdAndUserId.mockResolvedValue(
      makeEnrollment(),
    );
    learningCourseRepository.existsSectionForLearning.mockResolvedValue(false);

    await expect(
      service.getLessons(learnerId, courseId, sectionId, {}),
    ).rejects.toThrow(NotFoundException);
    expect(learningCourseRepository.findLessons).not.toHaveBeenCalled();
  });

  it('returns one lesson detail with files on demand', async () => {
    enrollmentsService.findByCourseIdAndUserId.mockResolvedValue(
      makeEnrollment(),
    );
    learningCourseRepository.findLessonDetail.mockResolvedValue({
      id: lessonId,
      title: 'Introduction',
      description: 'Course introduction.',
      lessonIndex: 0,
      files: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          url: 'https://example.com/intro.mp4',
          type: 'VIDEO',
        },
      ],
    });

    await expect(
      service.getLessonDetail(learnerId, courseId, lessonId),
    ).resolves.toEqual({
      id: lessonId,
      title: 'Introduction',
      description: 'Course introduction.',
      lessonIndex: 0,
      files: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          url: 'https://example.com/intro.mp4',
          type: 'VIDEO',
        },
      ],
    });
  });
});

function makeEnrollment(progressPercentage = 0) {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    courseId,
    status: 'ACTIVE',
    progressPercentage,
    enrolledAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  } as Awaited<ReturnType<EnrollmentsService['findByCourseIdAndUserId']>>;
}
