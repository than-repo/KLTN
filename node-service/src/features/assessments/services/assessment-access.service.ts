import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  CourseStatus,
  EnrollmentStatus,
} from 'generated/prisma/enums';
import type { IAssessmentAccessRepository } from '../interfaces/assessment-access.repository.interface';

export const ASSESSMENT_ACCESS_REPOSITORY = 'ASSESSMENT_ACCESS_REPOSITORY';

@Injectable()
export class AssessmentAccessService {
  constructor(
    @Inject(ASSESSMENT_ACCESS_REPOSITORY)
    private readonly assessmentAccessRepository: IAssessmentAccessRepository,
  ) {}

  async ensureLearnerCanAccessCourse(
    learnerId: string,
    courseId: string,
  ): Promise<void> {
    const enrollment =
      await this.assessmentAccessRepository.findLearnerCourseAccess(
        learnerId,
        courseId,
      );

    if (
      !enrollment ||
      !enrollment.isActive ||
      enrollment.deletedAt ||
      enrollment.status !== EnrollmentStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'You are not allowed to access assessments for this course.',
      );
    }

    const { course } = enrollment;
    if (
      !course.isActive ||
      course.deletedAt ||
      course.status !== CourseStatus.PUBLISHED
    ) {
      throw new ForbiddenException('Course is not available for learning.');
    }
  }

  async ensureLearnerCanAccessAssessment(
    learnerId: string,
    courseId: string,
    assessmentId: string,
    options: { requirePublished?: boolean } = {},
  ): Promise<void> {
    await this.ensureLearnerCanAccessCourse(learnerId, courseId);

    const assessment =
      await this.assessmentAccessRepository.findLearnerAssessmentAccess(
        assessmentId,
        courseId,
      );

    if (!assessment || !assessment.isActive || assessment.deletedAt) {
      throw new NotFoundException('Assessment not found.');
    }

    if (
      options.requirePublished !== false &&
      assessment.status !== AssessmentStatus.PUBLISHED
    ) {
      throw new ForbiddenException('Assessment is not published.');
    }
  }

  async ensureActiveLessonInCourse(
    lessonId: string,
    courseId: string,
  ): Promise<void> {
    const exists =
      await this.assessmentAccessRepository.existsActiveLessonInCourse(
        lessonId,
        courseId,
      );

    if (!exists) {
      throw new BadRequestException(
        'afterLesson must reference an active lesson in an active section of this course.',
      );
    }
  }

  async ensureInstructorCanManageCourse(
    instructorId: string,
    courseId: string,
  ): Promise<void> {
    const canAccess =
      await this.assessmentAccessRepository.existsCourseByInstructor(
        courseId,
        instructorId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }

  async ensureInstructorCanManageAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageCourse(instructorId, courseId);

    const canAccess =
      await this.assessmentAccessRepository.existsAssessmentInCourse(
        assessmentId,
        courseId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }

  async ensureInstructorCanManageQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const canAccess =
      await this.assessmentAccessRepository.existsQuestionInAssessment(
        questionId,
        assessmentId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }

  async ensureInstructorCanManageAnswer(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
    answerId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const canAccess =
      await this.assessmentAccessRepository.existsAnswerInQuestion(
        answerId,
        questionId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }
}
