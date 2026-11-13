import { AssessmentType } from 'generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LearnerCourseAssessmentItemDto {
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  readonly afterLesson!: string | null;

  @ApiProperty()
  readonly id!: string;
  @ApiProperty()
  readonly title!: string;
  @ApiPropertyOptional({ nullable: true })
  readonly description?: string | null;
  @ApiProperty({ enum: AssessmentType })
  readonly type!: AssessmentType;

  @ApiProperty()
  readonly order!: number;
  @ApiProperty()
  readonly totalPoints!: number;
  @ApiPropertyOptional({ nullable: true })
  readonly passingScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  readonly maxAttempts?: number | null;
  @ApiPropertyOptional({ nullable: true })
  readonly timeLimitMinutes?: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  readonly availableFrom?: Date | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  readonly availableUntil?: Date | null;
}

export class LearnerCourseAssessmentsDto {
  @ApiProperty({ type: [LearnerCourseAssessmentItemDto] })
  readonly assessments!: LearnerCourseAssessmentItemDto[];
  @ApiProperty({ type: String, format: 'date-time' })
  readonly serverNow!: Date;
}
