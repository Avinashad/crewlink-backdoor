import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreatePlatformFeeTierDto, UpdatePlatformFeeTierDto } from './dto';

export interface PlatformFeeTier {
  id: string;
  name: string;
  minWorkers: number;
  maxWorkers: number | null;
  employerFeePercent: number;
  workerFeePercent: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PlatformFeesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(activeOnly: boolean = true): Promise<PlatformFeeTier[]> {
    let query = this.supabase
      .from('platform_fee_tiers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch platform fee tiers: ${error.message}`);
    }

    return (data || []).map((row) => this.mapTier(row));
  }

  async findOne(id: string): Promise<PlatformFeeTier> {
    const { data, error } = await this.supabase
      .from('platform_fee_tiers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Platform fee tier not found: ${id}`);
      }
      throw new Error(`Failed to fetch platform fee tier: ${error.message}`);
    }

    return this.mapTier(data);
  }

  async create(dto: CreatePlatformFeeTierDto): Promise<PlatformFeeTier> {
    const insertData: Record<string, unknown> = {
      name: dto.name,
      min_workers: dto.minWorkers,
      max_workers: dto.maxWorkers ?? null,
      employer_fee_percent: dto.employerFeePercent,
      worker_fee_percent: dto.workerFeePercent,
      is_active: dto.isActive ?? true,
      sort_order: dto.sortOrder ?? 0,
    };

    const { data, error } = await this.supabase
      .from('platform_fee_tiers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create platform fee tier: ${error.message}`);
    }

    return this.mapTier(data);
  }

  async update(
    id: string,
    dto: UpdatePlatformFeeTierDto,
  ): Promise<PlatformFeeTier> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.minWorkers !== undefined) updateData.min_workers = dto.minWorkers;
    if (dto.maxWorkers !== undefined) updateData.max_workers = dto.maxWorkers;
    if (dto.employerFeePercent !== undefined)
      updateData.employer_fee_percent = dto.employerFeePercent;
    if (dto.workerFeePercent !== undefined)
      updateData.worker_fee_percent = dto.workerFeePercent;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;

    const { data, error } = await this.supabase
      .from('platform_fee_tiers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Platform fee tier not found: ${id}`);
      }
      throw new Error(`Failed to update platform fee tier: ${error.message}`);
    }

    return this.mapTier(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('platform_fee_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete platform fee tier: ${error.message}`);
    }
  }

  async findTierForWorkers(workersNeeded: number): Promise<PlatformFeeTier | null> {
    const { data, error } = await this.supabase
      .from('platform_fee_tiers')
      .select('*')
      .eq('is_active', true)
      .lte('min_workers', workersNeeded)
      .or(`max_workers.is.null,max_workers.gt.${workersNeeded}`)
      .order('min_workers', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No matching tier found
      }
      throw new Error(
        `Failed to find tier for ${workersNeeded} workers: ${error.message}`,
      );
    }

    return this.mapTier(data);
  }

  private mapTier(data: any): PlatformFeeTier {
    return {
      id: data.id,
      name: data.name,
      minWorkers: data.min_workers,
      maxWorkers: data.max_workers,
      employerFeePercent: data.employer_fee_percent,
      workerFeePercent: data.worker_fee_percent,
      isActive: data.is_active,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
