import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I am interested in this position.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
