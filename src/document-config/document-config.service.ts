import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface DocumentTypeConfig {
  id: string;
  document_key: string;
  display_name: string;
  description?: string;
  country_code?: string;
  expertise_code?: string;
  is_required: boolean;
  allowed_file_types: string[];
  max_file_size_mb: number;
  max_files: number;
  maps_to_verification_criteria_key?: string;
  display_order: number;
  is_active: boolean;
}

@Injectable()
export class DocumentConfigService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async getById(id: string): Promise<DocumentTypeConfig | null> {
    const { data, error } = await this.supabase
      .from('document_type_configs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as DocumentTypeConfig;
  }

  async getDocumentRequirements(params: {
    countryCode?: string;
    expertiseCodes?: string[];
    includeInactive?: boolean;
  }): Promise<DocumentTypeConfig[]> {
    let query = this.supabase
      .from('document_type_configs')
      .select('*')
      .order('display_order', { ascending: true });
    if (!params.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (params.countryCode) {
      query = query.or(`country_code.eq.${params.countryCode},country_code.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch document configs: ${error.message}`);
    }

    const configs = (data || []) as DocumentTypeConfig[];

    if (params.expertiseCodes?.length) {
      return configs.filter((c) => {
        if (!c.expertise_code) return true;
        return params.expertiseCodes!.includes(c.expertise_code);
      });
    }

    return configs;
  }

  async getDocumentRequirementsForUser(userId: string): Promise<DocumentTypeConfig[]> {
    const appSettings = await this.supabase
      .from('app_settings')
      .select('country_code')
      .eq('id', 1)
      .single();

    const countryCode = appSettings.data?.country_code as string | undefined;

    const { data: wp } = await this.supabase
      .from('worker_profiles')
      .select('expertise_codes')
      .eq('user_id', userId)
      .single();

    const expertiseCodes = (wp?.expertise_codes as string[]) || [];

    return this.getDocumentRequirements({
      countryCode,
      expertiseCodes,
    });
  }

  async create(payload: {
    document_key: string;
    display_name: string;
    description?: string;
    country_code?: string;
    expertise_code?: string;
    is_required?: boolean;
    allowed_file_types?: string[];
    max_file_size_mb?: number;
    max_files?: number;
    maps_to_verification_criteria_key?: string;
    display_order?: number;
    is_active?: boolean;
  }): Promise<DocumentTypeConfig> {
    const { data, error } = await this.supabase
      .from('document_type_configs')
      .insert({
        document_key: payload.document_key,
        display_name: payload.display_name,
        description: payload.description ?? null,
        country_code: payload.country_code ?? null,
        expertise_code: payload.expertise_code ?? null,
        is_required: payload.is_required ?? false,
        allowed_file_types: payload.allowed_file_types ?? ['pdf', 'jpg', 'jpeg', 'png'],
        max_file_size_mb: payload.max_file_size_mb ?? 10,
        max_files: payload.max_files ?? 1,
        maps_to_verification_criteria_key: payload.maps_to_verification_criteria_key ?? null,
        display_order: payload.display_order ?? 0,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DocumentTypeConfig;
  }

  async update(
    id: string,
    payload: Partial<{
      document_key: string;
      display_name: string;
      description: string | null;
      country_code: string | null;
      expertise_code: string | null;
      is_required: boolean;
      allowed_file_types: string[];
      max_file_size_mb: number;
      max_files: number;
      maps_to_verification_criteria_key: string | null;
      display_order: number;
      is_active: boolean;
    }>,
  ): Promise<DocumentTypeConfig> {
    const { data, error } = await this.supabase
      .from('document_type_configs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DocumentTypeConfig;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('document_type_configs')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}
