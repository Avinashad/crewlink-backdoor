import { IsString, IsOptional, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PHONE_EXTENSION_REGEX = /^\+[1-9]\d{0,3}$/;
const PHONE_NUMBER_REGEX = /^\d{4,15}$/;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Country dial code (e.g. +64). Required if phoneNumber is provided.', example: '+64' })
  @IsOptional()
  @ValidateIf((o) => (o.phoneNumber ?? '').trim().length > 0)
  @IsString()
  @Matches(PHONE_EXTENSION_REGEX, { message: 'Phone extension must be a valid dial code (e.g. +64, +1)' })
  phoneExtension?: string;

  @ApiPropertyOptional({ description: 'Local number, 4–15 digits.', example: '211234567' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @ValidateIf((_, v) => v != null && String(v).length > 0)
  @Matches(PHONE_NUMBER_REGEX, { message: 'Phone number must be 4–15 digits' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'NZ' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'worker', enum: ['worker', 'org_member', 'care_client'] })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({ example: 'Construction Company' })
  @IsOptional()
  @IsString()
  organisationType?: string;
}
