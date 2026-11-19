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
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidCourseSectionDeleteError,
  InvalidCourseSectionOrderError,
  type CourseSection,
  type ICourseSectionRepository,
} from '../../../../../src/features/courses/interfaces/course-section.repository.interface';
import type { ICourseRepository } from '../../../../../src/features/courses/interfaces/course.repository.interface';
import type { CourseAccessService } from '../../../../../src/features/courses/services/course-access.service';
import { CourseSectionsService } from '../../../../../src/features/courses/services/course-sections.service';

describe('CourseSectionsService', () => {
  let courseAccessService: jest.Mocked<
    Pick<
      CourseAccessService,
      'ensureInstructorCanManageCourse' | 'ensureInstructorCanManageSection'
    >
  >;
  let sectionRepo: jest.Mocked<ICourseSectionRepository>;
  let courseRepo: jest.Mocked<ICourseRepository>;
  let service: CourseSectionsService;

  const courseId = 'course-1';
  const instructorId = 'instructor-1';
  const sectionId = 'section-1';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const baseSection: CourseSection = {
    id: sectionId,
    courseId,
    title: 'Introduction',
    description: 'Course intro',
    sectionIndex: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(() => {
    courseAccessService = {
      ensureInstructorCanManageCourse: jest.fn().mockResolvedValue(undefined),
      ensureInstructorCanManageSection: jest.fn().mockResolvedValue(undefined),
    };

    sectionRepo = {
      create: jest.fn(),
      createAtEnd: jest.fn().mockResolvedValue(baseSection),
      findById: jest.fn().mockResolvedValue(baseSection),
      findByIdIncludingDeleted: jest.fn(),
      update: jest.fn().mockResolvedValue(baseSection),
      softDeleteAndShiftSections: jest.fn().mockResolvedValue(true),
      restore: jest.fn(),
      changeActive: jest.fn().mockResolvedValue(baseSection),
      findMany: jest.fn().mockResolvedValue([baseSection]),
      count: jest.fn().mockResolvedValue(1),
      findByCourseId: jest.fn().mockResolvedValue([baseSection]),
      getNextSectionIndex: jest.fn(),
      existsInCourse: jest.fn(),
      reorderSections: jest.fn().mockResolvedValue([baseSection]),
    };

    courseRepo = {} as jest.Mocked<ICourseRepository>;

    service = new CourseSectionsService(
      courseAccessService as unknown as CourseAccessService,
      sectionRepo,
      courseRepo,
    );
  });

  describe('createSection', () => {
    it('creates a section at the end and serializes with INSTRUCTOR group', async () => {
      const result = await service.createSection(courseId, instructorId, {
        title: 'Introduction',
        description: 'Course intro',
      });

      expect(
        courseAccessService.ensureInstructorCanManageCourse,
      ).toHaveBeenCalledWith(courseId, instructorId);
      expect(sectionRepo.createAtEnd).toHaveBeenCalledWith({
        courseId,
        title: 'Introduction',
        description: 'Course intro',
      });
      expect(result.id).toBe(sectionId);
      expect(result.courseId).toBe(courseId);
    });

    it('throws BadRequestException when createAtEnd returns null', async () => {
      sectionRepo.createAtEnd.mockResolvedValue(null);

      await expect(
        service.createSection(courseId, instructorId, { title: 'Intro' }),
      ).rejects.toThrow(
        new BadRequestException(
          'Could not create section order. Please try again.',
        ),
      );
    });
  });

  describe('updateSection', () => {
    it('throws BadRequestException when dto has no fields before hitting access checks', async () => {
      await expect(
        service.updateSection(courseId, sectionId, instructorId, {}),
      ).rejects.toThrow(
        new BadRequestException('At least one field must be provided.'),
      );
      expect(
        courseAccessService.ensureInstructorCanManageSection,
      ).not.toHaveBeenCalled();
    });

    it('updates section fields when provided', async () => {
      await service.updateSection(courseId, sectionId, instructorId, {
        title: 'Updated Section',
      });

      expect(sectionRepo.update).toHaveBeenCalledWith(sectionId, {
        title: 'Updated Section',
      });
    });
  });

  describe('changeSectionActiveStatus', () => {
    it('updates section active status and throws NotFoundException if missing', async () => {
      sectionRepo.changeActive.mockResolvedValueOnce({
        ...baseSection,
        isActive: false,
      });
      const updated = await service.changeSectionActiveStatus(
        courseId,
        sectionId,
        instructorId,
        { isActive: false },
      );
      expect(updated.isActive).toBe(false);

      sectionRepo.changeActive.mockResolvedValueOnce(null);
      await expect(
        service.changeSectionActiveStatus(courseId, sectionId, instructorId, {
          isActive: true,
        }),
      ).rejects.toThrow(new NotFoundException('Section not found.'));
    });
  });

  describe('deleteSection', () => {
    it('soft deletes section and shifts remaining indices', async () => {
      await expect(
        service.deleteSection(courseId, sectionId, instructorId),
      ).resolves.toEqual({ Message: 'Delete successfully' });

      expect(sectionRepo.softDeleteAndShiftSections).toHaveBeenCalledWith(
        sectionId,
        courseId,
        0,
      );
    });

    it('throws NotFoundException when section does not exist or belongs to another course', async () => {
      sectionRepo.findById.mockResolvedValueOnce(null);
      await expect(
        service.deleteSection(courseId, sectionId, instructorId),
      ).rejects.toThrow(new NotFoundException('Section not found.'));

      sectionRepo.findById.mockResolvedValueOnce({
        ...baseSection,
        courseId: 'other-course',
      });
      await expect(
        service.deleteSection(courseId, sectionId, instructorId),
      ).rejects.toThrow(new NotFoundException('Section not found.'));
    });

    it('translates InvalidCourseSectionDeleteError to ConflictException', async () => {
      sectionRepo.softDeleteAndShiftSections.mockRejectedValue(
        new InvalidCourseSectionDeleteError(),
      );

      await expect(
        service.deleteSection(courseId, sectionId, instructorId),
      ).rejects.toThrow(
        new ConflictException(
          'Could not delete section order. Please try again.',
        ),
      );
    });
  });

  describe('reorderSections', () => {
    const sec1 = { ...baseSection, id: 'sec-1', sectionIndex: 0 };
    const sec2 = { ...baseSection, id: 'sec-2', sectionIndex: 1 };

    it('reorders sections when all active course section IDs match', async () => {
      sectionRepo.findByCourseId.mockResolvedValue([sec1, sec2]);
      sectionRepo.reorderSections.mockResolvedValue([
        { ...sec2, sectionIndex: 0 },
        { ...sec1, sectionIndex: 1 },
      ]);

      const result = await service.reorderSections(courseId, instructorId, {
        sectionIds: ['sec-2', 'sec-1'],
      });

      expect(sectionRepo.reorderSections).toHaveBeenCalledWith(courseId, [
        'sec-2',
        'sec-1',
      ]);
      expect(result.map((s) => s.id)).toEqual(['sec-2', 'sec-1']);
    });

    it('throws BadRequestException when sectionIds count or IDs do not match active sections', async () => {
      sectionRepo.findByCourseId.mockResolvedValue([sec1, sec2]);

      await expect(
        service.reorderSections(courseId, instructorId, {
          sectionIds: ['sec-1'],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid section order. All active sections of the course must be included.',
        ),
      );
    });

    it('translates InvalidCourseSectionOrderError to BadRequestException', async () => {
      sectionRepo.findByCourseId.mockResolvedValue([sec1]);
      sectionRepo.reorderSections.mockRejectedValue(
        new InvalidCourseSectionOrderError(),
      );

      await expect(
        service.reorderSections(courseId, instructorId, {
          sectionIds: ['sec-1'],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid section order. Some sections do not belong to this course or were deleted.',
        ),
      );
    });
  });

  describe('getSections', () => {
    it('returns paginated sections with default sorting by sectionIndex asc', async () => {
      const result = await service.getSections(courseId, instructorId, {
        search: 'intro',
        page: 1,
        limit: 10,
      });

      expect(sectionRepo.findMany).toHaveBeenCalledWith({
        where: {
          courseId,
          titleContains: 'intro',
          isActive: undefined,
          includeDeleted: undefined,
        },
        orderBy: { field: 'sectionIndex', direction: 'asc' },
        limit: 10,
        offset: 0,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
