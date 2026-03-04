import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { CountriesModule } from './countries/countries.module';
import { ExpertiseModule } from './expertise/expertise.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesModule } from './roles/roles.module';
import { JobsModule } from './jobs/jobs.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { JobInquiriesModule } from './job-inquiries/job-inquiries.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ServicesModule } from './services/services.module';
import { VettingTilesModule } from './vetting-tiles/vetting-tiles.module';
import { ProfileOnboardingModule } from './profile-onboarding/profile-onboarding.module';
import { TemplatesModule } from './templates/templates.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { ProfileConfigModule } from './profile-config/profile-config.module';
import { DocumentConfigModule } from './document-config/document-config.module';
import { SearchModule } from './search/search.module';
import { VerificationModule } from './verification/verification.module';
import { ContractsModule } from './contracts/contracts.module';
import { PlatformFeesModule } from './platform-fees/platform-fees.module';
import { PublicHolidaysModule } from './public-holidays/public-holidays.module';
import { RoleResponsibilitiesModule } from './role-responsibilities/role-responsibilities.module';
import { JwtAuthGuard } from './auth/guards';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    AddressesModule,
    CountriesModule,
    ExpertiseModule,
    OnboardingModule,
    OrganizationsModule,
    RolesModule,
    JobsModule,
    JobApplicationsModule,
    JobInquiriesModule,
    ConversationsModule,
    ServicesModule,
    VettingTilesModule,
    ProfileOnboardingModule,
    TemplatesModule,
    AppSettingsModule,
    ProfileConfigModule,
    DocumentConfigModule,
    SearchModule,
    VerificationModule,
    ContractsModule,
    PlatformFeesModule,
    PublicHolidaysModule,
    RoleResponsibilitiesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard - all routes require auth by default
    // Use @Public() decorator to make routes public
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
