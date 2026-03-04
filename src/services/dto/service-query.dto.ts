import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ServiceQueryDto {
  @ApiPropertyOptional({ 
    description: 'Filter by expertise code(s)',
    example: 'care' 
  })
  @IsOptional()
  @IsString()
  expertiseCode?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by country code(s)',
    example: 'NZ' 
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by active status',
    example: true,
    default: true 
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean;
}
