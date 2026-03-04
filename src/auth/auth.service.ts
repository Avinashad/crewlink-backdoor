import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyPhoneDto,
  SendPhoneOtpDto,
} from './dto';
import { GeoIpService } from '../geoip/geoip.service';
import { OrganizationsService } from '../organizations/organizations.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    userType: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    firstName?: string;
    lastName?: string;
  };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly geoIpService: GeoIpService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async signup(signupDto: SignupDto, clientIp?: string | null): Promise<AuthResponse> {
    const { email, password, firstName, lastName, phoneExtension, phoneNumber, userType, countryCode, inviteCode } =
      signupDto;

    let finalCountryCode = countryCode;

    // If no country code was provided by the client, try to infer one from GeoIP
    if (!finalCountryCode && clientIp) {
      const detectedCode = await this.geoIpService.detectCountryCode(clientIp);
      if (detectedCode) {
        finalCountryCode = detectedCode;
      }
    }

    // Build E.164 phone and store extension + number separately in metadata
    let phone: string | undefined;
    const hasPhone = phoneExtension && phoneNumber && String(phoneNumber).replace(/\D/g, '').length >= 4;
    if (hasPhone) {
      const digits = String(phoneNumber).replace(/\D/g, '');
      const extDigits = String(phoneExtension).replace(/\D/g, '');
      phone = `+${extDigits}${digits}`;
    }

    const userMetadata: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      country_code: finalCountryCode,
    };
    if (phone) {
      userMetadata.phone = phone;
      userMetadata.phone_extension = phoneExtension;
      userMetadata.phone_number = String(phoneNumber).replace(/\D/g, '');
    }

    // Use Supabase Auth to create user
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new ConflictException('User with this email already exists');
      }
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Failed to create user');
    }

    const createdUserId = authData.user.id;

    // If an invite code was provided, automatically join the organization with the
    // role defined in the invitation.
    if (inviteCode) {
      // OrganizationsService handles all validation (expired / invalid / mismatched email, etc.)
      await this.organizationsService.acceptInvitation({ inviteCode }, createdUserId);
    }

    // Set the initial active profile type in user_active_profile table
    const initialProfileType = userType === 'care_client' ? 'personal'
      : userType === 'org_member' ? 'organisation'
      : 'worker';
    await this.supabase
      .from('user_active_profile')
      .upsert(
        { user_id: createdUserId, profile_type: initialProfileType },
        { onConflict: 'user_id' },
      );

    // Generate our own JWT tokens for API access
    const tokens = await this.generateTokens(createdUserId, email, userType);

    return {
      user: {
        id: createdUserId,
        email,
        userType,
        emailVerified: !!authData.user.email_confirmed_at,
        phoneVerified: !!authData.user.phone_confirmed_at,
        firstName,
        lastName,
      },
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Use Supabase Auth to sign in
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!authData.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userMetadata = authData.user.user_metadata || {};
    const userType = userMetadata.user_type || 'worker';

    // Generate our own JWT tokens for API access
    const tokens = await this.generateTokens(authData.user.id, email, userType);

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || email,
        userType,
        emailVerified: !!authData.user.email_confirmed_at,
        phoneVerified: !!authData.user.phone_confirmed_at,
        firstName: userMetadata.first_name,
        lastName: userMetadata.last_name,
      },
      tokens,
    };
  }

  async refreshTokens(userId: string, email: string): Promise<AuthTokens> {
    // Get user from Supabase to verify they still exist
    const { data: userData, error } = await this.supabase.auth.admin.getUserById(userId);
    
    if (error || !userData.user) {
      throw new UnauthorizedException('User not found');
    }

    const userType = userData.user.user_metadata?.user_type || 'worker';
    return this.generateTokens(userId, email, userType);
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Sign out from Supabase
    await this.supabase.auth.signOut();
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email, redirectUrl } = forgotPasswordDto;

    const allowedUrls: string[] = this.configService.get('frontend.urls') || ['http://localhost:3000'];
    const baseUrl = redirectUrl && allowedUrls.includes(redirectUrl) ? redirectUrl : allowedUrls[0];

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback`,
    });

    if (error) {
      console.error('Password reset error:', error);
    }

    // Don't reveal if email exists
    return { message: 'If an account with this email exists, a password reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // First, verify the recovery token with Supabase
    const { data: verifyData, error: verifyError } = await this.supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError) {
      console.error('Token verification error:', verifyError);
      throw new BadRequestException('Invalid or expired reset token. Please request a new password reset.');
    }

    if (!verifyData.user) {
      throw new BadRequestException('Invalid reset token');
    }

    // Now update the user's password
    const { error: updateError } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      throw new BadRequestException('Failed to update password. Please try again.');
    }

    // Sign out to clear the recovery session
    await this.supabase.auth.signOut();

    return { message: 'Password reset successfully' };
  }

  async sendVerificationEmail(email: string): Promise<{ message: string }> {
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // Supabase handles email verification via magic link
    // This endpoint is for when user clicks the link
    const { error } = await this.supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    return { message: 'Email verified successfully' };
  }

  async sendPhoneOtp(sendPhoneOtpDto: SendPhoneOtpDto): Promise<{ message: string }> {
    const { phone } = sendPhoneOtpDto;

    const { error } = await this.supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyPhone(userId: string, verifyPhoneDto: VerifyPhoneDto): Promise<{ message: string }> {
    const { phone, otp } = verifyPhoneDto;

    const { error } = await this.supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      throw new BadRequestException('Invalid OTP');
    }

    return { message: 'Phone verified successfully' };
  }

  async getProfile(userId: string) {
    const { data: userData, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error || !userData.user) {
      throw new UnauthorizedException('User not found');
    }

    const user = userData.user;
    const metadata = user.user_metadata || {};

    return {
      id: user.id,
      email: user.email,
      userType: metadata.user_type || 'worker',
      emailVerified: !!user.email_confirmed_at,
      phoneVerified: !!user.phone_confirmed_at,
      firstName: metadata.first_name,
      lastName: metadata.last_name,
      phone: user.phone || (metadata.phone as string),
      phoneExtension: metadata.phone_extension as string | undefined,
      phoneNumber: metadata.phone_number as string | undefined,
      countryCode: metadata.country_code,
      organisationType: metadata.organisation_type,
      createdAt: user.created_at,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    userType: string,
  ): Promise<AuthTokens> {
    const jwtExpiration = this.configService.get<string>('jwt.expiration') || '7d';
    const jwtRefreshExpiration = this.configService.get<string>('jwt.refreshExpiration') || '30d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, userType },
        { expiresIn: jwtExpiration as any },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, tokenType: 'refresh' },
        { expiresIn: jwtRefreshExpiration as any },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 604800, // 7 days in seconds
    };
  }
}
