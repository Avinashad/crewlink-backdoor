import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import {
  CreateVerificationCriteriaDto,
  UpdateVerificationCriteriaDto,
  CreateVerificationBadgeDto,
  UpdateVerificationBadgeDto,
  UpdateUserVerificationDto,
} from './dto';

@Injectable()
export class VerificationService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  // ---- Criteria CRUD ----
  async getCriteria(profileType?: string, expertiseCode?: string): Promise<any[]> {
    let query = this.supabase
      .from('verification_criteria')
      .select('*')
      .order('display_order', { ascending: true });

    if (profileType) query = query.eq('profile_type', profileType);
    if (expertiseCode) query = query.or(`expertise_code.eq.${expertiseCode},expertise_code.is.null`);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getCriteriaById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('verification_criteria')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Criteria not found');
    return data;
  }

  async createCriteria(dto: CreateVerificationCriteriaDto): Promise<any> {
    const { data, error } = await this.supabase
      .from('verification_criteria')
      .insert({
        criteria_key: dto.criteria_key,
        display_name: dto.display_name,
        description: dto.description ?? null,
        profile_type: dto.profile_type,
        expertise_code: dto.expertise_code ?? null,
        country_code: dto.country_code ?? null,
        criteria_type: dto.criteria_type,
        required_document_keys: dto.required_document_keys ?? [],
        instructions: dto.instructions ?? null,
        is_active: dto.is_active ?? true,
        display_order: dto.display_order ?? 0,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateCriteria(id: string, dto: UpdateVerificationCriteriaDto): Promise<any> {
    const { data, error } = await this.supabase
      .from('verification_criteria')
      .update({
        ...(dto.criteria_key != null && { criteria_key: dto.criteria_key }),
        ...(dto.display_name != null && { display_name: dto.display_name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.profile_type != null && { profile_type: dto.profile_type }),
        ...(dto.expertise_code !== undefined && { expertise_code: dto.expertise_code }),
        ...(dto.country_code !== undefined && { country_code: dto.country_code }),
        ...(dto.criteria_type != null && { criteria_type: dto.criteria_type }),
        ...(dto.required_document_keys !== undefined && { required_document_keys: dto.required_document_keys }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.display_order !== undefined && { display_order: dto.display_order }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteCriteria(id: string): Promise<void> {
    const { error } = await this.supabase.from('verification_criteria').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ---- Badge config CRUD ----
  async getBadges(profileType?: string, expertiseCode?: string): Promise<any[]> {
    let query = this.supabase
      .from('verification_badge_configs')
      .select('*')
      .order('display_order', { ascending: true });

    if (profileType) query = query.eq('profile_type', profileType);
    if (expertiseCode) query = query.or(`expertise_code.eq.${expertiseCode},expertise_code.is.null`);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getBadgeById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('verification_badge_configs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Badge config not found');
    return data;
  }

  async createBadge(dto: CreateVerificationBadgeDto): Promise<any> {
    const { data, error } = await this.supabase
      .from('verification_badge_configs')
      .insert({
        badge_key: dto.badge_key,
        display_name: dto.display_name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        profile_type: dto.profile_type,
        expertise_code: dto.expertise_code ?? null,
        country_code: dto.country_code ?? null,
        required_criteria_keys: dto.required_criteria_keys ?? [],
        tier: dto.tier,
        is_active: dto.is_active ?? true,
        display_order: dto.display_order ?? 0,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateBadge(id: string, dto: UpdateVerificationBadgeDto): Promise<any> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.badge_key != null) payload.badge_key = dto.badge_key;
    if (dto.display_name != null) payload.display_name = dto.display_name;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.icon !== undefined) payload.icon = dto.icon;
    if (dto.color !== undefined) payload.color = dto.color;
    if (dto.profile_type != null) payload.profile_type = dto.profile_type;
    if (dto.expertise_code !== undefined) payload.expertise_code = dto.expertise_code;
    if (dto.country_code !== undefined) payload.country_code = dto.country_code;
    if (dto.required_criteria_keys !== undefined) payload.required_criteria_keys = dto.required_criteria_keys;
    if (dto.tier != null) payload.tier = dto.tier;
    if (dto.is_active !== undefined) payload.is_active = dto.is_active;
    if (dto.display_order !== undefined) payload.display_order = dto.display_order;

    const { data, error } = await this.supabase
      .from('verification_badge_configs')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteBadge(id: string): Promise<void> {
    const { error } = await this.supabase.from('verification_badge_configs').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ---- Pending verifications (admin) ----
  async getPendingVerifications(status: string = 'pending'): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('user_verifications')
      .select(
        `
        id,
        user_id,
        criteria_id,
        status,
        rejection_reason,
        reviewer_notes,
        created_at,
        verification_criteria (
          criteria_key,
          display_name,
          criteria_type,
          profile_type
        )
      `,
      )
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ---- Update user verification (verify/reject) ----
  async updateUserVerification(
    userId: string,
    criteriaId: string,
    adminUserId: string,
    dto: UpdateUserVerificationDto,
  ): Promise<any> {
    const payload: Record<string, unknown> = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };
    if (dto.status === 'verified' || dto.status === 'rejected') {
      payload.verified_by = adminUserId;
      payload.verified_at = new Date().toISOString();
    }
    if (dto.rejection_reason != null) payload.rejection_reason = dto.rejection_reason;
    if (dto.reviewer_notes != null) payload.reviewer_notes = dto.reviewer_notes;
    if (dto.expires_at != null) payload.expires_at = dto.expires_at;

    const { data, error } = await this.supabase
      .from('user_verifications')
      .update(payload)
      .eq('user_id', userId)
      .eq('criteria_id', criteriaId)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('User verification not found');
    return data;
  }

  // ---- Manually award badge ----
  async awardBadgeToUser(
    userId: string,
    badgeConfigId: string,
    awardedBy: string,
    expiresAt?: string,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_badges')
      .upsert(
        {
          user_id: userId,
          badge_config_id: badgeConfigId,
          awarded_by: awardedBy,
          expires_at: expiresAt ?? null,
          is_active: true,
        },
        { onConflict: 'user_id,badge_config_id' },
      )
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async revokeBadge(userId: string, badgeConfigId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_badges')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('badge_config_id', badgeConfigId);
    if (error) throw new BadRequestException(error.message);
  }

  // ---- User-facing: my verifications ----
  async getMyVerifications(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('user_verifications')
      .select(
        `
        id,
        criteria_id,
        status,
        verified_at,
        expires_at,
        rejection_reason,
        created_at,
        verification_criteria (
          criteria_key,
          display_name,
          criteria_type
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data || []).map((row: any) => ({
      ...row,
      criteria: row.verification_criteria,
      verification_criteria: undefined,
    }));
  }

  // ---- User-facing: my badges ----
  async getMyBadges(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('user_badges')
      .select(
        `
        id,
        badge_config_id,
        awarded_at,
        expires_at,
        is_active,
        verification_badge_configs (
          badge_key,
          display_name,
          description,
          icon,
          color,
          tier
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('awarded_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      badge_config_id: row.badge_config_id,
      awarded_at: row.awarded_at,
      expires_at: row.expires_at,
      badge: row.verification_badge_configs,
    }));
  }
}
