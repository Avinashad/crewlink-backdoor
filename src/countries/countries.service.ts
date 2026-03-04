import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface Country {
  id: string;
  code: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class CountriesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(): Promise<Country[]> {
    const { data, error } = await this.supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch countries: ${error.message}`);
    }

    return data || [];
  }

  async findByCode(code: string): Promise<Country | null> {
    const { data, error } = await this.supabase
      .from('countries')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async findById(id: string): Promise<Country | null> {
    const { data, error } = await this.supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async create(country: Omit<Country, 'id' | 'createdAt' | 'updatedAt'>): Promise<Country> {
    const { data, error } = await this.supabase
      .from('countries')
      .insert({
        code: country.code,
        name: country.name,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create country: ${error.message}`);
    }

    return data;
  }

  async update(id: string, country: Partial<Omit<Country, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Country> {
    const updateData: any = {};
    
    if (country.code !== undefined) updateData.code = country.code;
    if (country.name !== undefined) updateData.name = country.name;

    const { data, error } = await this.supabase
      .from('countries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update country: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('countries')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete country: ${error.message}`);
    }
  }
}
