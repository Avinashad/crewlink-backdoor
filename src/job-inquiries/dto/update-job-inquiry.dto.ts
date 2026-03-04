import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryPriority } from './create-job-inquiry.dto';

export enum InquiryStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export class UpdateJobInquiryDto {
  @ApiPropertyOptional({ enum: InquiryStatus })
  @IsEnum(InquiryStatus)
  @IsOptional()
  status?: InquiryStatus;

  @ApiPropertyOptional({ enum: InquiryPriority })
  @IsEnum(InquiryPriority)
  @IsOptional()
  priority?: InquiryPriority;

  @ApiPropertyOptional({ description: 'Assign to user ID' })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}
