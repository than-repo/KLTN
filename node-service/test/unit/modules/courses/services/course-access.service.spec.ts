import { NotFoundException } from '@nestjs/common';
import type { ICourseSectionRepository } from '../../../../../src/features/courses/interfaces/course-section.repository.interface';
import type { ICourseRepository } from '../../../../../src/features/courses/interfaces/course.repository.interface';
import type { ILessonRepository } from '../../../../../src/features/courses/interfaces/lesson.repository.interface';
import { CourseAccessService } from '../../../../../src/features/courses/services/course-access.service';

describe('CourseAccessService', () => {
  let courseRepo: jest.Mocked<
    Pick<ICourseRepository, 'existsOwnedByInstructor'>
  >;
  let sectionRepo: jest.Mocked<
    Pick<ICourseSectionRepository, 'existsInCourse'>
  >;
  let lessonRepo: jest.Mocked<Pick<ILessonRepository, 'existsInSection'>>;
  let service: CourseAccessService;

  const courseId = 'course-1';
  const instructorId = 'instructor-1';
  const sectionId = 'section-1';
  const lessonId = 'lesson-1';

  beforeEach(() => {
    courseRepo = {
      existsOwnedByInstructor: jest.fn().mockResolvedValue(true),
    };
    sectionRepo = {
      existsInCourse: jest.fn().mockResolvedValue(true),
    };
    lessonRepo = {
      existsInSection: jest.fn().mockResolvedValue(true),
    };

    service = new CourseAccessService(
      courseRepo as unknown as ICourseRepository,
      sectionRepo as unknown as ICourseSectionRepository,
      lessonRepo as unknown as ILessonRepository,
    );
  });

  describe('ensureInstructorCanManageCourse', () => {
    it('resolves when instructor owns the course', async () => {
      await expect(
        service.ensureInstructorCanManageCourse(courseId, instructorId),
      ).resolves.toBeUndefined();
      expect(courseRepo.existsOwnedByInstructor).toHaveBeenCalledWith(
        courseId,
        instructorId,
      );
    });

    it('throws NotFoundException COURSE NOT FOUND when instructor does not own course', async () => {
      courseRepo.existsOwnedByInstructor.mockResolvedValue(false);

      await expect(
        service.ensureInstructorCanManageCourse(courseId, instructorId),
      ).rejects.toThrow(new NotFoundException('COURSE NOT FOUND'));
    });
  });

  describe('ensureInstructorCanManageSection', () => {
    it('resolves when instructor owns course and section belongs to course', async () => {
      await expect(
        service.ensureInstructorCanManageSection(
          courseId,
          instructorId,
          sectionId,
        ),
      ).resolves.toBeUndefined();
      expect(sectionRepo.existsInCourse).toHaveBeenCalledWith(
        sectionId,
        courseId,
      );
    });

    it('short-circuits before checking section when course ownership fails', async () => {
      courseRepo.existsOwnedByInstructor.mockResolvedValue(false);

      await expect(
        service.ensureInstructorCanManageSection(
          courseId,
          instructorId,
          sectionId,
        ),
      ).rejects.toThrow(new NotFoundException('COURSE NOT FOUND'));
      expect(sectionRepo.existsInCourse).not.toHaveBeenCalled();
    });

    it('throws NotFoundException SECTION NOT FOUND when section is not in course', async () => {
      sectionRepo.existsInCourse.mockResolvedValue(false);

      await expect(
        service.ensureInstructorCanManageSection(
          courseId,
          instructorId,
          sectionId,
        ),
      ).rejects.toThrow(new NotFoundException('SECTION NOT FOUND'));
    });
  });

  describe('ensureInstructorCanManageLesson', () => {
    it('resolves when course, section, and lesson hierarchy is valid', async () => {
      await expect(
        service.ensureInstructorCanManageLesson(
          courseId,
          instructorId,
          sectionId,
          lessonId,
        ),
      ).resolves.toBeUndefined();
      expect(lessonRepo.existsInSection).toHaveBeenCalledWith(
        lessonId,
        sectionId,
      );
    });

    it('short-circuits before checking lesson when section check fails', async () => {
      sectionRepo.existsInCourse.mockResolvedValue(false);

      await expect(
        service.ensureInstructorCanManageLesson(
          courseId,
          instructorId,
          sectionId,
          lessonId,
        ),
      ).rejects.toThrow(new NotFoundException('SECTION NOT FOUND'));
      expect(lessonRepo.existsInSection).not.toHaveBeenCalled();
    });

    it('throws NotFoundException LESSON NOT FOUND when lesson is not in section', async () => {
      lessonRepo.existsInSection.mockResolvedValue(false);

      await expect(
        service.ensureInstructorCanManageLesson(
          courseId,
          instructorId,
          sectionId,
          lessonId,
        ),
      ).rejects.toThrow(new NotFoundException('LESSON NOT FOUND'));
    });
  });
});
