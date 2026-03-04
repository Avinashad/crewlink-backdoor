import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { UpdateWorkerProfileDto } from './dto';

export interface WorkerProfile {
  id: string;
  userId: string;
  workerBio?: string | null;
  workerExperienceYears?: number | null;
  availability: Record<string, unknown>;
  expertiseCodes: string[];
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
  isAvailable?: boolean;
  availabilityNote?: string | null;
  visaType?: string | null;
  weeklyHoursLimit?: number | null;
  isHolidayMode: boolean;
  holidayStartDate?: string | null;
  holidayExpiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class WorkerProfilesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findByUserId(userId: string): Promise<WorkerProfile | null> {
    const { data, error } = await this.supabase
      .from('worker_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw new BadRequestException('Failed to fetch worker profile');
    }
    if (!data) return null;

    return this.mapRow(data);
  }

  async upsert(userId: string, dto: UpdateWorkerProfileDto): Promise<WorkerProfile> {
    const row: Record<string, unknown> = {
      user_id: userId,
    };
    if (dto.workerBio !== undefined) row.worker_bio = dto.workerBio;
    if (dto.workerExperienceYears !== undefined) row.worker_experience_years = dto.workerExperienceYears;
    if (dto.availability !== undefined) row.availability = dto.availability;
    if (dto.expertiseCodes !== undefined) row.expertise_codes = dto.expertiseCodes;
    if (dto.hourlyRateMin !== undefined) row.hourly_rate_min = dto.hourlyRateMin;
    if (dto.hourlyRateMax !== undefined) row.hourly_rate_max = dto.hourlyRateMax;
    if (dto.isAvailable !== undefined) row.is_available = dto.isAvailable;
    if (dto.availabilityNote !== undefined) row.availability_note = dto.availabilityNote;
    if (dto.visaType !== undefined) row.visa_type = dto.visaType;
    if (dto.weeklyHoursLimit !== undefined) row.weekly_hours_limit = dto.weeklyHoursLimit;
    if (dto.isHolidayMode !== undefined) row.is_holiday_mode = dto.isHolidayMode;
    if (dto.holidayStartDate !== undefined) row.holiday_start_date = dto.holidayStartDate;
    if (dto.holidayExpiryDate !== undefined) row.holiday_expiry_date = dto.holidayExpiryDate;

    const { data, error } = await this.supabase
      .from('worker_profiles')
      .upsert(row, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to save worker profile');
    }

    // Sync expertise codes to junction table (worker_profile_expertise)
    // Note: worker_profile_expertise uses worker_user_id (not worker_profile_id)
    // because worker_profiles PK is user_id
    if (dto.expertiseCodes !== undefined) {
      // Delete existing and re-insert (simple replace strategy)
      await this.supabase
        .from('worker_profile_expertise')
        .delete()
        .eq('worker_user_id', userId);

      if (dto.expertiseCodes.length > 0) {
        await this.supabase
          .from('worker_profile_expertise')
          .insert(
            dto.expertiseCodes.map((code, index) => ({
              worker_user_id: userId,
              expertise_code: code,
              is_primary: index === 0,
            }))
          );
      }
    }

    return this.mapRow(data);
  }

  async createForUser(userId: string): Promise<WorkerProfile> {
    const { data, error } = await this.supabase
      .from('worker_profiles')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to create worker profile');
    }
    return this.mapRow(data);
  }

  private mapRow(data: Record<string, unknown>): WorkerProfile {
    // Auto-reset holiday mode if expiry date has passed
    const holidayExpiry = data.holiday_expiry_date as string | null;
    const isHolidayMode = holidayExpiry && new Date(holidayExpiry) < new Date()
      ? false
      : (data.is_holiday_mode as boolean) ?? false;

    return {
      id: data.id as string,
      userId: data.user_id as string,
      workerBio: (data.worker_bio as string | null) ?? null,
      workerExperienceYears: (data.worker_experience_years as number | null) ?? null,
      availability: (data.availability as Record<string, unknown>) ?? {},
      expertiseCodes: Array.isArray(data.expertise_codes) ? (data.expertise_codes as string[]) : [],
      hourlyRateMin: (data.hourly_rate_min as number | null) ?? null,
      hourlyRateMax: (data.hourly_rate_max as number | null) ?? null,
      isAvailable: (data.is_available as boolean) ?? true,
      availabilityNote: (data.availability_note as string | null) ?? null,
      visaType: (data.visa_type as string | null) ?? null,
      weeklyHoursLimit: (data.weekly_hours_limit as number | null) ?? null,
      isHolidayMode,
      holidayStartDate: (data.holiday_start_date as string | null) ?? null,
      holidayExpiryDate: holidayExpiry ?? null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
