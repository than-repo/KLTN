import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import { EnrollmentResponseDto } from '../../enrollments/dtos/enrollment-response.dto';
import {
  LearningCourseOverviewResponseDto,
  LearningLessonDetailResponseDto,
  LearningLessonSummaryDto,
  LearningSectionSummaryDto,
  PaginatedLearningLessonsResponseDto,
  PaginatedLearningSectionsResponseDto,
} from '../dtos/v2/learning-course-v2-response.dto';
import { LearningPaginationQueryDto } from '../dtos/v2/learning-pagination-query.dto';
import type {
  ILearningCourseV2Repository,
  PaginatedLearningRepositoryResult,
} from '../interfaces/learning-course-v2.repository.interface';
import { LEARNING_COURSE_V2_REPOSITORY } from '../repositories/learning-course-v2.repository.token';

const DEFAULT_LEARNING_PAGE = 1;
const DEFAULT_LEARNING_LIMIT = 20;
const MAX_LEARNING_LIMIT = 50;

@Injectable()
export class LearningCoursesV2Service {
  constructor(
    @Inject(LEARNING_COURSE_V2_REPOSITORY)
    private readonly learningCourseRepository: ILearningCourseV2Repository,

    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async getCourseOverview(
    learnerId: string,
    courseId: string,
  ): Promise<LearningCourseOverviewResponseDto> {
    const enrollment = await this.assertCanLearn(learnerId, courseId);
    const course = await this.learningCourseRepository.findCourseOverview(
      courseId,
    );

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return plainToInstance(
      LearningCourseOverviewResponseDto,
      {
        ...course,
        progressPercentage: enrollment.progressPercentage,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getSections(
    learnerId: string,
    courseId: string,
    query: LearningPaginationQueryDto,
  ): Promise<PaginatedLearningSectionsResponseDto> {
    await this.assertCanLearn(learnerId, courseId);
    await this.assertCourseExists(courseId);

    const pagination = this.normalizePagination(query);
    const result = await this.learningCourseRepository.findSections(
      courseId,
      pagination,
    );

    return this.toPaginatedResponse(
      PaginatedLearningSectionsResponseDto,
      result,
      pagination.page,
      pagination.limit,
    );
  }

  async getLessons(
    learnerId: string,
    courseId: string,
    sectionId: string,
    query: LearningPaginationQueryDto,
  ): Promise<PaginatedLearningLessonsResponseDto> {
    await this.assertCanLearn(learnerId, courseId);
    await this.assertSectionExists(courseId, sectionId);

    const pagination = this.normalizePagination(query);
    const result = await this.learningCourseRepository.findLessons(
      courseId,
      sectionId,
      pagination,
    );

    return this.toPaginatedResponse(
      PaginatedLearningLessonsResponseDto,
      result,
      pagination.page,
      pagination.limit,
    );
  }

  async getLessonDetail(
    learnerId: string,
    courseId: string,
    lessonId: string,
  ): Promise<LearningLessonDetailResponseDto> {
    await this.assertCanLearn(learnerId, courseId);

    const lesson = await this.learningCourseRepository.findLessonDetail(
      courseId,
      lessonId,
    );

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return plainToInstance(LearningLessonDetailResponseDto, lesson, {
      excludeExtraneousValues: true,
    });
  }

  private async assertCanLearn(
    learnerId: string,
    courseId: string,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentsService.findByCourseIdAndUserId(
      learnerId,
      courseId,
    );

    if (!enrollment) {
      throw new ForbiddenException('YOU_ARE_NOT_ENROLLED_IN_THIS_COURSE');
    }

    return enrollment;
  }

  private async assertCourseExists(courseId: string): Promise<void> {
    const exists =
      await this.learningCourseRepository.existsCourseForLearning(courseId);

    if (!exists) {
      throw new NotFoundException('Course not found');
    }
  }

  private async assertSectionExists(
    courseId: string,
    sectionId: string,
  ): Promise<void> {
    const exists = await this.learningCourseRepository.existsSectionForLearning(
      courseId,
      sectionId,
    );

    if (!exists) {
      throw new NotFoundException('Section not found');
    }
  }

  private normalizePagination(query: LearningPaginationQueryDto): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(query.page ?? DEFAULT_LEARNING_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LEARNING_LIMIT, 1),
      MAX_LEARNING_LIMIT,
    );

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  private toPaginatedResponse<
    TModel,
    TResponse extends
      | PaginatedLearningSectionsResponseDto
      | PaginatedLearningLessonsResponseDto,
  >(
    responseType: new () => TResponse,
    result: PaginatedLearningRepositoryResult<TModel>,
    page: number,
    limit: number,
  ): TResponse {
    const totalPages = Math.ceil(result.total / limit);

    return plainToInstance(
      responseType,
      {
        data: result.data,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { excludeExtraneousValues: true },
    );
  }
}
