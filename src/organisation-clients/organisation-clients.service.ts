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
import { VerifyClientDto } from './dto';

export interface OrganisationClientRow {
  id: string;
  userId: string;
  orgId: string;
  status: string;
  requestedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  orgNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceCodeInfo {
  orgId: string;
  type: 'worker' | 'client';
  orgName?: string;
}

@Injectable()
export class OrganisationClientsService {
  private readonly logger = new Logger(OrganisationClientsService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async validateReferenceCode(code: string): Promise<ReferenceCodeInfo | null> {
    const { data, error } = await this.supabase
      .from('org_reference_codes')
      .select('org_id, type, expires_at, uses_count, max_uses')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    if (data.expires_at && new Date(data.expires_at as string) < new Date()) return null;
    if ((data.uses_count ?? 0) >= (data.max_uses ?? 1)) return null;

    const org = await this.supabase
      .from('organizations')
      .select('name')
      .eq('id', data.org_id)
      .single();

    return {
      orgId: data.org_id,
      type: data.type as 'worker' | 'client',
      orgName: org.data?.name,
    };
  }

  async claimReference(userId: string, referenceCode: string): Promise<OrganisationClientRow> {
    const info = await this.validateReferenceCode(referenceCode);
    if (!info) {
      throw new BadRequestException('Invalid or expired reference code');
    }

    if (info.type === 'client') {
      const { data: existing } = await this.supabase
        .from('organisation_clients')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', info.orgId)
        .single();

      if (existing) {
        throw new BadRequestException('You have already claimed this organisation as a client');
      }

      const { data: row, error } = await this.supabase
        .from('organisation_clients')
        .insert({
          user_id: userId,
          org_id: info.orgId,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error || !row) {
        this.logger.error('organisation_clients insert:', error);
        throw new BadRequestException('Failed to claim reference');
      }

      await this.incrementReferenceCodeUses(info.orgId, referenceCode);

      return this.mapRow(row);
    }

    if (info.type === 'worker') {
      const { data: existing } = await this.supabase
        .from('org_memberships')
        .select('user_id')
        .eq('org_id', info.orgId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        throw new BadRequestException('You are already linked to this organisation');
      }

      const { error: memError } = await this.supabase.from('org_memberships').insert({
        org_id: info.orgId,
        user_id: userId,
        role: 'recruiter',
        status: 'pending',
      });

      if (memError) {
        this.logger.error('org_memberships insert:', memError);
        throw new BadRequestException('Failed to claim reference');
      }

      await this.incrementReferenceCodeUses(info.orgId, referenceCode);

      return {
        id: '',
        userId,
        orgId: info.orgId,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as OrganisationClientRow;
    }

    throw new BadRequestException('Invalid reference code type');
  }

  private async incrementReferenceCodeUses(orgId: string, code: string): Promise<void> {
    const { data: ref } = await this.supabase
      .from('org_reference_codes')
      .select('id, uses_count, max_uses')
      .eq('org_id', orgId)
      .eq('code', code.trim().toUpperCase())
      .single();

    if (ref) {
      const newCount = (ref.uses_count ?? 0) + 1;
      await this.supabase
        .from('org_reference_codes')
        .update({
          uses_count: newCount,
          is_active: newCount < (ref.max_uses ?? 1) ? true : false,
        })
        .eq('id', ref.id);
    }
  }

  async findMyClientLinks(userId: string): Promise<OrganisationClientRow[]> {
    const { data, error } = await this.supabase
      .from('organisation_clients')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) {
      this.logger.error('organisation_clients select:', error);
      throw new BadRequestException('Failed to load client links');
    }
    return (data ?? []).map((r) => this.mapRow(r));
  }

  async listClientsForOrg(orgId: string, userId: string): Promise<OrganisationClientRow[]> {
    const { data: member } = await this.supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!member) {
      throw new ForbiddenException('You do not have access to this organisation');
    }

    const { data, error } = await this.supabase
      .from('organisation_clients')
      .select('*')
      .eq('org_id', orgId)
      .order('requested_at', { ascending: false });

    if (error) {
      this.logger.error('organisation_clients select:', error);
      throw new BadRequestException('Failed to load clients');
    }
    return (data ?? []).map((r) => this.mapRow(r));
  }

  async verifyClient(
    orgId: string,
    clientId: string,
    userId: string,
    dto: VerifyClientDto,
  ): Promise<OrganisationClientRow> {
    const { data: owner } = await this.supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .eq('status', 'active')
      .single();

    if (!owner) {
      throw new ForbiddenException('Only organisation owners can verify clients');
    }

    const { data: row, error } = await this.supabase
      .from('organisation_clients')
      .update({
        status: dto.status,
        verified_at: new Date().toISOString(),
        verified_by: userId,
        org_notes: dto.orgNotes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('org_id', orgId)
      .select('*')
      .single();

    if (error || !row) {
      throw new NotFoundException('Client link not found');
    }
    return this.mapRow(row);
  }

  private mapRow(data: Record<string, unknown>): OrganisationClientRow {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      orgId: data.org_id as string,
      status: data.status as string,
      requestedAt: data.requested_at as string,
      verifiedAt: data.verified_at as string | null,
      verifiedBy: data.verified_by as string | null,
      orgNotes: data.org_notes as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
