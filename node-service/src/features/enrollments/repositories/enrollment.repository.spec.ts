jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
    },
  }),
  { virtual: true },
);

jest.mock(
  'generated/prisma/enums',
  () => ({
    CourseLevel: {
      BEGINNER: 'BEGINNER',
      INTERMEDIATE: 'INTERMEDIATE',
      ADVANCE: 'ADVANCE',
      ALL_LEVELS: 'ALL_LEVELS',
    },
    CourseStatus: {
      PUBLISHED: 'PUBLISHED',
    },
    EnrollmentStatus: {
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
    },
    PaymentStatus: {
      PAID: 'PAID',
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

import { CourseLevel, EnrollmentStatus } from 'generated/prisma/enums';
import { EnrollmentRepository } from './enrollment.repository';

type PrismaServiceMock = {
  enrollment: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
};

const userId = '11111111-1111-4111-8111-111111111111';

describe('EnrollmentRepository', () => {
  let repository: EnrollmentRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      enrollment: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    repository = new EnrollmentRepository(
      prisma as unknown as ConstructorParameters<typeof EnrollmentRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findManyByUser applies filters, sorting, and pagination', async () => {
    prisma.enrollment.findMany.mockResolvedValue([]);

    await repository.findManyByUser({
      userId,
      limit: 9,
      offset: 18,
      level: CourseLevel.BEGINNER,
      progress: 'in-progress',
      search: 'nestjs',
      sortField: 'title',
      sortDirection: 'asc',
      status: EnrollmentStatus.ACTIVE,
    });

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 18,
        take: 9,
        orderBy: {
          course: {
            title: 'asc',
          },
        },
        where: {
          userId,
          isActive: true,
          deletedAt: null,
          status: EnrollmentStatus.ACTIVE,
          progressPercentage: {
            gt: 0,
            lt: 100,
          },
          course: {
            AND: [
              {
                level: CourseLevel.BEGINNER,
              },
              {
                OR: [
                  {
                    title: {
                      contains: 'nestjs',
                    },
                  },
                  {
                    shortDescription: {
                      contains: 'nestjs',
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    );
  });

  it('countByUser applies the same filters without pagination or sorting', async () => {
    prisma.enrollment.count.mockResolvedValue(3);

    await expect(
      repository.countByUser({
        userId,
        progress: 'completed',
        search: 'api',
        status: EnrollmentStatus.COMPLETED,
      }),
    ).resolves.toBe(3);

    expect(prisma.enrollment.count).toHaveBeenCalledWith({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        status: EnrollmentStatus.COMPLETED,
        progressPercentage: {
          gte: 100,
        },
        course: {
          OR: [
            {
              title: {
                contains: 'api',
              },
            },
            {
              shortDescription: {
                contains: 'api',
              },
            },
          ],
        },
      },
    });
  });

  it('defaults sorting to newest enrollments', async () => {
    prisma.enrollment.findMany.mockResolvedValue([]);

    await repository.findManyByUser({
      userId,
      limit: 9,
      offset: 0,
    });

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          enrolledAt: 'desc',
        },
      }),
    );
  });
});
