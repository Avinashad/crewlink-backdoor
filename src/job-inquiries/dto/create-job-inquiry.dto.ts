import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InquiryPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateJobInquiryDto {
  @ApiPropertyOptional({ description: 'Job post ID (optional)' })
  @IsUUID()
  @IsOptional()
  jobPostId?: string;

  @ApiPropertyOptional({ description: 'Organization ID (optional)' })
  @IsUUID()
  @IsOptional()
  orgId?: string;

  @ApiProperty({ description: 'Inquiry subject' })
  @IsString()
  subject: string;
}
