import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Difficulty } from 'generated/prisma/enums';

export class UpdateSkillDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  canonicalName?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(700)
  description?: string | null;

  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  )
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(50, { each: true })
  aliases?: string[] | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  parentId?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
