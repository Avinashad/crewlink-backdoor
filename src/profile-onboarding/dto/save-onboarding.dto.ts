import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveOnboardingDto {
  @ApiProperty({ 
    example: ['NZ', 'AU'], 
    description: 'Selected countries (max 2)' 
  })
  @IsArray()
  @IsString({ each: true })
  countries: string[];

  @ApiProperty({ 
    example: ['care', 'hospitality'], 
    description: 'Selected expertise codes' 
  })
  @IsArray()
  @IsString({ each: true })
  expertiseCodes: string[];

  @ApiProperty({ 
    example: [
      {
        stepId: 'uuid',
        fieldId: 'uuid',
        question: 'Do you have a valid work permit?',
        response: 'agreed',
        agreed: true,
        skipped: false,
        documents: [{ documentId: 'uuid', fileName: 'work-permit.pdf' }]
      }
    ],
    description: 'Question responses with documents' 
  })
  @IsArray()
  questions: Array<{
    stepId: string;
    fieldId: string;
    question: string;
    response: 'agreed' | 'disagreed' | 'skipped';
    agreed: boolean;
    skipped: boolean;
    value?: any;
    documents?: Array<{ documentId: string; fileName: string }>;
    disagreedAt?: string;
    skippedAt?: string;
  }>;

  @ApiProperty({ 
    example: { preSelected: ['senior-care'], manual: ['custom-service-1'] },
    description: 'Selected services' 
  })
  @IsObject()
  services: {
    preSelected: string[];
    manual: string[];
  };

  @ApiPropertyOptional({ 
    example: [{ tileId: 'uuid', type: 'certification', data: {}, documents: [] }],
    description: 'Vetting tile responses' 
  })
  @IsOptional()
  @IsArray()
  vetting?: Array<{
    tileId: string;
    type: string;
    data: Record<string, unknown>;
    documents: Array<{ documentId: string; fileName: string }>;
  }>;
}
