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

jest.mock(
  'src/features/skill/services/skill.service',
  () => ({
    SkillService: class SkillService {},
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Difficulty } from 'generated/prisma/enums';
import {
  InvalidLessonOrderError,
  type ILessonRepository,
  type Lesson,
} from '../../../../../src/features/courses/interfaces/lesson.repository.interface';
import type { CourseAccessService } from '../../../../../src/features/courses/services/course-access.service';
import type { CoursesService } from '../../../../../src/features/courses/services/courses.service';
import { LessonsService } from '../../../../../src/features/courses/services/lessons.service';
import type { SkillService } from 'src/features/skill/services/skill.service';

describe('LessonsService', () => {
  let lessonRepo: jest.Mocked<ILessonRepository>;
  let courseAccessService: jest.Mocked<
    Pick<
      CourseAccessService,
      'ensureInstructorCanManageSection' | 'ensureInstructorCanManageLesson'
    >
  >;
  let skillService: jest.Mocked<
    Pick<SkillService, 'verifySkillsBelongToCourse'>
  >;
  let coursesService: jest.Mocked<Pick<CoursesService, 'canEditCourse'>>;
  let service: LessonsService;

  const courseId = 'course-1';
  const sectionId = 'section-1';
  const lessonId = 'lesson-1';
  const instructorId = 'instructor-1';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const baseLesson: Lesson = {
    id: lessonId,
    sectionId,
    title: 'Introduction to HTML',
    description: 'Basic HTML structure',
    lessonIndex: 0,
    isActive: true,
    skills: [
      {
        id: 'skill-1',
        canonicalName: 'HTML5',
        description: null,
        aliases: ['html'],
        parentId: null,
        level: 1,
        difficulty: Difficulty.EASY,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(() => {
    lessonRepo = {
      create: jest.fn(),
      createAtEnd: jest.fn().mockResolvedValue(baseLesson),
      findById: jest.fn().mockResolvedValue(baseLesson),
      findByIdIncludingDeleted: jest.fn(),
      update: jest.fn(),
      updateInSection: jest.fn().mockResolvedValue(baseLesson),
      restore: jest.fn(),
      changeActive: jest.fn(),
      findMany: jest.fn().mockResolvedValue([baseLesson]),
      count: jest.fn().mockResolvedValue(1),
      findBySectionId: jest.fn().mockResolvedValue([baseLesson]),
      existsInSection: jest.fn(),
      getNextLessonIndex: jest.fn(),
      reorderLessons: jest.fn().mockResolvedValue([baseLesson]),
      softDeleteAndShift: jest.fn().mockResolvedValue(undefined),
    };

    courseAccessService = {
      ensureInstructorCanManageSection: jest.fn().mockResolvedValue(undefined),
      ensureInstructorCanManageLesson: jest.fn().mockResolvedValue(undefined),
    };

    skillService = {
      verifySkillsBelongToCourse: jest.fn().mockResolvedValue(true),
    };

    coursesService = {
      canEditCourse: jest.fn().mockResolvedValue(true),
    };

    service = new LessonsService(
      lessonRepo,
      courseAccessService as unknown as CourseAccessService,
      skillService as unknown as SkillService,
      coursesService as unknown as CoursesService,
    );
  });

  describe('createLesson', () => {
    it('validates section access and skills, then creates lesson at end', async () => {
      const result = await service.createLesson(
        courseId,
        sectionId,
        instructorId,
        {
          title: 'Introduction to HTML',
          description: 'Basic HTML structure',
          skillIds: ['skill-1'],
        },
      );

      expect(
        courseAccessService.ensureInstructorCanManageSection,
      ).toHaveBeenCalledWith(courseId, instructorId, sectionId);
      expect(skillService.verifySkillsBelongToCourse).toHaveBeenCalledWith(
        courseId,
        ['skill-1'],
      );
      expect(lessonRepo.createAtEnd).toHaveBeenCalledWith({
        sectionId,
        title: 'Introduction to HTML',
        description: 'Basic HTML structure',
        skillIds: ['skill-1'],
      });
      expect(result.id).toBe(lessonId);
      expect(result.sectionId).toBe(sectionId);
    });

    it('skips skill verification when skillIds is undefined and defaults to []', async () => {
      await service.createLesson(courseId, sectionId, instructorId, {
        title: 'Introduction to HTML',
      });

      expect(skillService.verifySkillsBelongToCourse).not.toHaveBeenCalled();
      expect(lessonRepo.createAtEnd).toHaveBeenCalledWith({
        sectionId,
        title: 'Introduction to HTML',
        description: null,
        skillIds: [],
      });
    });

    it('throws BadRequestException when skills do not belong to the course', async () => {
      skillService.verifySkillsBelongToCourse.mockResolvedValue(false);

      await expect(
        service.createLesson(courseId, sectionId, instructorId, {
          title: 'Lesson 1',
          skillIds: ['invalid-skill'],
        }),
      ).rejects.toThrow(new BadRequestException('Invalid skill ids'));
      expect(lessonRepo.createAtEnd).not.toHaveBeenCalled();
    });

    it('throws ConflictException when createAtEnd returns null due to ordering contention', async () => {
      lessonRepo.createAtEnd.mockResolvedValue(null);

      await expect(
        service.createLesson(courseId, sectionId, instructorId, {
          title: 'Lesson 1',
        }),
      ).rejects.toThrow(
        new ConflictException(
          'Could not create lesson order. Please try again.',
        ),
      );
    });
  });

  describe('updateLesson', () => {
    it('updates lesson when course is editable and valid fields are provided', async () => {
      const updated = {
        ...baseLesson,
        title: 'Updated Title',
        isActive: false,
      };
      lessonRepo.updateInSection.mockResolvedValue(updated);

      const result = await service.updateLesson(
        courseId,
        sectionId,
        lessonId,
        instructorId,
        {
          title: 'Updated Title',
          isActive: false,
          skillIds: ['skill-1'],
        },
      );

      expect(coursesService.canEditCourse).toHaveBeenCalledWith(courseId);
      expect(skillService.verifySkillsBelongToCourse).toHaveBeenCalledWith(
        courseId,
        ['skill-1'],
      );
      expect(lessonRepo.updateInSection).toHaveBeenCalledWith(
        lessonId,
        sectionId,
        {
          title: 'Updated Title',
          isActive: false,
          skillIds: ['skill-1'],
        },
      );
      expect(result.title).toBe('Updated Title');
    });

    it('throws BadRequestException when course cannot be edited', async () => {
      coursesService.canEditCourse.mockResolvedValue(false);

      await expect(
        service.updateLesson(courseId, sectionId, lessonId, instructorId, {
          title: 'New Title',
        }),
      ).rejects.toThrow(new BadRequestException('This course can not edit'));
      expect(lessonRepo.updateInSection).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when skills are invalid', async () => {
      skillService.verifySkillsBelongToCourse.mockResolvedValue(false);

      await expect(
        service.updateLesson(courseId, sectionId, lessonId, instructorId, {
          skillIds: ['bad-skill'],
        }),
      ).rejects.toThrow(new BadRequestException('Invalid skill ids'));
    });

    it('throws BadRequestException when no valid fields are provided', async () => {
      await expect(
        service.updateLesson(courseId, sectionId, lessonId, instructorId, {}),
      ).rejects.toThrow(
        new BadRequestException('No valid lesson fields provided.'),
      );
      expect(lessonRepo.updateInSection).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when updateInSection returns null', async () => {
      lessonRepo.updateInSection.mockResolvedValue(null);

      await expect(
        service.updateLesson(courseId, sectionId, lessonId, instructorId, {
          title: 'Valid Title',
        }),
      ).rejects.toThrow(
        new NotFoundException('Lesson not found in this section.'),
      );
    });
  });

  describe('getLessons', () => {
    it('returns paginated lessons with default lessonIndex ascending order', async () => {
      lessonRepo.count.mockResolvedValue(12);

      const result = await service.getLessons(
        courseId,
        sectionId,
        instructorId,
        {
          search: 'html',
          isActive: true,
          page: 2,
          limit: 5,
        },
      );

      expect(lessonRepo.findMany).toHaveBeenCalledWith({
        where: {
          sectionId,
          titleContains: 'html',
          isActive: true,
        },
        orderBy: { field: 'lessonIndex', direction: 'asc' },
        limit: 5,
        offset: 5,
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('deleteLesson', () => {
    it('soft deletes lesson and shifts subsequent indices', async () => {
      await expect(
        service.deleteLesson(courseId, sectionId, lessonId, instructorId),
      ).resolves.toBeUndefined();

      expect(lessonRepo.softDeleteAndShift).toHaveBeenCalledWith(
        lessonId,
        sectionId,
        0,
      );
    });

    it('throws NotFoundException when lesson is missing or belongs to a different section', async () => {
      lessonRepo.findById.mockResolvedValueOnce(null);
      await expect(
        service.deleteLesson(courseId, sectionId, lessonId, instructorId),
      ).rejects.toThrow(
        new NotFoundException('Lesson not found in this section.'),
      );

      lessonRepo.findById.mockResolvedValueOnce({
        ...baseLesson,
        sectionId: 'other-section',
      });
      await expect(
        service.deleteLesson(courseId, sectionId, lessonId, instructorId),
      ).rejects.toThrow(
        new NotFoundException('Lesson not found in this section.'),
      );
    });

    it('propagates access denial before querying lesson', async () => {
      courseAccessService.ensureInstructorCanManageLesson.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.deleteLesson(courseId, sectionId, lessonId, instructorId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(lessonRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('reorderLessons', () => {
    const l1 = { ...baseLesson, id: 'l-1', lessonIndex: 0 };
    const l2 = { ...baseLesson, id: 'l-2', lessonIndex: 1 };

    it('reorders lessons when all non-deleted section lesson IDs are provided', async () => {
      lessonRepo.findBySectionId.mockResolvedValue([l1, l2]);
      lessonRepo.reorderLessons.mockResolvedValue([
        { ...l2, lessonIndex: 0 },
        { ...l1, lessonIndex: 1 },
      ]);

      const result = await service.reorderLessons(
        courseId,
        sectionId,
        instructorId,
        { lessonIds: ['l-2', 'l-1'] },
      );

      expect(lessonRepo.reorderLessons).toHaveBeenCalledWith(sectionId, [
        'l-2',
        'l-1',
      ]);
      expect(result.map((l) => l.id)).toEqual(['l-2', 'l-1']);
    });

    it('throws NotFoundException when section has no lessons', async () => {
      lessonRepo.findBySectionId.mockResolvedValue([]);

      await expect(
        service.reorderLessons(courseId, sectionId, instructorId, {
          lessonIds: ['l-1'],
        }),
      ).rejects.toThrow(
        new NotFoundException('No lessons found in this section.'),
      );
    });

    it.each([
      [
        ['l-1'],
        'Lesson IDs must include all non-deleted lessons in this section.',
      ],
      [['l-1', 'l-1'], 'Lesson IDs must be unique.'],
      [['l-1', 'l-unknown'], 'Some lesson IDs do not belong to this section.'],
    ])(
      'rejects invalid lessonIds %p with BadRequestException',
      async (lessonIds, expectedMsg) => {
        lessonRepo.findBySectionId.mockResolvedValue([l1, l2]);

        await expect(
          service.reorderLessons(courseId, sectionId, instructorId, {
            lessonIds,
          }),
        ).rejects.toThrow(new BadRequestException(expectedMsg));
      },
    );

    it('translates InvalidLessonOrderError to BadRequestException', async () => {
      lessonRepo.findBySectionId.mockResolvedValue([l1]);
      lessonRepo.reorderLessons.mockRejectedValue(
        new InvalidLessonOrderError(),
      );

      await expect(
        service.reorderLessons(courseId, sectionId, instructorId, {
          lessonIds: ['l-1'],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid lesson order. Some lessons do not belong to this section or were deleted.',
        ),
      );
    });
  });
});
