import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto } from './dto';

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  expertiseCodes: string[];
  countryCodes: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ServicesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(query: ServiceQueryDto): Promise<Service[]> {
    let queryBuilder = this.supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    // Filter by active status (default to true)
    if (query.activeOnly !== false) {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    // Filter by expertise code (services with empty array or containing the code)
    if (query.expertiseCode) {
      queryBuilder = queryBuilder.or(
        `expertise_codes.cs.{${query.expertiseCode}},expertise_codes.eq.[]`
      );
    }

    // Filter by country code (services with empty array or containing the code)
    if (query.countryCode) {
      queryBuilder = queryBuilder.or(
        `country_codes.cs.{${query.countryCode}},country_codes.eq.[]`
      );
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new BadRequestException(`Failed to fetch services: ${error.message}`);
    }

    return (data || []).map(this.mapRow);
  }

  async findOne(id: string): Promise<Service> {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Service with id ${id} not found`);
    }

    return this.mapRow(data);
  }

  async findByCode(code: string): Promise<Service | null> {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('code', code)
      .single();

    if (error && (error as { code?: string }).code !== 'PGRST116') {
      throw new BadRequestException(`Failed to fetch service: ${error.message}`);
    }

    return data ? this.mapRow(data) : null;
  }

  async create(dto: CreateServiceDto): Promise<Service> {
    // Check if code already exists
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException(`Service with code '${dto.code}' already exists`);
    }

    const row: Record<string, unknown> = {
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      expertise_codes: dto.expertiseCodes || [],
      country_codes: dto.countryCodes || [],
      is_active: dto.isActive !== undefined ? dto.isActive : true,
      display_order: dto.displayOrder !== undefined ? dto.displayOrder : 0,
    };

    const { data, error } = await this.supabase
      .from('services')
      .insert(row)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(`Failed to create service: ${error?.message || 'Unknown error'}`);
    }

    return this.mapRow(data);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    // Check if service exists
    await this.findOne(id);

    // If updating code, check it doesn't conflict
    if (dto.code) {
      const existing = await this.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Service with code '${dto.code}' already exists`);
      }
    }

    const row: Record<string, unknown> = {};
    if (dto.code !== undefined) row.code = dto.code;
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.expertiseCodes !== undefined) row.expertise_codes = dto.expertiseCodes;
    if (dto.countryCodes !== undefined) row.country_codes = dto.countryCodes;
    if (dto.isActive !== undefined) row.is_active = dto.isActive;
    if (dto.displayOrder !== undefined) row.display_order = dto.displayOrder;

    const { data, error } = await this.supabase
      .from('services')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(`Failed to update service: ${error?.message || 'Unknown error'}`);
    }

    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    // Check if service exists
    await this.findOne(id);

    const { error } = await this.supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete service: ${error.message}`);
    }
  }

  private mapRow(data: Record<string, unknown>): Service {
    return {
      id: data.id as string,
      code: data.code as string,
      name: data.name as string,
      description: (data.description as string | null) ?? null,
      expertiseCodes: Array.isArray(data.expertise_codes) ? (data.expertise_codes as string[]) : [],
      countryCodes: Array.isArray(data.country_codes) ? (data.country_codes as string[]) : [],
      isActive: (data.is_active as boolean) ?? true,
      displayOrder: (data.display_order as number) ?? 0,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
