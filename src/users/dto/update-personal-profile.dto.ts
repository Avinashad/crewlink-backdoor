import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdatePersonalProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'NZ' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    example: 'Prefers morning visits. Allergic to nuts.',
  })
  @IsOptional()
  @IsString()
  careNotes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'True if this profile was created to seek care support services',
  })
  @IsOptional()
  @IsBoolean()
  isCareProfile?: boolean;
}
