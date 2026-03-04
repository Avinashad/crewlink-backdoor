import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileFieldDto {
  @ApiProperty()
  @IsString()
  field_key: string;

  @ApiProperty()
  @IsString()
  field_label: string;

  @ApiProperty()
  @IsString()
  field_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maps_to_column?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maps_to_table?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  field_options?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  help_text?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  field_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validation_rules?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  field_config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditional_logic?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section_id?: string;

  @ApiPropertyOptional({ description: 'Default value from table.column.row' })
  @IsOptional()
  @IsObject()
  default_value_source?: { table: string; column: string; row_id: string };

  @ApiPropertyOptional({ description: 'Default display value from table.column.row' })
  @IsOptional()
  @IsObject()
  default_display_value_source?: { table: string; column: string; row_id: string };
}
