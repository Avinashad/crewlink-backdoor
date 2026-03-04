import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';

export class VerifyClientDto {
  @ApiProperty({ enum: ['approved', 'blocked'], description: 'Verification decision' })
  @IsString()
  @IsIn(['approved', 'blocked'])
  status: 'approved' | 'blocked';

  @ApiPropertyOptional({ description: 'Optional note for the decision' })
  @IsOptional()
  @IsString()
  orgNotes?: string;
}
