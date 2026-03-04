import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileSectionDto {
  @ApiProperty()
  @IsString()
  section_key: string;

  @ApiProperty()
  @IsString()
  display_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  section_order?: number;

  @ApiPropertyOptional({ default: 1 })
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
