jest.mock(
  'generated/prisma/enums',
  () => ({
    MediaTypeEnum: {
      AUDIO: 'AUDIO',
      DOCUMENT: 'DOCUMENT',
      IMAGE: 'IMAGE',
      OTHER: 'OTHER',
      VIDEO: 'VIDEO',
    },
    UserRole: {
      LEARNER: 'LEARNER',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/common/decorators/current-user.decorator',
  () => ({
    CurrentUser: () => () => undefined,
  }),
  { virtual: true },
);

jest.mock(
  'src/features/auth/decorators/roles.decorator',
  () => ({
    Roles: () => () => undefined,
  }),
  { virtual: true },
);

jest.mock(
  'src/features/auth/guards/jwt-auth.guard',
  () => ({
    JwtAuthGuard: class JwtAuthGuard {},
  }),
  { virtual: true },
);

jest.mock(
  'src/features/auth/guards/roles.guard',
  () => ({
    RolesGuard: class RolesGuard {},
  }),
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import { LearningCoursesV2Service } from '../services/learning-courses-v2.service';
import { LearnerCoursesV2Controller } from './learning-courses-v2.controller';

const learnerId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const sectionId = '33333333-3333-4333-8333-333333333333';
const lessonId = '44444444-4444-4444-8444-444444444444';

describe('LearnerCoursesV2Controller', () => {
  let controller: LearnerCoursesV2Controller;
  let learningCoursesV2Service: jest.Mocked<
    Pick<
      LearningCoursesV2Service,
      'getCourseOverview' | 'getSections' | 'getLessons' | 'getLessonDetail'
    >
  >;

  beforeEach(async () => {
    learningCoursesV2Service = {
      getCourseOverview: jest.fn(),
      getSections: jest.fn(),
      getLessons: jest.fn(),
      getLessonDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearnerCoursesV2Controller],
      providers: [
        {
          provide: LearningCoursesV2Service,
          useValue: learningCoursesV2Service,
        },
      ],
    }).compile();

    controller = module.get(LearnerCoursesV2Controller);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates course overview requests to the service', async () => {
    const response = {
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      progressPercentage: 0,
      contentSummary: {
        sectionCount: 0,
        lessonCount: 0,
      },
    };
    learningCoursesV2Service.getCourseOverview.mockResolvedValue(response);

    await expect(
      controller.getCourseOverview(learnerId, courseId),
    ).resolves.toBe(response);
    expect(learningCoursesV2Service.getCourseOverview).toHaveBeenCalledWith(
      learnerId,
      courseId,
    );
  });

  it('delegates section pagination requests to the service', async () => {
    const query = { page: 2, limit: 20 };
    const response = {
      data: [],
      meta: {
        page: 2,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    learningCoursesV2Service.getSections.mockResolvedValue(response);

    await expect(
      controller.getSections(learnerId, courseId, query),
    ).resolves.toBe(response);
    expect(learningCoursesV2Service.getSections).toHaveBeenCalledWith(
      learnerId,
      courseId,
      query,
    );
  });

  it('delegates section lesson pagination requests to the service', async () => {
    const query = { page: 1, limit: 10 };
    const response = {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    learningCoursesV2Service.getLessons.mockResolvedValue(response);

    await expect(
      controller.getLessons(learnerId, courseId, sectionId, query),
    ).resolves.toBe(response);
    expect(learningCoursesV2Service.getLessons).toHaveBeenCalledWith(
      learnerId,
      courseId,
      sectionId,
      query,
    );
  });

  it('delegates lesson detail requests to the service', async () => {
    const response = {
      id: lessonId,
      title: 'Introduction',
      description: null,
      lessonIndex: 0,
      files: [],
    };
    learningCoursesV2Service.getLessonDetail.mockResolvedValue(response);

    await expect(
      controller.getLessonDetail(learnerId, courseId, lessonId),
    ).resolves.toBe(response);
    expect(learningCoursesV2Service.getLessonDetail).toHaveBeenCalledWith(
      learnerId,
      courseId,
      lessonId,
    );
  });
});
