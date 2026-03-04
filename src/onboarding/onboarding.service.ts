import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface OnboardingStep {
  id: string;
  step_key: string;
  display_name: string;
  description: string | null;
  step_order: number;
  category_key: string | null;
  country_code: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  field_count?: number;
}

export interface OnboardingFieldDefinition {
  id: string;
  step_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  field_options: unknown;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  field_order: number;
  validation_rules?: unknown;
  country_specific: boolean;
  country_code: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class OnboardingService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async listSteps(): Promise<OnboardingStep[]> {
    const { data: steps, error: stepsError } = await this.supabase
      .from('onboarding_steps')
      .select('*')
      .order('step_order', { ascending: true });

    if (stepsError) throw new Error(stepsError.message);

    const { data: fields } = await this.supabase
      .from('onboarding_field_definitions')
      .select('step_id');

    const countByStep = (fields || []).reduce<Record<string, number>>((acc, f) => {
      acc[f.step_id] = (acc[f.step_id] ?? 0) + 1;
      return acc;
    }, {});

    return (steps || []).map((s) => ({
      ...s,
      field_count: countByStep[s.id] ?? 0,
    }));
  }

  async getStep(id: string): Promise<OnboardingStep | null> {
    const { data, error } = await this.supabase
      .from('onboarding_steps')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data;
  }

