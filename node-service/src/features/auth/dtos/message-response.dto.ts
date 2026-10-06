import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class MessageResponseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  @MinLength(3)
  message!: string;
}
