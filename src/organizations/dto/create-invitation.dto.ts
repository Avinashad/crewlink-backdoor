import { IsString, IsOptional, IsEmail, IsInt, Min, Max, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiPropertyOptional({ 
    description: 'Email address for specific invitation (optional for open invite codes)',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Role to assign when invitation is accepted',
  enum: ['owner', 'admin', 'member', 'manager', 'recruiter'],
  default: 'member'
  })
  @IsString()
  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'manager', 'recruiter'])
  role?: string = 'member';

  @ApiPropertyOptional({ 
    description: 'Expiration date (ISO string)',
    example: '2026-12-31T23:59:59Z'
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ 
    description: 'Maximum number of uses for this invite code',
    default: 1,
    minimum: 1,
    maximum: 1000
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxUses?: number = 1;
}
