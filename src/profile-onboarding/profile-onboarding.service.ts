import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { SaveOnboardingDto, SubmitOnboardingDto } from './dto';

export interface ProfileOnboarding {
  id: string;
  userId: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  onboardingData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

interface FieldMapping {
  target: {
    table: string;
    column: string;
  };
  type: 'direct' | 'array' | 'document' | 'jsonb';
  dataType: string;
  required?: boolean;
  transform?: string;
}

@Injectable()
export class ProfileOnboardingService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async getMyOnboarding(
    userId: string,
    profileType: 'worker' | 'personal' | 'organisation' = 'worker',
  ): Promise<ProfileOnboarding | null> {
    const { data, error } = await this.supabase
      .from('profile_onboarding')
      .select('*')
      .eq('user_id', userId)
      .eq('profile_type', profileType)
      .single();

    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw new BadRequestException('Failed to fetch onboarding data');
    }

    return data ? this.mapRow(data) : null;
  }

  async saveOnboarding(
    userId: string,
    dto: SaveOnboardingDto,
    profileType: 'worker' | 'personal' | 'organisation' = 'worker',
  ): Promise<ProfileOnboarding> {
    const onboardingData = {
      countries: dto.countries,
      expertiseCodes: dto.expertiseCodes,
      questions: dto.questions,
      services: dto.services,
      vetting: dto.vetting || [],
    };

    // Upsert using the composite unique key (user_id, profile_type)
    const { data, error } = await this.supabase
      .from('profile_onboarding')
      .upsert(
        {
          user_id: userId,
          profile_type: profileType,
          status: 'draft',
          onboarding_data: onboardingData,
        },
        { onConflict: 'user_id,profile_type' },
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to save onboarding data');
    }

    return this.mapRow(data);
  }

  async submitOnboarding(
    userId: string,
    dto: SubmitOnboardingDto,
    profileType: 'worker' | 'personal' | 'organisation' = 'worker',
  ): Promise<ProfileOnboarding> {
    const onboarding = await this.getMyOnboarding(userId, profileType);
    if (!onboarding) {
      throw new NotFoundException('No onboarding data found. Please save your data first.');
    }

    if (onboarding.status === 'submitted') {
      throw new BadRequestException('Onboarding has already been submitted');
    }

    // Process field mappings and update target tables (worker profile only)
    if (profileType === 'worker') {
      await this.processFieldMappings(userId, onboarding.onboardingData);
    }

    // Update status to submitted
    const { data, error } = await this.supabase
      .from('profile_onboarding')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('profile_type', profileType)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to submit onboarding');
    }

    return this.mapRow(data);
  }

  private async processFieldMappings(userId: string, onboardingData: Record<string, unknown>): Promise<void> {
    // Get field configurations with mappings
    const questions = (onboardingData.questions as Array<any>) || [];
    const fieldIds = questions.map(q => q.fieldId);

    if (fieldIds.length === 0) {
      return; // No questions to process
    }

    // Fetch field definitions with mappings
    const { data: fieldDefs, error: fieldError } = await this.supabase
      .from('onboarding_field_definitions')
      .select('id, field_key, field_mapping, transform_function')
      .in('id', fieldIds);

    if (fieldError) {
      console.error('Failed to fetch field definitions:', fieldError);
      // Continue without mappings (will store in JSONB only)
      return;
    }

    // Organize data by target table
    const mappedData: Record<string, Record<string, any>> = {
      worker_profiles: {},
      personal_profiles: {},
    };

    // Process each question response
    for (const question of questions) {
      if (question.response !== 'agreed' || !question.value) {
        continue; // Skip disagreed/skipped or empty answers
      }

      const fieldDef = (fieldDefs || []).find(f => f.id === question.fieldId);
      if (!fieldDef || !fieldDef.field_mapping) {
        continue; // No mapping configured
      }

      const mapping = fieldDef.field_mapping as FieldMapping;
      const value = this.transformValue(question.value, mapping);

      // Add to appropriate table's data
      if (mappedData[mapping.target.table]) {
        mappedData[mapping.target.table][mapping.target.column] = value;
      }
    }

    // Upsert to target tables
    if (Object.keys(mappedData.worker_profiles).length > 0) {
      await this.upsertWorkerProfile(userId, mappedData.worker_profiles);
    }

    if (Object.keys(mappedData.personal_profiles).length > 0) {
      await this.upsertPersonalProfile(userId, mappedData.personal_profiles);
    }
  }

  private transformValue(value: any, mapping: FieldMapping): any {
    // Apply transformation based on mapping type
    switch (mapping.type) {
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'direct':
        return value;
      default:
        return value;
    }
  }

  private async upsertWorkerProfile(userId: string, data: Record<string, any>): Promise<void> {
    const row = {
      user_id: userId,
      ...data,
    };

    const { error } = await this.supabase
      .from('worker_profiles')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to upsert worker profile:', error);
      throw new BadRequestException('Failed to update worker profile');
    }
  }

  private async upsertPersonalProfile(userId: string, data: Record<string, any>): Promise<void> {
    const row = {
      user_id: userId,
      ...data,
    };

    const { error } = await this.supabase
      .from('personal_profiles')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to upsert personal profile:', error);
      throw new BadRequestException('Failed to update personal profile');
    }
  }

  private mapRow(data: Record<string, unknown>): ProfileOnboarding {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      status: data.status as 'draft' | 'submitted' | 'approved' | 'rejected',
      onboardingData: (data.onboarding_data as Record<string, unknown>) ?? {},
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      submittedAt: (data.submitted_at as string | null) ?? null,
      reviewedAt: (data.reviewed_at as string | null) ?? null,
      reviewedBy: (data.reviewed_by as string | null) ?? null,
    };
  }
}