  async createStep(payload: {
    step_key: string;
    display_name: string;
    description?: string | null;
    step_order: number;
    category_key?: string | null;
    country_code?: string | null;
    is_active: boolean;
  }): Promise<OnboardingStep> {
    const existing = await this.findStepByKey(payload.step_key);
    if (existing) throw new ConflictException('A step with this key already exists');
    const { data, error } = await this.supabase
      .from('onboarding_steps')
      .insert({
        step_key: payload.step_key,
        display_name: payload.display_name,
        description: payload.description ?? null,
        step_order: payload.step_order,
        category_key: payload.category_key ?? null,
        country_code: payload.country_code ?? null,
        is_active: payload.is_active,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateStep(
    id: string,
    payload: Partial<{
      step_key: string;
      display_name: string;
      description: string | null;
      step_order: number;
      category_key: string | null;
      country_code: string | null;
      is_active: boolean;
    }>,
  ): Promise<OnboardingStep> {
    const { data, error } = await this.supabase
      .from('onboarding_steps')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteStep(id: string): Promise<void> {
    const { error } = await this.supabase.from('onboarding_steps').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async listFields(stepId: string): Promise<OnboardingFieldDefinition[]> {
    const { data, error } = await this.supabase
      .from('onboarding_field_definitions')
      .select('*')
      .eq('step_id', stepId)
      .order('field_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getField(stepId: string, fieldId: string): Promise<OnboardingFieldDefinition | null> {
    const { data, error } = await this.supabase
      .from('onboarding_field_definitions')
      .select('*')
      .eq('id', fieldId)
      .eq('step_id', stepId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async createField(
    stepId: string,
    payload: {
      field_key: string;
      field_label: string;
      field_type: string;
      field_options?: unknown;
      placeholder?: string | null;
      help_text?: string | null;
      is_required: boolean;
      field_order: number;
      country_specific?: boolean;
      country_code?: string | null;
    },
  ): Promise<OnboardingFieldDefinition> {
    const { data, error } = await this.supabase
      .from('onboarding_field_definitions')
      .insert({
        step_id: stepId,
        field_key: payload.field_key,
        field_label: payload.field_label,
        field_type: payload.field_type,
        field_options: payload.field_options ?? [],
        placeholder: payload.placeholder ?? null,
        help_text: payload.help_text ?? null,
        is_required: payload.is_required,
        field_order: payload.field_order,
        country_specific: payload.country_specific ?? false,
        country_code: payload.country_specific ? payload.country_code ?? null : null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateField(
    stepId: string,
    fieldId: string,
    payload: Partial<{
      field_key: string;
      field_label: string;
      field_type: string;
      field_options: unknown;
      placeholder: string | null;
      help_text: string | null;
      is_required: boolean;
      field_order: number;
      country_specific: boolean;
      country_code: string | null;
    }>,
  ): Promise<OnboardingFieldDefinition> {
    const { data, error } = await this.supabase
      .from('onboarding_field_definitions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', fieldId)
      .eq('step_id', stepId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteField(stepId: string, fieldId: string): Promise<void> {
    const { error } = await this.supabase
      .from('onboarding_field_definitions')
      .delete()
      .eq('id', fieldId)
      .eq('step_id', stepId);

    if (error) throw new Error(error.message);
  }

  async findStepByKey(step_key: string): Promise<OnboardingStep | null> {
    const { data, error } = await this.supabase
      .from('onboarding_steps')
      .select('*')
      .eq('step_key', step_key)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  /**
   * Reorder steps by updating step_order for each step
   */
  async reorderSteps(stepIds: string[]): Promise<void> {
    for (let i = 0; i < stepIds.length; i++) {
      await this.supabase
        .from('onboarding_steps')
        .update({ step_order: i, updated_at: new Date().toISOString() })
        .eq('id', stepIds[i]);
    }
  }

  /**
   * Duplicate a step and all its fields
   */
  async duplicateStep(stepId: string): Promise<OnboardingStep> {
    // Get original step
    const originalStep = await this.getStep(stepId);
    if (!originalStep) throw new Error('Step not found');

    // Get original fields
    const originalFields = await this.listFields(stepId);

    // Find max step_order to append duplicated step
    const { data: allSteps } = await this.supabase
      .from('onboarding_steps')
      .select('step_order')
      .order('step_order', { ascending: false })
      .limit(1);

    const maxOrder = allSteps?.[0]?.step_order ?? 0;

    // Create new step
    const { data: newStep, error: stepError } = await this.supabase
      .from('onboarding_steps')
      .insert({
        step_key: `${originalStep.step_key}_copy_${Date.now()}`,
        display_name: `${originalStep.display_name} (Copy)`,
        description: originalStep.description,
        step_order: maxOrder + 1,
        category_key: originalStep.category_key,
        country_code: originalStep.country_code,
        is_active: originalStep.is_active,
      })
      .select()
      .single();

    if (stepError) throw new Error(stepError.message);

    // Duplicate all fields
    for (const field of originalFields) {
      await this.supabase.from('onboarding_field_definitions').insert({
        step_id: newStep.id,
        field_key: `${field.field_key}_copy`,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        placeholder: field.placeholder,
        help_text: field.help_text,
        is_required: field.is_required,
        field_order: field.field_order,
        validation_rules: field.validation_rules,
        country_specific: field.country_specific,
        country_code: field.country_code,
      });
    }

    return newStep;
  }

  /**
   * Reorder fields within a step
   */
  async reorderFields(stepId: string, fieldIds: string[]): Promise<void> {
    for (let i = 0; i < fieldIds.length; i++) {
      await this.supabase
        .from('onboarding_field_definitions')
        .update({ field_order: i, updated_at: new Date().toISOString() })
        .eq('id', fieldIds[i])
        .eq('step_id', stepId);
    }
  }

  /**
   * Validate conditional logic structure
   */
  validateConditionalLogic(logic: any): boolean {
    if (!logic || typeof logic !== 'object') return false;

    // Must have conditions array
    if (!Array.isArray(logic.conditions)) return false;

    // Each condition must have field_id, operator, and value
    for (const condition of logic.conditions) {
      if (!condition.field_id || !condition.operator || condition.value === undefined) {
        return false;
      }

      const validOperators = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'];
      if (!validOperators.includes(condition.operator)) {
        return false;
      }
    }

    // Must have logic operator
    if (!logic.logic || !['AND', 'OR'].includes(logic.logic)) return false;

    // Must have action
    if (!logic.action || typeof logic.action !== 'object') return false;
    if (!logic.action.type || !logic.action.target_field_id) return false;

    const validActions = ['show', 'hide', 'require', 'disable'];
    if (!validActions.includes(logic.action.type)) return false;

    return true;
  }
}
