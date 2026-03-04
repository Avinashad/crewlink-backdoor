import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsArray, MinLength, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'senior-care', description: 'Unique service code' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Senior Care', description: 'Service name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Providing care and assistance to elderly individuals' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    example: ['care', 'hospitality'], 
    description: 'Expertise codes this service applies to (empty = all)' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseCodes?: string[];

  @ApiPropertyOptional({ 
    example: ['NZ', 'AU'], 
    description: 'Country codes this service is available in (empty = all)' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryCodes?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Display order (lower = first)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
