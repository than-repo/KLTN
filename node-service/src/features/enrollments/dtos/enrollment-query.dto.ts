import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseLevel, EnrollmentStatus } from 'generated/prisma/enums';

export const MY_ENROLLMENTS_PROGRESS_FILTERS = [
  'not-started',
  'in-progress',
  'completed',
] as const;

export type MyEnrollmentsProgressFilter =
  (typeof MY_ENROLLMENTS_PROGRESS_FILTERS)[number];

export const MY_ENROLLMENTS_SORT_FIELDS = [
  'enrolledAt',
  'title',
  'progressPercentage',
] as const;

export type MyEnrollmentsSortField =
  (typeof MY_ENROLLMENTS_SORT_FIELDS)[number];

export const MY_ENROLLMENTS_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type MyEnrollmentsSortDirection =
  (typeof MY_ENROLLMENTS_SORT_DIRECTIONS)[number];

export type MyEnrollmentsStatusFilter = Extract<
  EnrollmentStatus,
  'ACTIVE' | 'COMPLETED'
>;

export class MyEnrollmentsQueryDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Search enrolled courses by title or short description.',
    example: 'nestjs',
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: CourseLevel,
    description: 'Filter by course level.',
  })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({
    enum: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
    description: 'Filter by active or completed enrollment status.',
  })
  @IsOptional()
  @IsIn([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED])
  status?: MyEnrollmentsStatusFilter;

  @ApiPropertyOptional({
    enum: MY_ENROLLMENTS_PROGRESS_FILTERS,
    description: 'Filter by learner progress.',
  })
  @IsOptional()
  @IsIn(MY_ENROLLMENTS_PROGRESS_FILTERS)
  progress?: MyEnrollmentsProgressFilter;

  @ApiPropertyOptional({
    enum: MY_ENROLLMENTS_SORT_FIELDS,
    default: 'enrolledAt',
  })
  @IsOptional()
  @IsIn(MY_ENROLLMENTS_SORT_FIELDS)
  sortField?: MyEnrollmentsSortField;

  @ApiPropertyOptional({
    enum: MY_ENROLLMENTS_SORT_DIRECTIONS,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(MY_ENROLLMENTS_SORT_DIRECTIONS)
  sortDirection?: MyEnrollmentsSortDirection;
}
