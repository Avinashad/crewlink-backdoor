import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface AppSettings {
  id: number;
  country_code: string;
  app_name: string;
  default_currency: string;
  config: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateAppSettingsDto {
  country_code?: string;
  app_name?: string;
  default_currency?: string;
  config?: Record<string, unknown>;
}

@Injectable()
export class AppSettingsService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async get(): Promise<AppSettings | null> {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No row found
      }
      throw new Error(`Failed to fetch app settings: ${error.message}`);
    }

    return data;
  }

  async update(dto: UpdateAppSettingsDto): Promise<AppSettings> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.country_code !== undefined) updateData.country_code = dto.country_code;
    if (dto.app_name !== undefined) updateData.app_name = dto.app_name;
    if (dto.default_currency !== undefined) updateData.default_currency = dto.default_currency;
    if (dto.config !== undefined) updateData.config = dto.config;

    const { data, error } = await this.supabase
      .from('app_settings')
      .update(updateData)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update app settings: ${error.message}`);
    }

    return data;
  }
}
