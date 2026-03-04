import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class VettingTileQueryDto {
  @ApiPropertyOptional({ 
    description: 'Filter by expertise code',
    example: 'care' 
  })
  @IsOptional()
  @IsString()
  expertiseCode?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by country code',
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

  @ApiPropertyOptional({ 
    description: 'Filter by required status',
    example: false 
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiredOnly?: boolean;
}
