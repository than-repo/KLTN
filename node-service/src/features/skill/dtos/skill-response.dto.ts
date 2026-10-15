import { Expose, Transform, Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { Difficulty } from 'generated/prisma/enums';

export class SkillResponseDto {
  @Expose()
  id!: string;

  @Expose()
  canonicalName!: string;

  @Expose()
  description!: string | null;

  @Expose()
  aliases!: string[] | null;

  @Expose()
  parentId!: string | null;

  @Expose()
  level!: number;

  @Expose()
  difficulty!: Difficulty;

  @Expose()
  isActive!: boolean;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  createdAt!: string;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  updatedAt!: string;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  deletedAt!: string | null;
}

export class SuggestionSkillsDto {
  @Expose()
  @Type(() => SkillResponseDto)
  skills!: SkillResponseDto[];
}
