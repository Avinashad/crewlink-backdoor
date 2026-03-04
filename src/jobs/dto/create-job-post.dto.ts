import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, IsBoolean, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum JobPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  FILLED = 'filled',
}

export enum JobType {
  SINGLE_SHIFT = 'single_shift',
  RECURRING = 'recurring',
  LONG_TERM = 'long_term',
}

export class JobResponsibilityInput {
  @ApiPropertyOptional({ description: 'Template ID if from template' })
  @IsUUID() @IsOptional()
  templateId?: string;

  @ApiProperty({ description: 'Responsibility title' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsNumber() @IsOptional()
  sortOrder?: number;
}

export class CreateJobPostDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  orgId: string;

  @ApiProperty({ description: 'Country code (e.g., NP, NZ)' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ description: 'Category key (references expertise.code)' })
  @IsString()
  @IsNotEmpty()
  categoryKey: string;

  @ApiProperty({ description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Job description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Job requirements' })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiPropertyOptional({
    description: 'Job status',
    enum: JobPostStatus,
    default: JobPostStatus.DRAFT
  })
  @IsEnum(JobPostStatus)
  @IsOptional()
  status?: JobPostStatus;

  // --- Scheduling fields ---

  @ApiPropertyOptional({ description: 'Job type', enum: JobType, default: JobType.SINGLE_SHIFT })
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Number of workers needed', default: 1 })
  @IsNumber()
  @IsOptional()
  workersNeeded?: number;

  @ApiPropertyOptional({ description: 'Pay rate amount' })
  @IsNumber()
  @IsOptional()
  payRate?: number;

  @ApiPropertyOptional({ description: 'Pay rate type', enum: ['hourly', 'daily', 'weekly', 'fixed'] })
  @IsString()
  @IsOptional()
  payRateType?: string;

  @ApiPropertyOptional({ description: 'Whether the job recurs' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Shift start time (HH:MM)' })
  @IsString()
  @IsOptional()
  shiftStartTime?: string;

  @ApiPropertyOptional({ description: 'Shift end time (HH:MM)' })
  @IsString()
  @IsOptional()
  shiftEndTime?: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes', default: 0 })
  @IsNumber()
  @IsOptional()
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Active days for recurring (e.g. ["monday","wednesday"])' })
  @IsArray()
  @IsOptional()
  activeDays?: string[];

  @ApiPropertyOptional({ description: 'Expected hours per week (long_term)' })
  @IsNumber()
  @IsOptional()
  hoursPerWeek?: number;

  @ApiPropertyOptional({ description: 'Apply holiday rate multiplier' })
  @IsBoolean()
  @IsOptional()
  applyHolidayRate?: boolean;

  @ApiPropertyOptional({ description: 'Holiday rate multiplier (e.g. 1.5)' })
  @IsNumber()
  @IsOptional()
  holidayRateMultiplier?: number;

  // --- Responsibilities ---

  @ApiPropertyOptional({ description: 'Job responsibilities', type: [JobResponsibilityInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobResponsibilityInput)
  @IsOptional()
  responsibilities?: JobResponsibilityInput[];
}
