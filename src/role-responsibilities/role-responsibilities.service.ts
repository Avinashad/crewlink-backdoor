import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateRoleResponsibilityTemplateDto, UpdateRoleResponsibilityTemplateDto, JobResponsibilityItemDto } from './dto';

export interface RoleResponsibilityTemplate {
  id: string;
  expertiseCode: string;
  title: string;
  description: string | null;
  category: string | null;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobResponsibility {
  id: string;
  jobPostId: string;
  templateId: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

@Injectable()
export class RoleResponsibilitiesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAllTemplates(expertiseCode?: string, activeOnly: boolean = true): Promise<RoleResponsibilityTemplate[]> {
    let query = this.supabase
      .from('role_responsibility_templates')
      .select('*');

    if (expertiseCode) {
      query = query.eq('expertise_code', expertiseCode);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch role responsibility templates: ${error.message}`);
    }

    return (data || []).map(item => this.mapTemplate(item));
  }

  async findOneTemplate(id: string): Promise<RoleResponsibilityTemplate | null> {
    const { data, error } = await this.supabase
      .from('role_responsibility_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return this.mapTemplate(data);
  }

  async createTemplate(dto: CreateRoleResponsibilityTemplateDto): Promise<RoleResponsibilityTemplate> {
    const { data, error } = await this.supabase
      .from('role_responsibility_templates')
      .insert({
        expertise_code: dto.expertiseCode,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        is_default: dto.isDefault ?? true,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role responsibility template: ${error.message}`);
    }

    return this.mapTemplate(data);
  }

  async updateTemplate(id: string, dto: UpdateRoleResponsibilityTemplateDto): Promise<RoleResponsibilityTemplate> {
    const updateData: any = {};

    if (dto.expertiseCode !== undefined) updateData.expertise_code = dto.expertiseCode;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.isDefault !== undefined) updateData.is_default = dto.isDefault;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await this.supabase
      .from('role_responsibility_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update role responsibility template: ${error.message}`);
    }

    return this.mapTemplate(data);
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('role_responsibility_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete role responsibility template: ${error.message}`);
    }
  }

  async findJobResponsibilities(jobPostId: string): Promise<JobResponsibility[]> {
    const { data, error } = await this.supabase
      .from('job_post_responsibilities')
      .select('*')
      .eq('job_post_id', jobPostId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch job responsibilities: ${error.message}`);
    }

    return (data || []).map(item => this.mapJobResponsibility(item));
  }

  async saveJobResponsibilities(jobPostId: string, items: JobResponsibilityItemDto[]): Promise<JobResponsibility[]> {
    // Delete existing rows for this job post
    const { error: deleteError } = await this.supabase
      .from('job_post_responsibilities')
      .delete()
      .eq('job_post_id', jobPostId);

    if (deleteError) {
      throw new Error(`Failed to clear existing job responsibilities: ${deleteError.message}`);
    }

    if (items.length === 0) {
      return [];
    }

    // Insert all new items
    const insertData = items.map((item, index) => ({
      job_post_id: jobPostId,
      template_id: item.templateId || null,
      title: item.title,
      description: item.description || null,
      sort_order: item.sortOrder ?? index,
    }));

    const { data, error: insertError } = await this.supabase
      .from('job_post_responsibilities')
      .insert(insertData)
      .select();

    if (insertError) {
      throw new Error(`Failed to save job responsibilities: ${insertError.message}`);
    }

    return (data || []).map(item => this.mapJobResponsibility(item));
  }

  private mapTemplate(data: any): RoleResponsibilityTemplate {
    return {
      id: data.id,
      expertiseCode: data.expertise_code,
      title: data.title,
      description: data.description,
      category: data.category,
      isDefault: data.is_default,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapJobResponsibility(data: any): JobResponsibility {
    return {
      id: data.id,
      jobPostId: data.job_post_id,
      templateId: data.template_id,
      title: data.title,
      description: data.description,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
    };
  }
}
