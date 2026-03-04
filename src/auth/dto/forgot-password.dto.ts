import { IsEmail, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000', description: 'Frontend URL for the password reset redirect' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;
}
