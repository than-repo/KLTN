import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SummarizeSectionDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Introduction to React Fundamentals' })
  @Expose()
  title!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'An introduction to React components and JSX.',
  })
  @Expose()
  description!: string | null;

  @ApiProperty({ example: 0 })
  @Expose()
  sectionIndex!: number;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;
}
