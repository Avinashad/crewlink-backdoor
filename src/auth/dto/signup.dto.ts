import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserType {
  WORKER = 'worker',
  ORG_MEMBER = 'org_member',
  CARE_CLIENT = 'care_client',
}

/** E.164 dial code: + followed by 1–4 digits */
const PHONE_EXTENSION_REGEX = /^\+[1-9]\d{0,3}$/;
/** Local number: digits only, 4–15 chars */
const PHONE_NUMBER_REGEX = /^\d{4,15}$/;

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ssword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Country dial code in E.164 form (e.g. +64). Required if phoneNumber is provided.',
    example: '+64',
  })
  @ValidateIf((o) => (o.phoneNumber ?? '').trim().length > 0)
  @IsString()
  @Matches(PHONE_EXTENSION_REGEX, {
    message: 'Phone extension must be a valid dial code (e.g. +64, +1, +44)',
  })
  phoneExtension?: string;

  @ApiPropertyOptional({
    description: 'Local phone number (digits only, 4–15 chars). If provided, phoneExtension is required.',
    example: '211234567',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @ValidateIf((_, v) => v != null && String(v).length > 0)
  @Matches(PHONE_NUMBER_REGEX, {
    message: 'Phone number must be 4–15 digits (no spaces or symbols)',
  })
  phoneNumber?: string;

  @ApiProperty({ enum: UserType, example: UserType.WORKER })
  @IsEnum(UserType)
  userType: UserType;

  @ApiPropertyOptional({ example: 'NZ' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Optional organization invite code. If provided, user will be added to the organization with the role defined in the invitation.',
    example: 'ABCD1234',
  })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
