import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import {
  LearningCourseOverviewResponseDto,
  LearningLessonDetailResponseDto,
  PaginatedLearningLessonsResponseDto,
  PaginatedLearningSectionsResponseDto,
} from '../dtos/v2/learning-course-v2-response.dto';
import { LearningPaginationQueryDto } from '../dtos/v2/learning-pagination-query.dto';
import { LearningCoursesV2Service } from '../services/learning-courses-v2.service';

@Controller({ path: 'learning/courses', version: '2' })
@ApiTags('Learning course API v2')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
export class LearnerCoursesV2Controller {
  constructor(
    private readonly learningCoursesV2Service: LearningCoursesV2Service,
  ) {}

  @Get(':courseId')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Get lightweight course shell for learning' })
  @ApiOkResponse({ type: LearningCourseOverviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getCourseOverview(
    @CurrentUser('sub') learnerId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<LearningCourseOverviewResponseDto> {
    return this.learningCoursesV2Service.getCourseOverview(
      learnerId,
      courseId,
    );
  }

  @Get(':courseId/sections')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Get paginated learning sections for a course' })
  @ApiOkResponse({ type: PaginatedLearningSectionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getSections(
    @CurrentUser('sub') learnerId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: LearningPaginationQueryDto,
  ): Promise<PaginatedLearningSectionsResponseDto> {
    return this.learningCoursesV2Service.getSections(
      learnerId,
      courseId,
      query,
    );
  }

  @Get(':courseId/sections/:sectionId/lessons')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Get paginated lessons for one learning section' })
  @ApiOkResponse({ type: PaginatedLearningLessonsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getLessons(
    @CurrentUser('sub') learnerId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Query() query: LearningPaginationQueryDto,
  ): Promise<PaginatedLearningLessonsResponseDto> {
    return this.learningCoursesV2Service.getLessons(
      learnerId,
      courseId,
      sectionId,
      query,
    );
  }

  @Get(':courseId/lessons/:lessonId')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Get one learning lesson with its files' })
  @ApiOkResponse({ type: LearningLessonDetailResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getLessonDetail(
    @CurrentUser('sub') learnerId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LearningLessonDetailResponseDto> {
    return this.learningCoursesV2Service.getLessonDetail(
      learnerId,
      courseId,
      lessonId,
    );
  }
}
