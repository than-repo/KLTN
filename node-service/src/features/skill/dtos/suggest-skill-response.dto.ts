import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SuggestSkillResultDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  canonicalName!: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ type: [String] })
  @Expose()
  aliases!: string[];

  @ApiProperty()
  @Expose()
  exactMatch!: boolean;

  @ApiProperty()
  @Expose()
  keywordScore!: number;

  @ApiProperty()
  @Expose()
  semanticScore!: number;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  descriptionScore!: number | null;

  @ApiProperty()
  @Expose()
  score!: number;
}

export class SuggestSkillResponseDto {
  @ApiProperty({ type: () => [SuggestSkillResultDto] })
  @Expose()
  @Type(() => SuggestSkillResultDto)
  skills!: SuggestSkillResultDto[];
}
