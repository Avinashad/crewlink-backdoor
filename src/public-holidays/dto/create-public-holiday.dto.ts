import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublicHolidayDto {
  @ApiProperty({ description: 'Country code (e.g. NZ, AU)' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiPropertyOptional({ description: 'Region/state code. Null = nationwide.' })
  @IsString()
  @IsOptional()
  regionCode?: string;

  @ApiProperty({ description: 'Holiday name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Holiday date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  holidayDate: string;

  @ApiPropertyOptional({ description: 'Rate multiplier (e.g. 1.5 for time and a half)', default: 1.5 })
  @IsNumber()
  @IsOptional()
  rateMultiplier?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
