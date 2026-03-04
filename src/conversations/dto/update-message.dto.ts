import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    example: 'Hello, I am very interested in this position.',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Mark message as read',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  markAsRead?: boolean;
}
