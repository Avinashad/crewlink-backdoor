import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface Expertise {
  id: string;
  code: string;
  name: string;
  iconName?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class ExpertiseService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(activeOnly: boolean = true): Promise<Expertise[]> {
    let query = this.supabase
      .from('expertise')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expertise: ${error.message}`);
    }

    // Map database fields to interface
    return (data || []).map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      iconName: item.icon_name,
      isActive: item.is_active,
      displayOrder: item.display_order,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async findByCode(code: string): Promise<Expertise | null> {
    const { data, error } = await this.supabase
      .from('expertise')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      return null;
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      iconName: data.icon_name,
      isActive: data.is_active,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async create(expertise: Omit<Expertise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expertise> {
    const { data, error } = await this.supabase
      .from('expertise')
      .insert({
        code: expertise.code,
        name: expertise.name,
        icon_name: expertise.iconName,
        is_active: expertise.isActive,
        display_order: expertise.displayOrder,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expertise: ${error.message}`);
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      iconName: data.icon_name,
      isActive: data.is_active,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, expertise: Partial<Omit<Expertise, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Expertise> {
    const updateData: any = {};
    
    if (expertise.code !== undefined) updateData.code = expertise.code;
    if (expertise.name !== undefined) updateData.name = expertise.name;
    if (expertise.iconName !== undefined) updateData.icon_name = expertise.iconName;
    if (expertise.isActive !== undefined) updateData.is_active = expertise.isActive;
    if (expertise.displayOrder !== undefined) updateData.display_order = expertise.displayOrder;

    const { data, error } = await this.supabase
      .from('expertise')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update expertise: ${error.message}`);
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      iconName: data.icon_name,
      isActive: data.is_active,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('expertise')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete expertise: ${error.message}`);
    }
  }
}
