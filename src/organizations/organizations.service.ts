import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  CreateInvitationDto,
  AcceptInvitationDto,
} from './dto';

export interface Organization {
  id: string;
  name: string;
  type?: string;
  description?: string;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessRegistrationId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  members: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    joinedAt: string;
  }>;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  inviteCode: string;
  email?: string;
  role: string;
  createdBy: string;
  expiresAt?: string;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  acceptedBy?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationsListResponse {
  organizations: Organization[];
  total: number;
  page: number;
  limit: number;
}

export interface OrganizationMembership {
  orgId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async create(createDto: CreateOrganizationDto, userId: string): Promise<Organization> {
    try {
      // Check if organization with same name and type already exists
      const duplicateQuery = this.supabase
        .from('organizations')
        .select('id')
        .eq('name', createDto.name);
      if (createDto.type) {
        duplicateQuery.eq('org_type_code', createDto.type);
      }
      const { data: existing } = await duplicateQuery.maybeSingle();

      if (existing) {
        throw new BadRequestException('Organization with this name and type already exists');
      }

      // Create organization
      const { data: org, error } = await this.supabase
        .from('organizations')
        .insert({
          name: createDto.name,
          org_type_code: createDto.type || null,
          description: createDto.description || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating organization:', error);
        throw new BadRequestException(`Failed to create organization: ${error.message}`);
      }

      // Add creator as owner via SECURITY DEFINER function (bypasses RLS bootstrap problem)
      const { error: memberError } = await this.supabase.rpc('add_org_owner', {
        p_org_id: org.id,
        p_user_id: userId,
      });
      if (memberError) {
        this.logger.error('Error bootstrapping owner membership:', memberError);
        throw new BadRequestException(`Failed to add owner: ${memberError.message}`);
      }

      const createdOrg = await this.findOne(org.id, userId);
      if (!createdOrg) {
        throw new BadRequestException('Failed to retrieve created organization');
      }
      return createdOrg;
    } catch (error) {
      this.logger.error('Error in create organization:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    userId?: string,
  ): Promise<OrganizationsListResponse> {
    try {
      let organizationIds: string[] | undefined;

      // If userId provided, first get organization IDs user belongs to
      if (userId) {
        const { data: memberships, error: membershipError } = await this.supabase
          .from('org_memberships')
          .select('org_id')
          .eq('user_id', userId);

        if (membershipError) {
          this.logger.error('Error fetching memberships:', membershipError);
          throw new BadRequestException(`Failed to fetch memberships: ${membershipError.message}`);
        }

        organizationIds = (memberships || []).map((m) => m.org_id);
        
        // If user has no memberships, return empty result
        if (organizationIds.length === 0) {
          return {
            organizations: [],
            total: 0,
            page,
            limit,
          };
        }
      }

      let query = this.supabase.from('organizations').select('*', { count: 'exact' });

      // If userId provided, filter by organization IDs
      if (organizationIds && organizationIds.length > 0) {
        query = query.in('id', organizationIds);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        this.logger.error('Error fetching organizations:', error);
        throw new BadRequestException(`Failed to fetch organizations: ${error.message}`);
      }

      // Get member counts and details for each organization
      const organizations = await Promise.all(
        (data || []).map(async (org) => {
          const members = await this.getOrganizationMembers(org.id);
          return {
            id: org.id,
            name: org.name,
            type: org.org_type_code,
            description: org.description,
            businessEmail: org.business_email ?? null,
            businessPhone: org.business_phone ?? null,
            businessRegistrationId: org.business_registration_id ?? null,
            createdBy: org.created_by,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
            memberCount: members.length,
            members,
          };
        }),
      );

      return {
        organizations,
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error in findAll organizations:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch organizations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convenience helper: return the first organization for a given user (or null).
   */
  async findPrimaryForUser(userId: string): Promise<Organization | null> {
    const result = await this.findAll(1, 1, userId);
    if (!result.organizations.length) {
      return null;
    }
    return result.organizations[0];
  }

  /**
   * Return raw memberships for the current user, including pending/active status.
   */
  async getUserMemberships(userId: string): Promise<OrganizationMembership[]> {
    const { data, error } = await this.supabase
      .from('org_memberships')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true });

    if (error) {
      this.logger.error('Error fetching user memberships:', error);
      throw new BadRequestException(`Failed to fetch memberships: ${error.message}`);
    }

    return (data || []).map((m: any) => ({
      orgId: m.org_id,
      userId: m.user_id,
      role: m.role,
      status: m.status || 'active',
      joinedAt: m.joined_at,
    }));
  }

  /**
   * Pending membership requests for a given organization, with basic user details.
   * Only accessible to owners/admins of that organization.
   */
  async getPendingMembershipsForOrg(
    orgId: string,
    currentUserId: string,
  ): Promise<
    Array<
      OrganizationMembership & {
        email: string;
        firstName?: string;
        lastName?: string;
      }
    >
  > {
    const hasPermission = await this.checkUserPermission(orgId, currentUserId, ['owner', 'admin']);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view membership requests');
    }

    const { data, error } = await this.supabase
      .from('org_memberships')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true });

    if (error) {
      this.logger.error('Error fetching pending memberships:', error);
      throw new BadRequestException(`Failed to fetch pending memberships: ${error.message}`);
    }

    const result = await Promise.all(
      (data || []).map(async (m: any) => {
        try {
          const { data: userData, error: userError } = await this.supabase.auth.admin.getUserById(
            m.user_id,
          );
          if (userError || !userData?.user) {
            return null;
          }
          const metadata = userData.user.user_metadata || {};
          const base: OrganizationMembership = {
            orgId: m.org_id,
            userId: m.user_id,
            role: m.role,
            status: m.status || 'pending',
            joinedAt: m.joined_at,
          };
          return {
            ...base,
            email: userData.user.email || '',
            firstName: metadata.first_name,
            lastName: metadata.last_name,
          };
        } catch (err) {
          this.logger.warn(`Failed to fetch user ${m.user_id} for pending membership:`, err);
          return null;
        }
      }),
    );

    return result.filter((m): m is NonNullable<typeof m> => m !== null);
  }

  /**
   * Approve or reject a pending membership for an organization.
   */
  async decidePendingMembership(
    orgId: string,
    memberUserId: string,
    decision: 'approve' | 'reject',
    currentUserId: string,
  ): Promise<void> {
    const hasPermission = await this.checkUserPermission(orgId, currentUserId, ['owner', 'admin']);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update membership requests');
    }

    const nextStatus = decision === 'approve' ? 'active' : 'inactive';

    const { error } = await this.supabase
      .from('org_memberships')
      .update({ status: nextStatus })
      .eq('org_id', orgId)
      .eq('user_id', memberUserId)
      .eq('status', 'pending');

    if (error) {
      this.logger.error('Error updating membership status:', error);
      throw new BadRequestException(`Failed to update membership: ${error.message}`);
    }
  }

