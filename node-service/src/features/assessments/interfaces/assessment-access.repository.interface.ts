//src\features\assessments\interfaces\assessment-access.repository.interface.ts

import type {
  AssessmentStatus,
  CourseStatus,
  EnrollmentStatus,
} from 'generated/prisma/enums';

export interface LearnerCourseAccessRecord {
  isActive: boolean;
  deletedAt: Date | null;
  status: EnrollmentStatus;
  course: {
    isActive: boolean;
    deletedAt: Date | null;
    status: CourseStatus;
  };
}

export interface LearnerAssessmentAccessRecord {
  isActive: boolean;
  deletedAt: Date | null;
  status: AssessmentStatus;
}

export interface IAssessmentAccessRepository {
  findLearnerCourseAccess(
    learnerId: string,
    courseId: string,
  ): Promise<LearnerCourseAccessRecord | null>;

  findLearnerAssessmentAccess(
    assessmentId: string,
    courseId: string,
  ): Promise<LearnerAssessmentAccessRecord | null>;

  existsActiveLessonInCourse(
    lessonId: string,
    courseId: string,
  ): Promise<boolean>;

  existsCourseByInstructor(
    courseId: string,
    instructorId: string,
  ): Promise<boolean>;

  existsAssessmentInCourse(
    assessmentId: string,
    courseId: string,
  ): Promise<boolean>;

  existsQuestionInAssessment(
    questionId: string,
    assessmentId: string,
  ): Promise<boolean>;

  existsAnswerInQuestion(
    answerId: string,
    questionId: string,
  ): Promise<boolean>;
}
