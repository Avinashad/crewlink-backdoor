import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsObject, MinLength, MaxLength, Min, IsIn } from 'class-validator';

export class UpdateVettingTileDto {
  @ApiPropertyOptional({ example: 'police-check' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Police Background Check' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'National police history check required' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    example: 'background_check', 
    enum: ['certification', 'background_check', 'reference', 'custom'] 
  })
  @IsOptional()
  @IsString()
  @IsIn(['certification', 'background_check', 'reference', 'custom'])
  type?: 'certification' | 'background_check' | 'reference' | 'custom';

  @ApiPropertyOptional({ example: { fields: [], documentTypes: ['pdf', 'jpg'] } })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: ['NZ', 'AU'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryCodes?: string[];

  @ApiPropertyOptional({ example: ['care', 'hospitality'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseCodes?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
