// src/features/assessments/dtos/assessment-question-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { AssessmentQuestionType, Difficulty } from 'generated/prisma/enums';
import { ASSESSMENT_VIEW_GROUPS } from '../assessment/assessment-response';

const ALL_ASSESSMENT_GROUPS = [
  ASSESSMENT_VIEW_GROUPS.LEARNER,
  ASSESSMENT_VIEW_GROUPS.INSTRUCTOR,
];

const INSTRUCTOR_ASSESSMENT_GROUPS = [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR];

export class AssessmentQuestionResponseDto {
  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  id!: string;

  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  assessmentId!: string;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  questionText!: string;

  @ApiProperty({ enum: AssessmentQuestionType })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  type!: AssessmentQuestionType;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  explanation?: string | null;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  points!: number;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  order!: number;

  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  updatedAt!: Date;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  deletedAt?: Date | null;

  @ApiPropertyOptional({
    type: () => SkillDto,
    isArray: true,
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  @Type(() => SkillDto)
  skills?: SkillDto[];
}

export class SkillDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  canonicalName!: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ type: [String], nullable: true })
  @Expose()
  aliases!: string[] | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  parentId!: string | null;

  @ApiProperty()
  @Expose()
  level!: number;

  @ApiProperty({ enum: Difficulty })
  @Expose()
  difficulty!: Difficulty;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  @Type(() => Date)
  @Transform(({ value }: { value: unknown }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  @Type(() => Date)
  @Transform(({ value }: { value: unknown }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  updatedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Expose()
  @Type(() => Date)
  @Transform(({ value }: { value: unknown }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  deletedAt!: string | null;
}
