import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UseTemplateDto {
  @ApiPropertyOptional({ description: 'Category key for the new workflow (e.g., worker, organization)' })
  @IsString()
  @IsOptional()
  category_key?: string;

  @ApiPropertyOptional({ description: 'Country code to filter template fields' })
  @IsString()
  @IsOptional()
  country_code?: string;
}
