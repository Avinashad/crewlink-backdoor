import { Module } from '@nestjs/common';
import { ProfileOnboardingController } from './profile-onboarding.controller';
import { ProfileOnboardingService } from './profile-onboarding.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfileOnboardingController],
  providers: [ProfileOnboardingService],
  exports: [ProfileOnboardingService],
})
export class ProfileOnboardingModule {}
