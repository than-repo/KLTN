// src/features/assessments/dtos/attempts/save-attempt-answer.dto.ts

import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

/**
 * Route params for:
 * PATCH /attempts/:attemptId/answers/:questionId
 */
export class SaveAttemptAnswerParamsDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'attemptId must be a string.' })
  @IsNotEmpty({ message: 'attemptId is required.' })
  @IsUUID('4', { message: 'attemptId must be a valid UUID.' })
  readonly attemptId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'questionId must be a string.' })
  @IsNotEmpty({ message: 'questionId is required.' })
  @IsUUID('4', { message: 'questionId must be a valid UUID.' })
  readonly questionId!: string;
}

/**
 * Body for autosaving learner answer.
 *
 * Keep this simple:
 * - MULTIPLE_CHOICE: answer = selected option value/text
 * - TRUE_FALSE: answer = "true" or "false"
 * - FILL_IN_THE_BLANK: answer = learner typed text
 *
 * Do NOT accept:
 * - isCorrect
 * - pointsEarned
 * - correctAnswer
 * - score
 */
export class SaveAttemptAnswerDto {
  @ApiProperty({
    description: 'A non-empty answer. Clearing an answer is not supported.',
    maxLength: 5000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'answer must be a string.' })
  @IsNotEmpty({ message: 'answer is required.' })
  @MaxLength(5000, { message: 'answer is too long.' })
  readonly answer!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: true,
    description:
      'The exact server-issued savedAt timestamp from the previous save or active-attempt response. Use null for the first save. Stale versions return 409 ANSWER_VERSION_CONFLICT.',
    example: null,
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsDefined({
    message: 'expectedSavedAt is required; use null for the first save.',
  })
  @IsISO8601(
    { strict: true, strictSeparator: true },
    {
      message:
        'expectedSavedAt must be a valid timestamp returned by the server.',
    },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, {
    message:
      'expectedSavedAt must use the server timestamp format YYYY-MM-DDTHH:mm:ss.sssZ.',
  })
  readonly expectedSavedAt!: string | null;

  /**
   * Optional client-side snapshot.
   *
   * You can use this later if you want to store richer data,
   * for example selected option label, question version, or editor state.
   *
   * For now, the service may ignore this and build answerSnapshot itself.
   */
  @IsOptional()
  @IsString({ message: 'answerSnapshot must be a string.' })
  @MaxLength(10000, { message: 'answerSnapshot is too long.' })
  readonly answerSnapshot?: string;
}

/**
 * Small response after autosave.
 */
export class SaveAttemptAnswerResponseDto {
  readonly attemptId!: string;
  readonly questionId!: string;

  readonly saved!: boolean;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Server-issued version for this answer. Send it as expectedSavedAt with the next save.',
  })
  readonly savedAt!: Date;

  /**
   * Backend-calculated remaining time.
   * Useful for keeping FE timer in sync.
   */
  readonly remainingSeconds?: number | null;

  readonly serverNow!: Date;
}
