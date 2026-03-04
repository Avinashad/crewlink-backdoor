import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../auth/decorators';
import {
  CreateVerificationCriteriaDto,
  UpdateVerificationCriteriaDto,
  CreateVerificationBadgeDto,
  UpdateVerificationBadgeDto,
  UpdateUserVerificationDto,
} from './dto';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ---- Criteria CRUD (admin) ----
  @Get('criteria')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List verification criteria' })
  @ApiResponse({ status: 200, description: 'Criteria list' })
  async getCriteria(
    @Query('profileType') profileType?: string,
    @Query('expertiseCode') expertiseCode?: string,
  ) {
    return this.verificationService.getCriteria(profileType, expertiseCode);
  }

  @Get('criteria/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get criteria by ID' })
  @ApiResponse({ status: 200, description: 'Criteria' })
  async getCriteriaById(@Param('id') id: string) {
    return this.verificationService.getCriteriaById(id);
  }

  @Post('criteria')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create verification criteria' })
  @ApiResponse({ status: 201, description: 'Created' })
  async createCriteria(@Body() dto: CreateVerificationCriteriaDto) {
    return this.verificationService.createCriteria(dto);
  }

  @Put('criteria/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update verification criteria' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async updateCriteria(
    @Param('id') id: string,
    @Body() dto: UpdateVerificationCriteriaDto,
  ) {
    return this.verificationService.updateCriteria(id, dto);
  }

  @Delete('criteria/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete verification criteria' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async deleteCriteria(@Param('id') id: string) {
    await this.verificationService.deleteCriteria(id);
  }

  // ---- Badge config CRUD (admin) ----
  @Get('badges')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List badge configs' })
  @ApiResponse({ status: 200, description: 'Badge config list' })
  async getBadges(
    @Query('profileType') profileType?: string,
    @Query('expertiseCode') expertiseCode?: string,
  ) {
    return this.verificationService.getBadges(profileType, expertiseCode);
  }

  @Get('badges/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get badge config by ID' })
  @ApiResponse({ status: 200, description: 'Badge config' })
  async getBadgeById(@Param('id') id: string) {
    return this.verificationService.getBadgeById(id);
  }

  @Post('badges')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create badge config' })
  @ApiResponse({ status: 201, description: 'Created' })
  async createBadge(@Body() dto: CreateVerificationBadgeDto) {
    return this.verificationService.createBadge(dto);
  }

  @Put('badges/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update badge config' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async updateBadge(
    @Param('id') id: string,
    @Body() dto: UpdateVerificationBadgeDto,
  ) {
    return this.verificationService.updateBadge(id, dto);
  }

  @Delete('badges/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete badge config' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async deleteBadge(@Param('id') id: string) {
    await this.verificationService.deleteBadge(id);
  }

  // ---- Pending queue (admin) ----
  @Get('pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending verifications' })
  @ApiResponse({ status: 200, description: 'Pending user verifications' })
  async getPending(@Query('status') status?: string) {
    return this.verificationService.getPendingVerifications(status || 'pending');
  }

  // ---- Verify/reject (admin) ----
  @Put('users/:userId/criteria/:criteriaId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user verification status (verify/reject)' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async updateUserVerification(
    @CurrentUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Param('criteriaId') criteriaId: string,
    @Body() dto: UpdateUserVerificationDto,
  ) {
    return this.verificationService.updateUserVerification(
      userId,
      criteriaId,
      adminUserId,
      dto,
    );
  }

  // ---- Award badge (admin) ----
  @Post('users/:userId/badges/:badgeId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually award badge to user' })
  @ApiResponse({ status: 201, description: 'Badge awarded' })
  async awardBadge(
    @CurrentUser('id') awardedBy: string,
    @Param('userId') userId: string,
    @Param('badgeId') badgeId: string,
    @Body() body?: { expiresAt?: string },
  ) {
    return this.verificationService.awardBadgeToUser(
      userId,
      badgeId,
      awardedBy,
      body?.expiresAt,
    );
  }

  @Delete('users/:userId/badges/:badgeId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke badge from user' })
  @ApiResponse({ status: 200, description: 'Revoked' })
  async revokeBadge(
    @Param('userId') userId: string,
    @Param('badgeId') badgeId: string,
  ) {
    await this.verificationService.revokeBadge(userId, badgeId);
  }

  // ---- User-facing: my verifications & badges ----
  @Get('me/verifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my verification statuses' })
  @ApiResponse({ status: 200, description: 'My verifications' })
  async getMyVerifications(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyVerifications(userId);
  }

  @Get('me/badges')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my earned badges' })
  @ApiResponse({ status: 200, description: 'My badges' })
  async getMyBadges(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyBadges(userId);
  }
}
