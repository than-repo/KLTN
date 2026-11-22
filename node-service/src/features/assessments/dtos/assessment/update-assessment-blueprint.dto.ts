import { Expose } from 'class-transformer';
import { IsDefined, IsInt, Min } from 'class-validator';

export class UpdateAssessmentBlueprintDto {
  @IsDefined()
  @IsInt()
  @Min(0)
  easyQuestionCount!: number;

  @IsDefined()
  @IsInt()
  @Min(0)
  mediumQuestionCount!: number;

  @IsDefined()
  @IsInt()
  @Min(0)
  hardQuestionCount!: number;
}

export class AssessmentBlueprintResponseDto {
  @Expose()
  assessmentId!: string;
  @Expose()
  easyQuestionCount!: number;
  @Expose()
  mediumQuestionCount!: number;
  @Expose()
  hardQuestionCount!: number;

  @Expose()
  questionNumber!: number;
}
