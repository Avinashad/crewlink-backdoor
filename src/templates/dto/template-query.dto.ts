import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class TemplateQueryDto {
  @ApiPropertyOptional({ description: 'Filter by industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Filter by country code' })
  @IsString()
  @IsOptional()
  country_code?: string;

  @ApiPropertyOptional({ description: 'Show only featured templates' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  featured_only?: boolean;

  @ApiPropertyOptional({ description: 'Show only active templates', default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  active_only?: boolean;
}
