import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { ProfileOnboardingService } from './profile-onboarding.service';
import { SaveOnboardingDto, SubmitOnboardingDto } from './dto';

type ProfileType = 'worker' | 'personal' | 'organisation';

function toProfileType(raw?: string): ProfileType {
  if (raw === 'personal' || raw === 'organisation') return raw;
  return 'worker';
}

@ApiTags('Profile Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile-onboarding')
export class ProfileOnboardingController {
  constructor(private readonly profileOnboardingService: ProfileOnboardingService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my onboarding data for a given profile type' })
  @ApiQuery({ name: 'profile_type', enum: ['worker', 'personal', 'organisation'], required: false })
  @ApiResponse({ status: 200, description: 'Onboarding data retrieved' })
  async getMyOnboarding(
    @CurrentUser() user: { id: string },
    @Query('profile_type') profileType?: string,
  ) {
    return this.profileOnboardingService.getMyOnboarding(user.id, toProfileType(profileType));
  }

  @Post()
  @ApiOperation({ summary: 'Save onboarding data (draft)' })
  @ApiResponse({ status: 200, description: 'Onboarding data saved' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async saveOnboarding(
    @CurrentUser() user: { id: string },
    @Body() dto: SaveOnboardingDto & { profileType?: string },
  ) {
    const profileType = toProfileType(dto.profileType);
    return this.profileOnboardingService.saveOnboarding(user.id, dto, profileType);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit onboarding for review' })
  @ApiResponse({ status: 200, description: 'Onboarding submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or already submitted' })
  @ApiResponse({ status: 404, description: 'No onboarding data found' })
  async submitOnboarding(
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitOnboardingDto & { profileType?: string },
  ) {
    const profileType = toProfileType(dto.profileType);
    return this.profileOnboardingService.submitOnboarding(user.id, dto, profileType);
  }
}
