import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsObject, MinLength, MaxLength, Min, IsIn } from 'class-validator';

export class CreateVettingTileDto {
  @ApiProperty({ example: 'police-check', description: 'Unique vetting tile code' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Police Background Check', description: 'Tile title' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'National police history check required for working with vulnerable people' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: 'background_check', 
    enum: ['certification', 'background_check', 'reference', 'custom'] 
  })
  @IsString()
  @IsIn(['certification', 'background_check', 'reference', 'custom'])
  type: 'certification' | 'background_check' | 'reference' | 'custom';

  @ApiPropertyOptional({ 
    example: { fields: [], documentTypes: ['pdf', 'jpg'], validations: {} },
    description: 'Configuration object with tile-specific settings' 
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ example: false, description: 'Whether this vetting is required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: ['NZ', 'AU'], 
    description: 'Country codes this tile applies to (empty = all)' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryCodes?: string[];

  @ApiPropertyOptional({ 
    example: ['care', 'hospitality'], 
    description: 'Expertise codes this tile applies to (empty = all)' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseCodes?: string[];

  @ApiPropertyOptional({ example: 0, description: 'Display order (lower = first)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
