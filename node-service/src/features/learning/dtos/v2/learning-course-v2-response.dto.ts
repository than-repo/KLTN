import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MediaTypeEnum } from 'generated/prisma/enums';

export class LearningPaginationMetaDto {
  @ApiProperty()
  @Expose()
  page!: number;

  @ApiProperty()
  @Expose()
  limit!: number;

  @ApiProperty()
  @Expose()
  total!: number;

  @ApiProperty()
  @Expose()
  totalPages!: number;

  @ApiProperty()
  @Expose()
  hasNextPage!: boolean;

  @ApiProperty()
  @Expose()
  hasPreviousPage!: boolean;
}

export class LearningCourseContentSummaryDto {
  @ApiProperty()
  @Expose()
  sectionCount!: number;

  @ApiProperty()
  @Expose()
  lessonCount!: number;
}

export class LearningCourseOverviewResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  slug!: string;

  @ApiProperty()
  @Expose()
  shortDescription!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  thumbnailUrl?: string | null;

  @ApiProperty()
  @Expose()
  progressPercentage!: number;

  @ApiProperty({ type: LearningCourseContentSummaryDto })
  @Expose()
  @Type(() => LearningCourseContentSummaryDto)
  contentSummary!: LearningCourseContentSummaryDto;
}

export class LearningSectionSummaryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  sectionIndex!: number;

  @ApiProperty()
  @Expose()
  lessonCount!: number;
}

export class PaginatedLearningSectionsResponseDto {
  @ApiProperty({ type: [LearningSectionSummaryDto] })
  @Expose()
  @Type(() => LearningSectionSummaryDto)
  data!: LearningSectionSummaryDto[];

  @ApiProperty({ type: LearningPaginationMetaDto })
  @Expose()
  @Type(() => LearningPaginationMetaDto)
  meta!: LearningPaginationMetaDto;
}

export class LearningLessonSummaryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  lessonIndex!: number;

  @ApiProperty()
  @Expose()
  fileCount!: number;
}

export class PaginatedLearningLessonsResponseDto {
  @ApiProperty({ type: [LearningLessonSummaryDto] })
  @Expose()
  @Type(() => LearningLessonSummaryDto)
  data!: LearningLessonSummaryDto[];

  @ApiProperty({ type: LearningPaginationMetaDto })
  @Expose()
  @Type(() => LearningPaginationMetaDto)
  meta!: LearningPaginationMetaDto;
}

export class LearningFileV2Dto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  url!: string;

  @ApiProperty({ enum: MediaTypeEnum })
  @Expose()
  type!: MediaTypeEnum;
}

export class LearningLessonDetailResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  lessonIndex!: number;

  @ApiProperty({ type: [LearningFileV2Dto] })
  @Expose()
  @Type(() => LearningFileV2Dto)
  files!: LearningFileV2Dto[];
}
