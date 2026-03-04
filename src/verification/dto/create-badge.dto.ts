import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateVerificationBadgeDto {
  @ApiProperty()
  @IsString()
  badge_key: string;

  @ApiProperty()
  @IsString()
  display_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

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

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  required_criteria_keys: string[];

  @ApiProperty({ enum: ['basic', 'enhanced', 'premium'] })
  @IsString()
  @IsIn(['basic', 'enhanced', 'premium'])
  tier: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  display_order?: number;
}
