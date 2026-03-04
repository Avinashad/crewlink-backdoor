import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobTemplateDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  orgId: string;

  @ApiPropertyOptional({ description: 'Category key (references expertise.code)' })
  @IsString()
  @IsOptional()
  categoryKey?: string;

  @ApiProperty({ description: 'Template title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Template requirements' })
  @IsString()
  @IsOptional()
  requirements?: string;
}
