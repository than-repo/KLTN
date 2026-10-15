// src\features\courses\dtos\lesson\create-lesson.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({
    example: 'Introduction to HTML',
    description: 'Lesson title.',
    minLength: 3,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'This lesson introduces the basic structure of an HTML document.',
    description: 'Optional lesson description.',
    maxLength: 2000,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  //apply skills
  @ApiPropertyOptional({
    description: 'Existing skill IDs to attach to this lesson.',
    type: [String],
    example: ['cmv6st8y0000fk4voncpprhsd'],
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  skillIds?: string[];
}
