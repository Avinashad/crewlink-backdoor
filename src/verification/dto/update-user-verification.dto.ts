import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';

export class UpdateUserVerificationDto {
  @ApiProperty({ enum: ['verified', 'rejected', 'in_review', 'expired'] })
  @IsString()
  @IsIn(['verified', 'rejected', 'in_review', 'expired'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewer_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expires_at?: string; // ISO date string
}
