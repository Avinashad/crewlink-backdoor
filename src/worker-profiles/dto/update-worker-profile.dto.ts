import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsArray, IsIn, Max, Min } from 'class-validator';

const VISA_TYPES = [
  'nz_citizen',
  'permanent_resident',
  'student_visa',
  'open_work_visa',
  'employer_sponsored',
  'holiday_visa',
  'other',
] as const;

export class UpdateWorkerProfileDto {
  @ApiPropertyOptional({ example: 'Experienced caregiver with 5+ years in aged care.' })
  @IsOptional()
  @IsString()
  workerBio?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  workerExperienceYears?: number;

  @ApiPropertyOptional({
    example: { days: ['mon', 'tue', 'wed'], timezone: 'Pacific/Auckland' },
    description: 'Availability as JSON (days, times, timezone)',
  })
  @IsOptional()
  availability?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: ['care', 'hospitality'],
    description: 'Array of expertise/category codes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseCodes?: string[];

  @ApiPropertyOptional({ example: 25.00 })
  @IsOptional()
  hourlyRateMin?: number;

  @ApiPropertyOptional({ example: 40.00 })
  @IsOptional()
  hourlyRateMax?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 'Available weekday mornings only.' })
  @IsOptional()
  @IsString()
  availabilityNote?: string;

  @ApiPropertyOptional({ enum: VISA_TYPES, example: 'student_visa' })
  @IsOptional()
  @IsIn(VISA_TYPES)
  visaType?: string;

  @ApiPropertyOptional({ example: 20, description: 'Max weekly hours allowed by visa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  weeklyHoursLimit?: number;

  @ApiPropertyOptional({ example: false, description: 'True when student is in holiday period (can work full-time)' })
  @IsOptional()
  @IsBoolean()
  isHolidayMode?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  holidayStartDate?: string;

  @ApiPropertyOptional({ example: '2026-07-31', description: 'Holiday mode auto-resets when this date passes' })
  @IsOptional()
  @IsDateString()
  holidayExpiryDate?: string;
}
