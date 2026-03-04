import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto, UseTemplateDto } from './dto';

export interface OnboardingTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  industry: string | null;
  country_code: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  usage_count: number;
  template_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class TemplatesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(query: TemplateQueryDto): Promise<OnboardingTemplate[]> {
    let queryBuilder = this.supabase
      .from('onboarding_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (query.industry) {
      queryBuilder = queryBuilder.eq('industry', query.industry);
    }

    if (query.country_code) {
      queryBuilder = queryBuilder.eq('country_code', query.country_code);
    }

    if (query.featured_only) {
      queryBuilder = queryBuilder.eq('is_featured', true);
    }

    if (query.active_only !== false) {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    const { data, error } = await queryBuilder;

    if (error) throw new Error(error.message);
    return data || [];
  }

  async findOne(id: string): Promise<OnboardingTemplate> {
    const { data, error } = await this.supabase
      .from('onboarding_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return data;
  }

  async create(
    dto: CreateTemplateDto,
    userId: string,
  ): Promise<OnboardingTemplate> {
    const { data, error } = await this.supabase
      .from('onboarding_templates')
      .insert({
        template_key: dto.template_key,
        name: dto.name,
        description: dto.description || null,
        industry: dto.industry || null,
        country_code: dto.country_code || null,
        thumbnail_url: dto.thumbnail_url || null,
        is_featured: dto.is_featured || false,
        template_data: dto.template_data,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<OnboardingTemplate> {
    const { data, error } = await this.supabase
      .from('onboarding_templates')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException(`Template with ID ${id} not found`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('onboarding_templates')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async useTemplate(
    id: string,
    dto: UseTemplateDto,
  ): Promise<{ stepIds: string[]; fieldIds: string[] }> {
    // Get template
    const template = await this.findOne(id);

    // Extract steps and fields from template_data
    const templateData = template.template_data as {
      steps: Array<any>;
      fields: Array<any>;
    };

    const stepIds: string[] = [];
    const fieldIds: string[] = [];

    // Create steps from template
    for (const stepTemplate of templateData.steps || []) {
      const { data: newStep, error: stepError } = await this.supabase
        .from('onboarding_steps')
        .insert({
          step_key: `${stepTemplate.step_key}_${Date.now()}`,
          display_name: stepTemplate.display_name,
          description: stepTemplate.description,
          step_order: stepTemplate.step_order,
          category_key: dto.category_key || stepTemplate.category_key,
          country_code: dto.country_code || stepTemplate.country_code,
          is_active: true,
          is_skippable: stepTemplate.is_skippable || false,
          icon: stepTemplate.icon || 'article',
          is_collapsible: stepTemplate.is_collapsible !== false,
        })
        .select()
        .single();

      if (stepError) throw new Error(stepError.message);
      if (newStep) {
        stepIds.push(newStep.id);

        // Create fields for this step
        const stepFieldTemplates = (templateData.fields || []).filter(
          (f: any) => f.step_id === stepTemplate.id,
        );

        for (const fieldTemplate of stepFieldTemplates) {
          const { data: newField, error: fieldError } = await this.supabase
            .from('onboarding_field_definitions')
            .insert({
              step_id: newStep.id,
              field_key: fieldTemplate.field_key,
              field_label: fieldTemplate.field_label,
              field_type: fieldTemplate.field_type,
              field_options: fieldTemplate.field_options || null,
              placeholder: fieldTemplate.placeholder || null,
              help_text: fieldTemplate.help_text || null,
              is_required: fieldTemplate.is_required || false,
              field_order: fieldTemplate.field_order,
              country_specific: fieldTemplate.country_specific || false,
              country_code: dto.country_code || fieldTemplate.country_code,
              field_mapping: fieldTemplate.field_mapping || null,
              validation_rules: fieldTemplate.validation_rules || null,
              transform_function: fieldTemplate.transform_function || null,
              conditional_logic: fieldTemplate.conditional_logic || null,
              field_config: fieldTemplate.field_config || {},
            })
            .select()
            .single();

          if (fieldError) throw new Error(fieldError.message);
          if (newField) {
            fieldIds.push(newField.id);
          }
        }
      }
    }

    // Increment usage count
    await this.supabase
      .from('onboarding_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', id);

    return { stepIds, fieldIds };
  }
}
