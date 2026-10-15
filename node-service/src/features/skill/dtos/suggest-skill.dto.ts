import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SuggestSkillDto {
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  keywords!: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(700)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}
