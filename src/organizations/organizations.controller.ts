import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  UseGuards,
  Param,
  Query,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  CreateInvitationDto,
  AcceptInvitationDto,
} from './dto';
import { OrganisationClientsService } from '../organisation-clients/organisation-clients.service';
import { ClaimReferenceDto, VerifyClientDto } from '../organisation-clients/dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly organisationClientsService: OrganisationClientsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrganization(
    @Body() createDto: CreateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.create(createDto, user.id || user.sub);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all organizations (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getAllOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.organizationsService.findAll(pageNum, limitNum);
  }

  @Get()
  @ApiOperation({ summary: 'Get organizations for current user' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getMyOrganizations(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.organizationsService.findAll(pageNum, limitNum, user.id || user.sub);
  }

  @Get('my-organization')
  @ApiOperation({ summary: 'Get the primary organization for the current user' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getMyPrimaryOrganization(@CurrentUser() user: any) {
    const org = await this.organizationsService.findPrimaryForUser(user.id || user.sub);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  @Get('me/memberships')
  @ApiOperation({ summary: 'Get raw organization memberships for current user' })
  @ApiResponse({ status: 200, description: 'Memberships retrieved successfully' })
  async getMyMemberships(@CurrentUser() user: any) {
    return this.organizationsService.getUserMemberships(user.id || user.sub);
  }

  @Get('validate-reference-code')
  @Public()
  @ApiOperation({ summary: 'Validate a reference code (public, for signup)' })
  @ApiResponse({ status: 200, description: 'Returns orgId and type (worker|client) if valid' })
  async validateReferenceCode(@Query('code') code: string) {
    const info = await this.organisationClientsService.validateReferenceCode(code ?? '');
    return info ?? { valid: false };
  }

  @Post('claim-reference')
  @ApiOperation({ summary: 'Claim a reference code after signup (creates pending client or worker link)' })
  @ApiResponse({ status: 201, description: 'Reference claimed successfully' })
  async claimReference(
    @Body() dto: ClaimReferenceDto,
    @CurrentUser() user: any,
  ) {
    return this.organisationClientsService.claimReference(user.id || user.sub, dto.referenceCode);
  }

  @Get('my-client-links')
  @ApiOperation({ summary: 'Get current user organisation client links (pending/approved/blocked)' })
  @ApiResponse({ status: 200, description: 'Client links retrieved successfully' })
  async getMyClientLinks(@CurrentUser() user: any) {
    return this.organisationClientsService.findMyClientLinks(user.id || user.sub);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get organization by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationById(@Param('id') orgId: string) {
    const organization = await this.organizationsService.findOne(orgId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID (must be a member)' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMyOrganization(
    @Param('id') orgId: string,
    @CurrentUser() user: any,
  ) {
    const organization = await this.organizationsService.findOne(orgId, user.id || user.sub);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization details' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateOrganization(
    @Param('id') orgId: string,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.updateOrganization(orgId, updateDto, user.id || user.sub);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to organization' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async addMember(
    @Param('id') orgId: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.addMember(orgId, addMemberDto, user.id || user.sub);
    return { message: 'Member added successfully' };
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from organization' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async removeMember(
    @Param('id') orgId: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.removeMember(orgId, memberUserId, user.id || user.sub);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateMemberRole(
    @Param('id') orgId: string,
    @Param('userId') memberUserId: string,
    @Body() body: { role: string },
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.updateMemberRole(orgId, memberUserId, body.role, user.id || user.sub);
    return { message: 'Member role updated successfully' };
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Create an invitation for organization' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createInvitation(
    @Param('id') orgId: string,
    @Body() createInvitationDto: CreateInvitationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.createInvitation(orgId, createInvitationDto, user.id || user.sub);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'Get all invitations for organization' })
  @ApiResponse({ status: 200, description: 'Invitations retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getInvitations(
    @Param('id') orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.getInvitations(orgId, user.id || user.sub);
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an invitation' })
  @ApiResponse({ status: 204, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @Param('id') orgId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.revokeInvitation(invitationId, user.id || user.sub);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept an invitation using invite code' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.acceptInvitation(acceptInvitationDto, user.id || user.sub);
    return { message: 'Invitation accepted successfully' };
  }

  @Post(':id/apply-as-worker')
  @ApiOperation({ summary: 'Request association with an organization as a worker' })
  @ApiResponse({ status: 200, description: 'Association request submitted successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async applyAsWorker(
    @Param('id') orgId: string,
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.applyAsWorker(orgId, user.id || user.sub);
    return { message: 'Association request submitted successfully' };
  }

  @Get(':id/memberships/pending')
  @ApiOperation({ summary: 'Get pending membership requests for an organization' })
  @ApiResponse({ status: 200, description: 'Pending memberships retrieved successfully' })
  async getPendingMemberships(
    @Param('id') orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.getPendingMembershipsForOrg(orgId, user.id || user.sub);
  }

  @Put(':id/memberships/:userId/decision')
  @ApiOperation({ summary: 'Approve or reject a pending membership' })
  @ApiResponse({ status: 200, description: 'Membership decision applied successfully' })
  async decideMembership(
    @Param('id') orgId: string,
    @Param('userId') memberUserId: string,
    @Body() body: { decision: 'approve' | 'reject' },
    @CurrentUser() user: any,
  ) {
    await this.organizationsService.decidePendingMembership(
      orgId,
      memberUserId,
      body.decision,
      user.id || user.sub,
    );
    return { message: 'Membership updated successfully' };
  }

  @Get(':id/clients')
  @ApiOperation({ summary: 'List organisation clients (pending/approved/blocked) for org members' })
  @ApiResponse({ status: 200, description: 'Clients retrieved successfully' })
  async getOrgClients(
    @Param('id') orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.organisationClientsService.listClientsForOrg(orgId, user.id || user.sub);
  }

  @Patch(':id/clients/:clientId')
  @ApiOperation({ summary: 'Verify or block a client (org owner only)' })
  @ApiResponse({ status: 200, description: 'Client verification updated successfully' })
  async verifyClient(
    @Param('id') orgId: string,
    @Param('clientId') clientId: string,
    @Body() dto: VerifyClientDto,
    @CurrentUser() user: any,
  ) {
    return this.organisationClientsService.verifyClient(orgId, clientId, user.id || user.sub, dto);
  }
}
