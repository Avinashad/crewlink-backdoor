import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class JobResponsibilityItemDto {
  @ApiPropertyOptional({ description: 'Template ID if from template' })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ description: 'Responsibility title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class SaveJobResponsibilitiesDto {
  @ApiProperty({ type: [JobResponsibilityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobResponsibilityItemDto)
  items: JobResponsibilityItemDto[];
}
