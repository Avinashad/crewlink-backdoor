import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatformFeeTierDto {
  @ApiProperty({ description: 'Tier name (e.g. Standard, Volume)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Minimum workers threshold (inclusive)' })
  @IsInt()
  minWorkers: number;

  @ApiPropertyOptional({
    description: 'Maximum workers threshold (exclusive). Null = unlimited.',
  })
  @IsInt()
  @IsOptional()
  maxWorkers?: number | null;

  @ApiProperty({ description: 'Employer fee percentage (e.g. 12.00 = 12%)' })
  @IsNumber()
  employerFeePercent: number;

  @ApiProperty({ description: 'Worker fee percentage (e.g. 5.00 = 5%)' })
  @IsNumber()
  workerFeePercent: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
