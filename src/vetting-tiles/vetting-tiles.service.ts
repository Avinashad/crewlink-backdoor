import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateVettingTileDto, UpdateVettingTileDto, VettingTileQueryDto } from './dto';

export interface VettingTile {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: 'certification' | 'background_check' | 'reference' | 'custom';
  config: Record<string, unknown>;
  isRequired: boolean;
  isActive: boolean;
  countryCodes: string[];
  expertiseCodes: string[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class VettingTilesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(query: VettingTileQueryDto): Promise<VettingTile[]> {
    let queryBuilder = this.supabase
      .from('vetting_tiles')
      .select('*')
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });

    // Filter by active status (default to true)
    if (query.activeOnly !== false) {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    // Filter by required status
    if (query.requiredOnly === true) {
      queryBuilder = queryBuilder.eq('is_required', true);
    }

    // Filter by expertise code (tiles with empty array or containing the code)
    if (query.expertiseCode) {
      queryBuilder = queryBuilder.or(
        `expertise_codes.cs.{${query.expertiseCode}},expertise_codes.eq.[]`
      );
    }

    // Filter by country code (tiles with empty array or containing the code)
    if (query.countryCode) {
      queryBuilder = queryBuilder.or(
        `country_codes.cs.{${query.countryCode}},country_codes.eq.[]`
      );
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new BadRequestException(`Failed to fetch vetting tiles: ${error.message}`);
    }

    return (data || []).map(this.mapRow);
  }

  async findOne(id: string): Promise<VettingTile> {
    const { data, error } = await this.supabase
      .from('vetting_tiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Vetting tile with id ${id} not found`);
    }

    return this.mapRow(data);
  }

  async findByCode(code: string): Promise<VettingTile | null> {
    const { data, error } = await this.supabase
      .from('vetting_tiles')
      .select('*')
      .eq('code', code)
      .single();

    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw new BadRequestException(`Failed to fetch vetting tile: ${error.message}`);
    }

    return data ? this.mapRow(data) : null;
  }

  async create(dto: CreateVettingTileDto): Promise<VettingTile> {
    // Check if code already exists
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException(`Vetting tile with code '${dto.code}' already exists`);
    }

    const row: Record<string, unknown> = {
      code: dto.code,
      title: dto.title,
      description: dto.description || null,
      type: dto.type,
      config: dto.config || {},
      is_required: dto.isRequired !== undefined ? dto.isRequired : false,
      is_active: dto.isActive !== undefined ? dto.isActive : true,
      country_codes: dto.countryCodes || [],
      expertise_codes: dto.expertiseCodes || [],
      display_order: dto.displayOrder !== undefined ? dto.displayOrder : 0,
    };

    const { data, error } = await this.supabase
      .from('vetting_tiles')
      .insert(row)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(`Failed to create vetting tile: ${error?.message || 'Unknown error'}`);
    }

    return this.mapRow(data);
  }

  async update(id: string, dto: UpdateVettingTileDto): Promise<VettingTile> {
    // Check if vetting tile exists
    await this.findOne(id);

    // If updating code, check it doesn't conflict
    if (dto.code) {
      const existing = await this.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Vetting tile with code '${dto.code}' already exists`);
      }
    }

    const row: Record<string, unknown> = {};
    if (dto.code !== undefined) row.code = dto.code;
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.config !== undefined) row.config = dto.config;
    if (dto.isRequired !== undefined) row.is_required = dto.isRequired;
    if (dto.isActive !== undefined) row.is_active = dto.isActive;
    if (dto.countryCodes !== undefined) row.country_codes = dto.countryCodes;
    if (dto.expertiseCodes !== undefined) row.expertise_codes = dto.expertiseCodes;
    if (dto.displayOrder !== undefined) row.display_order = dto.displayOrder;

    const { data, error } = await this.supabase
      .from('vetting_tiles')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(`Failed to update vetting tile: ${error?.message || 'Unknown error'}`);
    }

    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    // Check if vetting tile exists
    await this.findOne(id);

    const { error } = await this.supabase
      .from('vetting_tiles')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete vetting tile: ${error.message}`);
    }
  }

  private mapRow(data: Record<string, unknown>): VettingTile {
    return {
      id: data.id as string,
      code: data.code as string,
      title: data.title as string,
      description: (data.description as string | null) ?? null,
      type: data.type as 'certification' | 'background_check' | 'reference' | 'custom',
      config: (data.config as Record<string, unknown>) ?? {},
      isRequired: (data.is_required as boolean) ?? false,
      isActive: (data.is_active as boolean) ?? true,
      countryCodes: Array.isArray(data.country_codes) ? (data.country_codes as string[]) : [],
      expertiseCodes: Array.isArray(data.expertise_codes) ? (data.expertise_codes as string[]) : [],
      displayOrder: (data.display_order as number) ?? 0,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
