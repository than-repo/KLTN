import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class GetSkillsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  page: number = 0;

  @IsOptional()
  @IsInt()
  @Max(50)
  @Min(15)
  take: number = 15;
}
