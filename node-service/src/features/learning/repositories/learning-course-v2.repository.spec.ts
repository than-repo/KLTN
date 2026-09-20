jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {},
  }),
  { virtual: true },
);

jest.mock(
  'generated/prisma/enums',
  () => ({
    CourseStatus: {
      PUBLISHED: 'PUBLISHED',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/core/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import { CourseStatus } from 'generated/prisma/enums';
import { LearningCourseV2Repository } from './learning-course-v2.repository';

type PrismaServiceMock = {
  $transaction: jest.Mock;
  course: {
    count: jest.Mock;
    findFirst: jest.Mock;
  };
  courseSection: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  lesson: {
    count: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

const courseId = '22222222-2222-4222-8222-222222222222';
const sectionId = '33333333-3333-4333-8333-333333333333';
const lessonId = '44444444-4444-4444-8444-444444444444';

describe('LearningCourseV2Repository', () => {
  let repository: LearningCourseV2Repository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
      course: {
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      courseSection: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      lesson: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    repository = new LearningCourseV2Repository(
      prisma as unknown as ConstructorParameters<
        typeof LearningCourseV2Repository
      >[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a course overview without loading nested content', async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
    });
    prisma.courseSection.count.mockResolvedValue(3);
    prisma.lesson.count.mockResolvedValue(21);

    await expect(repository.findCourseOverview(courseId)).resolves.toEqual({
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      contentSummary: {
        sectionCount: 3,
        lessonCount: 21,
      },
    });
    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: {
        id: courseId,
        deletedAt: null,
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      select: expect.objectContaining({
        id: true,
        title: true,
      }),
    });
  });

  it('paginates sections and counts active lessons per section', async () => {
    prisma.courseSection.findMany.mockResolvedValue([
      {
        id: sectionId,
        title: 'Getting started',
        description: null,
        sectionIndex: 0,
        _count: {
          lessons: 12,
        },
      },
    ]);
    prisma.courseSection.count.mockResolvedValue(11);

    await expect(
      repository.findSections(courseId, { offset: 20, limit: 10 }),
    ).resolves.toEqual({
      data: [
        {
          id: sectionId,
          title: 'Getting started',
          description: null,
          sectionIndex: 0,
          lessonCount: 12,
        },
      ],
      total: 11,
    });
    expect(prisma.courseSection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: {
          sectionIndex: 'asc',
        },
        where: expect.objectContaining({
          courseId,
          isActive: true,
          deletedAt: null,
          course: expect.objectContaining({
            status: CourseStatus.PUBLISHED,
          }),
        }),
      }),
    );
  });

  it('paginates lessons within an active section and counts files', async () => {
    prisma.lesson.findMany.mockResolvedValue([
      {
        id: lessonId,
        title: 'Introduction',
        description: null,
        lessonIndex: 0,
        _count: {
          files: 2,
        },
      },
    ]);
    prisma.lesson.count.mockResolvedValue(7);

    await expect(
      repository.findLessons(courseId, sectionId, { offset: 0, limit: 20 }),
    ).resolves.toEqual({
      data: [
        {
          id: lessonId,
          title: 'Introduction',
          description: null,
          lessonIndex: 0,
          fileCount: 2,
        },
      ],
      total: 7,
    });
    expect(prisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: expect.objectContaining({
          sectionId,
          isActive: true,
          deletedAt: null,
          section: expect.objectContaining({
            courseId,
          }),
        }),
      }),
    );
  });

  it('returns lesson detail with files only for lessons in the course', async () => {
    prisma.lesson.findFirst.mockResolvedValue({
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
      repository.findLessonDetail(courseId, lessonId),
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
    expect(prisma.lesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: lessonId,
          section: expect.objectContaining({
            courseId,
          }),
        }),
      }),
    );
  });
});