  async findOne(orgId: string, userId?: string): Promise<Organization | null> {
    try {
      const { data: org, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error || !org) {
        if (error?.code === 'PGRST116') {
          return null;
        }
        this.logger.error('Error fetching organization:', error);
        throw new BadRequestException(`Failed to fetch organization: ${error?.message || 'Not found'}`);
      }

      // Check if user has access (if userId provided)
      if (userId) {
        const { data: membership } = await this.supabase
          .from('org_memberships')
          .select('user_id')
          .eq('org_id', orgId)
          .eq('user_id', userId)
          .single();

        if (!membership) {
          throw new ForbiddenException('You do not have access to this organization');
        }
      }

      const members = await this.getOrganizationMembers(orgId);

      return {
        id: org.id,
        name: org.name,
        type: org.org_type_code,
        description: org.description,
        businessEmail: org.business_email ?? null,
        businessPhone: org.business_phone ?? null,
        businessRegistrationId: org.business_registration_id ?? null,
        createdBy: org.created_by,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        memberCount: members.length,
        members,
      };
    } catch (error) {
      this.logger.error('Error in findOne organization:', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateOrganization(
    orgId: string,
    dto: UpdateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    const hasPermission = await this.checkUserPermission(orgId, userId, ['owner', 'admin']);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this organization');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.org_type_code = dto.type || null;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.businessEmail !== undefined) updateData.business_email = dto.businessEmail;
    if (dto.businessPhone !== undefined) updateData.business_phone = dto.businessPhone;
    if (dto.businessRegistrationId !== undefined) updateData.business_registration_id = dto.businessRegistrationId;

    const { error } = await this.supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId);

    if (error) {
      throw new BadRequestException(`Failed to update organization: ${error.message}`);
    }

    const updated = await this.findOne(orgId, userId);
    if (!updated) {
      throw new BadRequestException('Failed to retrieve updated organization');
    }
    return updated;
  }

  async addMember(orgId: string, addMemberDto: AddMemberDto, userId: string): Promise<void> {
    try {
      // Check if user has permission (must be owner or admin)
      const hasPermission = await this.checkUserPermission(orgId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to add members');
      }

      await this.addMemberInternal(orgId, addMemberDto.userId, addMemberDto.role || 'member', userId);
    } catch (error) {
      this.logger.error('Error adding member:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async addMemberInternal(
    orgId: string,
    memberUserId: string,
    role: string,
    invitedBy: string,
  ): Promise<void> {
    // Check if user is already a member
    const { data: existing } = await this.supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', memberUserId)
      .single();

    if (existing) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const { error } = await this.supabase.from('org_memberships').insert({
      org_id: orgId,
      user_id: memberUserId,
      role: role === 'admin' ? 'recruiter' : role === 'member' ? 'recruiter' : role,
    });

    if (error) {
      this.logger.error('Error inserting membership:', error);
      throw new BadRequestException(`Failed to add member: ${error.message}`);
    }
  }

  /**
   * Allow a worker/personal user to request association with an organization.
   * Creates a membership with status='pending' if none exists yet.
   */
  async applyAsWorker(orgId: string, userId: string): Promise<void> {
    // Check organization exists
    const { data: org, error: orgError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      throw new NotFoundException('Organization not found');
    }

    // Check existing membership
    const { data: existing } = await this.supabase
      .from('org_memberships')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      const status = existing.status || 'active';
      if (status === 'pending') {
        throw new BadRequestException('You already have a pending association request for this organization');
      }
      if (status === 'active') {
        throw new BadRequestException('You are already a member of this organization');
      }
      // For any other status (e.g. suspended), block for now.
      throw new BadRequestException('You cannot request association with this organization at this time');
    }

    const { error } = await this.supabase.from('org_memberships').insert({
      org_id: orgId,
      user_id: userId,
      role: 'recruiter', // maps to staff/admin-style role in permission checks
      status: 'pending',
    });

    if (error) {
      this.logger.error('Error creating pending membership:', error);
      throw new BadRequestException(`Failed to request association: ${error.message}`);
    }
  }

  async removeMember(orgId: string, memberUserId: string, userId: string): Promise<void> {
    try {
      // Check if user has permission (must be owner or admin)
      const hasPermission = await this.checkUserPermission(orgId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to remove members');
      }

      // Prevent removing the last owner
      const { data: owners } = await this.supabase
        .from('org_memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'owner');

      if (owners && owners.length === 1 && owners[0].user_id === memberUserId) {
        throw new BadRequestException('Cannot remove the last owner of the organization');
      }

      const { error } = await this.supabase
        .from('org_memberships')
        .delete()
        .eq('org_id', orgId)
        .eq('user_id', memberUserId);

      if (error) {
        this.logger.error('Error removing member:', error);
        throw new BadRequestException(`Failed to remove member: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error removing member:', error);
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateMemberRole(
    orgId: string,
    memberUserId: string,
    newRole: string,
    userId: string,
  ): Promise<void> {
    try {
      // Check if user has permission (must be owner or admin)
      const hasPermission = await this.checkUserPermission(orgId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to update member roles');
      }

      // Prevent changing the last owner's role
      const { data: owners } = await this.supabase
        .from('org_memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'owner');

      if (owners && owners.length === 1 && owners[0].user_id === memberUserId && newRole !== 'owner') {
        throw new BadRequestException('Cannot change the role of the last owner');
      }

      const roleVal = newRole === 'admin' || newRole === 'member' ? 'recruiter' : newRole;
      const { error } = await this.supabase
        .from('org_memberships')
        .update({ role: roleVal })
        .eq('org_id', orgId)
        .eq('user_id', memberUserId);

      if (error) {
        this.logger.error('Error updating member role:', error);
        throw new BadRequestException(`Failed to update member role: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error updating member role:', error);
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update member role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createInvitation(
    orgId: string,
    createInvitationDto: CreateInvitationDto,
    userId: string,
  ): Promise<OrganizationInvitation> {
    try {
      // Check if user has permission (must be owner or admin)
      const hasPermission = await this.checkUserPermission(orgId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to create invitations');
      }

      // Generate invite code (try database function first, fallback to app generation)
      let inviteCode: string;
      try {
        const { data: codeData, error: codeError } = await this.supabase.rpc('generate_invite_code');
        if (codeError || !codeData) {
          inviteCode = this.generateInviteCode();
        } else {
          inviteCode = codeData;
        }
      } catch (err) {
        // Fallback: generate code in application
        inviteCode = this.generateInviteCode();
      }

      // Ensure code is unique
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await this.supabase
          .from('org_invitations')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();

        if (!existing) {
          break; // Code is unique
        }
        inviteCode = this.generateInviteCode();
        attempts++;
      }

      const { data: invitation, error } = await this.supabase
        .from('org_invitations')
        .insert({
          organization_id: orgId,
          invite_code: inviteCode,
          email: createInvitationDto.email || null,
          role: createInvitationDto.role || 'member',
          created_by: userId,
          expires_at: createInvitationDto.expiresAt ? new Date(createInvitationDto.expiresAt).toISOString() : null,
          max_uses: createInvitationDto.maxUses || 1,
          uses_count: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating invitation:', error);
        throw new BadRequestException(`Failed to create invitation: ${error.message}`);
      }

      return this.mapInvitation(invitation);
    } catch (error) {
      this.logger.error('Error creating invitation:', error);
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto, userId: string): Promise<void> {
    try {
      // Find invitation
      const { data: invitation, error: findError } = await this.supabase
        .from('org_invitations')
        .select('*')
        .eq('invite_code', acceptInvitationDto.inviteCode)
        .eq('is_active', true)
        .single();

      if (findError || !invitation) {
        throw new NotFoundException('Invalid or expired invitation code');
      }

      // Check expiration
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        throw new BadRequestException('Invitation code has expired');
      }

      // Check if already used up
      if (invitation.uses_count >= invitation.max_uses) {
        throw new BadRequestException('Invitation code has reached maximum uses');
      }

      // Check if email-specific invitation matches
      if (invitation.email) {
        const { data: user } = await this.supabase.auth.admin.getUserById(userId);
        if (user?.user?.email !== invitation.email) {
          throw new ForbiddenException('This invitation is for a different email address');
        }
      }

      // Check if user is already a member
      const { data: existing } = await this.supabase
        .from('org_memberships')
        .select('user_id')
        .eq('org_id', invitation.organization_id)
        .eq('user_id', userId)
        .single();

      if (existing) {
        throw new BadRequestException('You are already a member of this organization');
      }

      // Add user as member
      await this.addMemberInternal(
        invitation.organization_id,
        userId,
        invitation.role,
        invitation.created_by,
      );

      // Update invitation usage
      const { error: updateError } = await this.supabase
        .from('org_invitations')
        .update({
          uses_count: invitation.uses_count + 1,
          accepted_by: userId,
          accepted_at: new Date().toISOString(),
          is_active: invitation.uses_count + 1 >= invitation.max_uses ? false : true,
        })
        .eq('id', invitation.id);

      if (updateError) {
        this.logger.error('Error updating invitation:', updateError);
        // Don't throw - membership was already created
      }
    } catch (error) {
      this.logger.error('Error accepting invitation:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getInvitations(orgId: string, userId: string): Promise<OrganizationInvitation[]> {
    try {
      // Check if user has permission (must be owner or admin)
      const hasPermission = await this.checkUserPermission(orgId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to view invitations');
      }

      const { data: invitations, error } = await this.supabase
        .from('org_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching invitations:', error);
        throw new BadRequestException(`Failed to fetch invitations: ${error.message}`);
      }

      return (invitations || []).map((inv) => this.mapInvitation(inv));
    } catch (error) {
      this.logger.error('Error getting invitations:', error);
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async revokeInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // Get invitation to check organization
      const { data: invitation, error: findError } = await this.supabase
        .from('org_invitations')
        .select('organization_id')
        .eq('id', invitationId)
        .single();

      if (findError || !invitation) {
        throw new NotFoundException('Invitation not found');
      }

      // Check if user has permission (must be owner or admin)
      const hasPermission = await this.checkUserPermission(
        invitation.organization_id,
        userId,
        ['owner', 'admin'],
      );
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to revoke invitations');
      }

      const { error } = await this.supabase
        .from('org_invitations')
        .update({ is_active: false })
        .eq('id', invitationId);

      if (error) {
        this.logger.error('Error revoking invitation:', error);
        throw new BadRequestException(`Failed to revoke invitation: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error revoking invitation:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to revoke invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async getOrganizationMembers(orgId: string) {
    const { data: memberships, error } = await this.supabase
      .from('org_memberships')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (error) {
      this.logger.error('Error fetching members:', error);
      return [];
    }

    // Get user details for each member
    const members = await Promise.all(
      (memberships || []).map(async (membership) => {
        try {
          const { data: user, error: userError } = await this.supabase.auth.admin.getUserById(
            membership.user_id,
          );
          if (userError || !user.user) {
            return null;
          }
          const metadata = user.user.user_metadata || {};
          return {
            id: membership.user_id,
            email: user.user.email || '',
            firstName: metadata.first_name,
            lastName: metadata.last_name,
            role: membership.role,
            joinedAt: membership.joined_at,
          };
        } catch (err) {
          this.logger.warn(`Failed to fetch user ${membership.user_id}:`, err);
          return null;
        }
      }),
    );

    return members.filter((m) => m !== null);
  }

  private async checkUserPermission(
    orgId: string,
    userId: string,
    allowedRoles: string[],
  ): Promise<boolean> {
    const { data: membership } = await this.supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership || !membership.role) {
      return false;
    }
    // Map 'recruiter' to admin/member for permission checks
    const role = membership.role === 'recruiter' ? 'admin' : membership.role;
    return allowedRoles.includes(role);
  }

  private generateInviteCode(): string {
    // Generate 8-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private mapInvitation(inv: any): OrganizationInvitation {
    return {
      id: inv.id,
      organizationId: inv.organization_id,
      inviteCode: inv.invite_code,
      email: inv.email,
      role: inv.role,
      createdBy: inv.created_by,
      expiresAt: inv.expires_at,
      maxUses: inv.max_uses,
      usesCount: inv.uses_count,
      isActive: inv.is_active,
      acceptedBy: inv.accepted_by,
      acceptedAt: inv.accepted_at,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    };
  }
}
