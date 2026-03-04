import { PartialType } from '@nestjs/swagger';
import { CreateJobPostDto, JobPostStatus } from './create-job-post.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobPostDto extends PartialType(CreateJobPostDto) {
  @ApiPropertyOptional({
    description: 'Job status',
    enum: JobPostStatus
  })
  @IsEnum(JobPostStatus)
  @IsOptional()
  status?: JobPostStatus;

  @ApiPropertyOptional({ description: 'Contract template to attach to this job post' })
  @IsUUID()
  @IsOptional()
  contractTemplateId?: string;
}
