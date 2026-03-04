import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitOnboardingDto {
  @ApiPropertyOptional({ 
    example: 'All information provided is accurate',
    description: 'Optional submission notes' 
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
