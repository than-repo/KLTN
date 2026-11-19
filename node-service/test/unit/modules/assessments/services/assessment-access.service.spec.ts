jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  CourseStatus,
  EnrollmentStatus,
} from 'generated/prisma/enums';
import type {
  IAssessmentAccessRepository,
  LearnerAssessmentAccessRecord,
  LearnerCourseAccessRecord,
} from '../../../../../src/features/assessments/interfaces/assessment-access.repository.interface';
import { AssessmentAccessService } from '../../../../../src/features/assessments/services/assessment-access.service';

describe('AssessmentAccessService', () => {
  let repository: jest.Mocked<IAssessmentAccessRepository>;
  let service: AssessmentAccessService;

  const learnerId = 'learner-1';
  const instructorId = 'instructor-1';
  const courseId = 'course-1';
  const assessmentId = 'assessment-1';
  const lessonId = 'lesson-1';
  const questionId = 'question-1';
  const answerId = 'answer-1';

  const validCourseAccess: LearnerCourseAccessRecord = {
    isActive: true,
    deletedAt: null,
    status: EnrollmentStatus.ACTIVE,
    course: {
      isActive: true,
      deletedAt: null,
      status: CourseStatus.PUBLISHED,
    },
  };

  const validAssessmentAccess: LearnerAssessmentAccessRecord = {
    isActive: true,
    deletedAt: null,
    status: AssessmentStatus.PUBLISHED,
  };

  beforeEach(() => {
    repository = {
      findLearnerCourseAccess: jest.fn().mockResolvedValue(validCourseAccess),
      findLearnerAssessmentAccess: jest
        .fn()
        .mockResolvedValue(validAssessmentAccess),
      existsActiveLessonInCourse: jest.fn().mockResolvedValue(true),
      existsCourseByInstructor: jest.fn().mockResolvedValue(true),
      existsAssessmentInCourse: jest.fn().mockResolvedValue(true),
      existsQuestionInAssessment: jest.fn().mockResolvedValue(true),
      existsAnswerInQuestion: jest.fn().mockResolvedValue(true),
    };

    service = new AssessmentAccessService(repository);
  });

  describe('ensureLearnerCanAccessCourse', () => {
    it('resolves when enrollment and course are active and published', async () => {
      await expect(
        service.ensureLearnerCanAccessCourse(learnerId, courseId),
      ).resolves.toBeUndefined();
      expect(repository.findLearnerCourseAccess).toHaveBeenCalledWith(
        learnerId,
        courseId,
      );
    });

    it.each([
      null,
      { ...validCourseAccess, isActive: false },
      { ...validCourseAccess, deletedAt: new Date() },
      { ...validCourseAccess, status: EnrollmentStatus.COMPLETED },
      { ...validCourseAccess, status: EnrollmentStatus.CANCELLED },
      { ...validCourseAccess, status: EnrollmentStatus.EXPIRED },
    ])(
      'throws ForbiddenException for invalid enrollment %p',
      async (record) => {
        repository.findLearnerCourseAccess.mockResolvedValue(record);

        await expect(
          service.ensureLearnerCanAccessCourse(learnerId, courseId),
        ).rejects.toThrow(
          new ForbiddenException(
            'You are not allowed to access assessments for this course.',
          ),
        );
      },
    );

    it.each([
      { ...validCourseAccess.course, isActive: false },
      { ...validCourseAccess.course, deletedAt: new Date() },
      { ...validCourseAccess.course, status: CourseStatus.DRAFT },
      { ...validCourseAccess.course, status: CourseStatus.IN_REVIEW },
      { ...validCourseAccess.course, status: CourseStatus.CHANGES_REQUESTED },
      { ...validCourseAccess.course, status: CourseStatus.ARCHIVED },
    ])(
      'throws ForbiddenException for unavailable course %p',
      async (course) => {
        repository.findLearnerCourseAccess.mockResolvedValue({
          ...validCourseAccess,
          course,
        });

        await expect(
          service.ensureLearnerCanAccessCourse(learnerId, courseId),
        ).rejects.toThrow(
          new ForbiddenException('Course is not available for learning.'),
        );
      },
    );
  });

  describe('ensureLearnerCanAccessAssessment', () => {
    it('resolves for active published assessment when course access is valid', async () => {
      await expect(
        service.ensureLearnerCanAccessAssessment(
          learnerId,
          courseId,
          assessmentId,
        ),
      ).resolves.toBeUndefined();
      expect(repository.findLearnerAssessmentAccess).toHaveBeenCalledWith(
        assessmentId,
        courseId,
      );
    });

    it('short-circuits before assessment lookup if course access fails', async () => {
      repository.findLearnerCourseAccess.mockResolvedValue(null);

      await expect(
        service.ensureLearnerCanAccessAssessment(
          learnerId,
          courseId,
          assessmentId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findLearnerAssessmentAccess).not.toHaveBeenCalled();
    });

    it.each([
      null,
      { ...validAssessmentAccess, isActive: false },
      { ...validAssessmentAccess, deletedAt: new Date() },
    ])('throws NotFoundException when assessment is %p', async (record) => {
      repository.findLearnerAssessmentAccess.mockResolvedValue(record);

      await expect(
        service.ensureLearnerCanAccessAssessment(
          learnerId,
          courseId,
          assessmentId,
        ),
      ).rejects.toThrow(new NotFoundException('Assessment not found.'));
    });

    it.each([AssessmentStatus.DRAFT, AssessmentStatus.ARCHIVED])(
      'throws ForbiddenException for %s assessment by default',
      async (status) => {
        repository.findLearnerAssessmentAccess.mockResolvedValue({
          ...validAssessmentAccess,
          status,
        });

        await expect(
          service.ensureLearnerCanAccessAssessment(
            learnerId,
            courseId,
            assessmentId,
          ),
        ).rejects.toThrow(
          new ForbiddenException('Assessment is not published.'),
        );
      },
    );

    it.each([AssessmentStatus.DRAFT, AssessmentStatus.ARCHIVED])(
      'allows %s assessment when requirePublished is false',
      async (status) => {
        repository.findLearnerAssessmentAccess.mockResolvedValue({
          ...validAssessmentAccess,
          status,
        });

        await expect(
          service.ensureLearnerCanAccessAssessment(
            learnerId,
            courseId,
            assessmentId,
            { requirePublished: false },
          ),
        ).resolves.toBeUndefined();
      },
    );
  });

  describe('ensureActiveLessonInCourse', () => {
    it('resolves when lesson exists and is active in course', async () => {
      await expect(
        service.ensureActiveLessonInCourse(lessonId, courseId),
      ).resolves.toBeUndefined();
      expect(repository.existsActiveLessonInCourse).toHaveBeenCalledWith(
        lessonId,
        courseId,
      );
    });

    it('throws BadRequestException when lesson is missing or inactive', async () => {
      repository.existsActiveLessonInCourse.mockResolvedValue(false);

      await expect(
        service.ensureActiveLessonInCourse(lessonId, courseId),
      ).rejects.toThrow(
        new BadRequestException(
          'afterLesson must reference an active lesson in an active section of this course.',
        ),
      );
    });
  });

  describe('instructor ownership hierarchy', () => {
    it('ensureInstructorCanManageCourse resolves when instructor owns course and throws ForbiddenException otherwise', async () => {
      await expect(
        service.ensureInstructorCanManageCourse(instructorId, courseId),
      ).resolves.toBeUndefined();

      repository.existsCourseByInstructor.mockResolvedValue(false);
      await expect(
        service.ensureInstructorCanManageCourse(instructorId, courseId),
      ).rejects.toThrow(new ForbiddenException('Access denied'));
    });

    it('ensureInstructorCanManageAssessment verifies course first, then assessment membership', async () => {
      await expect(
        service.ensureInstructorCanManageAssessment(
          instructorId,
          courseId,
          assessmentId,
        ),
      ).resolves.toBeUndefined();

      repository.existsAssessmentInCourse.mockResolvedValue(false);
      await expect(
        service.ensureInstructorCanManageAssessment(
          instructorId,
          courseId,
          assessmentId,
        ),
      ).rejects.toThrow(new ForbiddenException('Access denied'));

      repository.existsCourseByInstructor.mockResolvedValue(false);
      repository.existsAssessmentInCourse.mockClear();
      await expect(
        service.ensureInstructorCanManageAssessment(
          instructorId,
          courseId,
          assessmentId,
        ),
      ).rejects.toThrow(new ForbiddenException('Access denied'));
      expect(repository.existsAssessmentInCourse).not.toHaveBeenCalled();
    });

    it('ensureInstructorCanManageQuestion verifies question belongs to assessment', async () => {
      await expect(
        service.ensureInstructorCanManageQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).resolves.toBeUndefined();

      repository.existsQuestionInAssessment.mockResolvedValue(false);
      await expect(
        service.ensureInstructorCanManageQuestion(
          instructorId,
          courseId,
          assessmentId,
          questionId,
        ),
      ).rejects.toThrow(new ForbiddenException('Access denied'));
    });

    it('ensureInstructorCanManageAnswer verifies answer belongs to question', async () => {
      await expect(
        service.ensureInstructorCanManageAnswer(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          answerId,
        ),
      ).resolves.toBeUndefined();

      repository.existsAnswerInQuestion.mockResolvedValue(false);
      await expect(
        service.ensureInstructorCanManageAnswer(
          instructorId,
          courseId,
          assessmentId,
          questionId,
          answerId,
        ),
      ).rejects.toThrow(new ForbiddenException('Access denied'));
    });
  });
});
