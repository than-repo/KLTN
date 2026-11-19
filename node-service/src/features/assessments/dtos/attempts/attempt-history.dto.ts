// src/features/assessments/dtos/attempts/attempt-history.dto.ts

import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  AssessmentAttemptStatus,
  AssessmentType,
} from 'generated/prisma/enums';

/**
 * Route params for:
 * GET /assessments/:assessmentId/attempts
 */
export class AttemptHistoryParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'assessmentId must be a string.' })
  @IsNotEmpty({ message: 'assessmentId is required.' })
  @IsUUID('4', { message: 'assessmentId must be a valid UUID.' })
  readonly assessmentId!: string;
}

export class AttemptHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer.' })
  @Min(1, { message: 'page must be greater than or equal to 1.' })
  readonly page = 1;
}

/**
 * One attempt row in learner history.
 */
export class AttemptHistoryItemDto {
  readonly attemptId!: string;

  readonly attemptNumber!: number;
  readonly status!: AssessmentAttemptStatus;

  readonly score?: number | null;
  readonly maxScore?: number | null;
  readonly passed!: boolean;

  readonly startedAt!: Date;
  readonly submittedAt?: Date | null;

  /**
   * FE can show "Continue" for an unfinished attempt.
   */
  readonly canContinue!: boolean;

  /**
   * FE can show "View result" for finished attempts.
   */
  readonly canViewResult!: boolean;

  /** True while an expired in-progress attempt awaits background finalization. */
  readonly isFinalizing!: boolean;
}

/**
 * Response DTO for learner attempt history.
 */
export class AttemptHistoryDto {
  readonly assessmentId!: string;
  readonly assessmentTitle!: string;
  readonly assessmentType!: AssessmentType;

  readonly maxAttempts?: number | null;

  readonly attemptsUsed!: number;
  readonly attemptsRemaining?: number | null;

  readonly attempts!: AttemptHistoryItemDto[];

  readonly pagination!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  readonly serverNow!: Date;
}
