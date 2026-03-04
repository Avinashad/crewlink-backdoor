import { IsString, IsOptional, IsBoolean, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Unique template key' })
  @IsString()
  @IsNotEmpty()
  template_key: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Industry category' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsString()
  @IsOptional()
  country_code?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsString()
  @IsOptional()
  thumbnail_url?: string;

  @ApiPropertyOptional({ description: 'Is featured template', default: false })
  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

  @ApiProperty({ description: 'Template data (steps and fields configuration)' })
  @IsObject()
  @IsNotEmpty()
  template_data: Record<string, unknown>;
}
