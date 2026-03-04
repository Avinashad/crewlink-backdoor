import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreatePublicHolidayDto, UpdatePublicHolidayDto } from './dto';

export interface PublicHoliday {
  id: string;
  countryCode: string;
  regionCode: string | null;
  name: string;
  holidayDate: string;
  rateMultiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PublicHolidaysService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(
    countryCode?: string,
    year?: number,
    activeOnly: boolean = true,
  ): Promise<PublicHoliday[]> {
    let query = this.supabase.from('public_holidays').select('*');

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('holiday_date', startDate).lte('holiday_date', endDate);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('holiday_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch public holidays: ${error.message}`);
    }

    return (data || []).map((item) => this.mapHoliday(item));
  }

  async findByDateRange(
    countryCode: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<PublicHoliday[]> {
    const { data, error } = await this.supabase
      .from('public_holidays')
      .select('*')
      .eq('country_code', countryCode)
      .gte('holiday_date', dateFrom)
      .lte('holiday_date', dateTo)
      .eq('is_active', true)
      .order('holiday_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch public holidays by date range: ${error.message}`);
    }

    return (data || []).map((item) => this.mapHoliday(item));
  }

  async findOne(id: string): Promise<PublicHoliday | null> {
    const { data, error } = await this.supabase
      .from('public_holidays')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return this.mapHoliday(data);
  }

  async create(dto: CreatePublicHolidayDto): Promise<PublicHoliday> {
    const { data, error } = await this.supabase
      .from('public_holidays')
      .insert({
        country_code: dto.countryCode,
        region_code: dto.regionCode || null,
        name: dto.name,
        holiday_date: dto.holidayDate,
        rate_multiplier: dto.rateMultiplier ?? 1.5,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create public holiday: ${error.message}`);
    }

    return this.mapHoliday(data);
  }

  async update(id: string, dto: UpdatePublicHolidayDto): Promise<PublicHoliday> {
    const updateData: any = {};

    if (dto.countryCode !== undefined) updateData.country_code = dto.countryCode;
    if (dto.regionCode !== undefined) updateData.region_code = dto.regionCode;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.holidayDate !== undefined) updateData.holiday_date = dto.holidayDate;
    if (dto.rateMultiplier !== undefined) updateData.rate_multiplier = dto.rateMultiplier;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await this.supabase
      .from('public_holidays')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update public holiday: ${error.message}`);
    }

    return this.mapHoliday(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('public_holidays')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete public holiday: ${error.message}`);
    }
  }

  private mapHoliday(data: any): PublicHoliday {
    return {
      id: data.id,
      countryCode: data.country_code,
      regionCode: data.region_code,
      name: data.name,
      holidayDate: data.holiday_date,
      rateMultiplier: data.rate_multiplier,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
