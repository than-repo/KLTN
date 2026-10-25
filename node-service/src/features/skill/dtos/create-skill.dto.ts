import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Difficulty } from 'generated/prisma/enums';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  canonicalName!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(700)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(50, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  aliases?: string[] | null;

  // Skill IDs are CUIDs
  // The service verifies that the parent exists.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  parentId?: string | null;

  // Allow omission, but reject explicit null.
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
