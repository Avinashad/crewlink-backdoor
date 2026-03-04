import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateVerificationCriteriaDto {
  @ApiProperty()
  @IsString()
  criteria_key: string;

  @ApiProperty()
  @IsString()
  display_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['personal', 'worker', 'organization'] })
  @IsString()
  @IsIn(['personal', 'worker', 'organization'])
  profile_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expertise_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country_code?: string;

  @ApiProperty({ enum: ['document_check', 'manual_review', 'background_check', 'reference_check', 'certification_check', 'identity_check'] })
  @IsString()
  @IsIn(['document_check', 'manual_review', 'background_check', 'reference_check', 'certification_check', 'identity_check'])
  criteria_type: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_document_keys?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  display_order?: number;
}
