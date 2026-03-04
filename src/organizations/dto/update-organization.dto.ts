import { IsString, IsOptional, MaxLength, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name', example: 'Acme Corp' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Organization type', example: 'hotel' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  type?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Business email address', example: 'contact@acme.com' })
  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({ description: 'Business phone number', example: '+64 9 123 4567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  businessPhone?: string;

  @ApiPropertyOptional({ description: 'Business registration ID / company number', example: '1234567' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  businessRegistrationId?: string;
}
