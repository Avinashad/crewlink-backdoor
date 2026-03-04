import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  section_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_items?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_type_filter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maps_to_table?: string;
}
