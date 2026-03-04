import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsArray, MinLength, MaxLength, Min } from 'class-validator';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'senior-care' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Senior Care' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Providing care and assistance to elderly individuals' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['care', 'hospitality'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseCodes?: string[];

  @ApiPropertyOptional({ example: ['NZ', 'AU'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryCodes?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
