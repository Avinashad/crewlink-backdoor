import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface ProfileSectionConfig {
  id: string;
  tab_id: string;
  section_key: string;
  display_name: string;
  description?: string;
  section_order: number;
  max_items: number;
  contact_type_filter?: string;
  maps_to_table?: string;
  fields?: ProfileFieldConfig[];
}

export interface ProfileTabConfig {
  id: string;
  tab_key: string;
  display_name: string;
  description?: string;
  profile_type: 'personal' | 'worker' | 'organization';
  country_code?: string;
  expertise_codes?: string[];
  tab_order: number;
  icon?: string;
  is_active: boolean;
  sections?: ProfileSectionConfig[];
  fields?: ProfileFieldConfig[];
}

export interface DefaultValueSource {
  table: string;
  column: string;
  row_id: string;
}

export interface ProfileFieldConfig {
  id: string;
  tab_id: string;
  section_id?: string | null;
  field_key: string;
  field_label: string;
  field_type: string;
  maps_to_column?: string;
  maps_to_table?: string;
  default_value_source?: DefaultValueSource | null;
  default_display_value_source?: DefaultValueSource | null;
  field_options?: unknown[];
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  field_order: number;
  validation_rules?: Record<string, unknown>;
  field_config?: Record<string, unknown>;
  conditional_logic?: Record<string, unknown>;
  is_active: boolean;
}

export interface SchemaColumn {
  table_name: string;
  column_name: string;
  data_type: string;
}

@Injectable()
export class ProfileConfigService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  /** Get all public tables and columns for profile field mapping */
  async getSchema(): Promise<{ table_name: string; column_name: string; data_type: string }[]> {
    const { data, error } = await this.supabase.rpc('get_profile_config_schema');
    if (error) {
      throw new Error(`Failed to fetch schema: ${error.message}`);
    }
    return data ?? [];
  }

  /** Get rows for a table (for default value row picker). Returns row_id and label. */
  async getTableRows(tableName: string, limit = 200): Promise<{ row_id: string; label: string }[]> {
    const schema = await this.getSchema();
    const tables = [...new Set(schema.map((s) => s.table_name))];
    if (!tables.includes(tableName)) {
      throw new Error(`Table ${tableName} is not in schema`);
    }
    const columns = schema.filter((c) => c.table_name === tableName).map((c) => c.column_name);
    const pkCol = columns.includes('id') ? 'id' : columns[0];
    const labelCandidates = ['name', 'display_name', 'title', 'label', 'code', 'key'];
    const labelCol = labelCandidates.find((c) => columns.includes(c)) ?? pkCol;
    const selectCols = pkCol === labelCol ? pkCol : `${pkCol},${labelCol}`;
    const { data: rows, error } = await this.supabase
      .from(tableName)
      .select(selectCols)
      .limit(limit);
    if (error) {
      throw new Error(`Failed to fetch rows: ${error.message}`);
    }
    return ((rows ?? []) as unknown as Record<string, unknown>[]).map((row) => {
      const rowId = row[pkCol] != null ? String(row[pkCol]) : '';
      const label = row[labelCol] != null ? String(row[labelCol]) : rowId || '—';
      return { row_id: rowId, label };
    });
  }

  async getTabs(params: {
    profileType: 'personal' | 'worker' | 'organization';
    countryCode?: string;
    expertiseCodes?: string[];
    includeInactive?: boolean;
  }): Promise<ProfileTabConfig[]> {
    let query = this.supabase
      .from('profile_tab_configs')
      .select('*')
      .eq('profile_type', params.profileType)
      .order('tab_order', { ascending: true });

    if (!params.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (params.countryCode) {
      query = query.or(`country_code.eq.${params.countryCode},country_code.is.null`);
    }

    const { data: tabs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch profile tabs: ${error.message}`);
    }

    if (!tabs?.length) {
      return [];
    }

    const tabIds = tabs.map((t) => t.id);

    let sectionsQuery = this.supabase
      .from('profile_section_configs')
      .select('*')
      .in('tab_id', tabIds)
      .order('section_order', { ascending: true });
    const { data: sections, error: sectionsError } = await sectionsQuery;
    if (sectionsError) {
      throw new Error(`Failed to fetch profile sections: ${sectionsError.message}`);
    }
    const sectionsByTab = (sections || []).reduce<Record<string, ProfileSectionConfig[]>>((acc, s) => {
      if (!acc[s.tab_id]) acc[s.tab_id] = [];
      acc[s.tab_id].push({ ...s, fields: [] });
      return acc;
    }, {});

    let fieldsQuery = this.supabase
      .from('profile_field_configs')
      .select('*')
      .in('tab_id', tabIds)
      .order('field_order', { ascending: true });
    if (!params.includeInactive) {
      fieldsQuery = fieldsQuery.eq('is_active', true);
    }
    const { data: fields, error: fieldsError } = await fieldsQuery;

    if (fieldsError) {
      throw new Error(`Failed to fetch profile fields: ${fieldsError.message}`);
    }

    const fieldsByTab = (fields || []).reduce<Record<string, ProfileFieldConfig[]>>((acc, f) => {
      if (!acc[f.tab_id]) acc[f.tab_id] = [];
      acc[f.tab_id].push(f);
      return acc;
    }, {});

    const result: ProfileTabConfig[] = tabs.map((tab) => {
      const tabFields = fieldsByTab[tab.id] || [];
      const tabSections = (sectionsByTab[tab.id] || []).map((sec) => ({
        ...sec,
        fields: tabFields.filter((f) => f.section_id === sec.id),
      }));
      const fieldsWithoutSection = tabFields.filter((f) => !f.section_id);
      return {
        ...tab,
        sections: tabSections,
        fields: fieldsWithoutSection,
      };
    });

    if (params.expertiseCodes?.length) {
      return result.filter((tab) => {
        if (!tab.expertise_codes?.length) return true;
        return tab.expertise_codes.some((ec) => params.expertiseCodes!.includes(ec));
      });
    }

    return result;
  }

  async getTabsForUser(
    userId: string,
    profileType: 'personal' | 'worker' | 'organization',
  ): Promise<ProfileTabConfig[]> {
    const appSettings = await this.supabase
      .from('app_settings')
      .select('country_code')
      .eq('id', 1)
      .single();

    const countryCode = appSettings.data?.country_code as string | undefined;

    let expertiseCodes: string[] | undefined;
    if (profileType === 'worker') {
      const { data: wp } = await this.supabase
        .from('worker_profiles')
        .select('expertise_codes')
        .eq('user_id', userId)
        .single();
      expertiseCodes = (wp?.expertise_codes as string[]) || [];
    }

    return this.getTabs({
      profileType,
      countryCode,
      expertiseCodes,
    });
  }

  /**
   * Get the current user's profile field values (for populating dynamic forms).
   * Merges profile_field_values with denormalized data from personal_profiles, worker_profiles,
   * worker_languages, and worker_certifications based on maps_to.
   */
  async getProfileValuesForUser(
    userId: string,
    profileType: 'personal' | 'worker' | 'organization',
  ): Promise<Record<string, { fieldValue?: string; valueJson?: unknown }>> {
    const tabs = await this.getTabsForUser(userId, profileType);
    const fieldIds = tabs.flatMap((t) => (t.fields ?? []).map((f) => f.id));
    if (fieldIds.length === 0) return {};

    const { data: pfv } = await this.supabase
      .from('profile_field_values')
      .select('field_config_id, field_value, value_json')
      .eq('user_id', userId)
      .in('field_config_id', fieldIds);

    const result: Record<string, { fieldValue?: string; valueJson?: unknown }> = {};
    for (const row of pfv ?? []) {
      result[row.field_config_id] = {
        fieldValue: row.field_value ?? undefined,
        valueJson: row.value_json ?? undefined,
      };
    }

    const { data: pp } = await this.supabase
      .from('personal_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    const { data: wp } = await this.supabase
      .from('worker_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const columnToField: Record<string, string> = {};
    for (const tab of tabs) {
      for (const f of tab.fields ?? []) {
        if (f.maps_to_column) columnToField[f.maps_to_column] = f.id;
      }
    }

    const skipCols = ['user_id', 'created_at', 'updated_at'];
    const mappings: Array<{ key: string; value: unknown }> = [];
    if (pp) {
      for (const [col, val] of Object.entries(pp)) {
        if (val == null || skipCols.includes(col)) continue;
        const fullKey = `personal_profiles.${col}`;
        if (columnToField[fullKey]) mappings.push({ key: columnToField[fullKey], value: val });
      }
    }
    if (wp) {
      for (const [col, val] of Object.entries(wp)) {
        if (val == null || skipCols.includes(col)) continue;
        const fullKey = `worker_profiles.${col}`;
        if (columnToField[fullKey]) mappings.push({ key: columnToField[fullKey], value: val });
      }
    }

    for (const { key, value } of mappings) {
      if (result[key]?.fieldValue != null || result[key]?.valueJson != null) continue;
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      result[key] = { fieldValue: str };
      if (Array.isArray(value)) result[key].valueJson = value;
    }

    const { data: langs } = await this.supabase
      .from('worker_languages')
      .select('language_code, language_name, proficiency')
      .eq('user_id', userId);
    for (const tab of tabs) {
      for (const f of tab.fields ?? []) {
        if (f.maps_to_table === 'worker_languages' && langs?.length) {
          result[f.id] = {
            valueJson: langs.map((l) => ({
              language_code: l.language_code,
              language_name: l.language_name,
              proficiency: l.proficiency,
            })),
          };
        }
      }
    }

    const { data: certs } = await this.supabase
      .from('worker_certifications')
      .select('certification_key, certification_name, issued_by, issued_date, expiry_date')
      .eq('user_id', userId);
    for (const tab of tabs) {
      for (const f of tab.fields ?? []) {
        if (f.maps_to_table === 'worker_certifications' && certs?.length) {
          result[f.id] = {
            valueJson: certs.map((c) => ({
              certification_key: c.certification_key,
              certification_name: c.certification_name,
              issued_by: c.issued_by,
              issued_date: c.issued_date,
              expiry_date: c.expiry_date,
            })),
          };
        }
      }
    }

    return result;
  }

  /**
   * Save profile field values with dual-write: writes to profile_field_values,
   * and to the mapped column (maps_to_column) or relation table (maps_to_table).
   */
  async saveProfileFields(
    userId: string,
    fields: Array<{ fieldConfigId: string; fieldValue?: string; valueJson?: Record<string, unknown> | unknown[] }>,
  ): Promise<void> {
    const allowedMappings = [
      'personal_profiles.first_name',
      'personal_profiles.last_name',
      'personal_profiles.date_of_birth',
      'personal_profiles.country_code',
      'personal_profiles.worker_bio',
      'personal_profiles.worker_experience_years',
      'personal_profiles.nationality_code',
      'personal_profiles.phone',
      'personal_profiles.secondary_phone',
      'personal_profiles.gender',
      'worker_profiles.expertise_codes',
      'worker_profiles.available_days',
      'worker_profiles.wage_min',
      'worker_profiles.wage_max',
      'worker_profiles.work_visa_type',
      'worker_profiles.work_visa_expiry',
      'worker_profiles.wage_currency',
      'worker_profiles.market_country',
    ];

    const allowedRelationTables = ['worker_languages', 'worker_certifications'];

    for (const field of fields) {
      const { data: fieldConfig } = await this.supabase
        .from('profile_field_configs')
        .select('id, maps_to_column, maps_to_table')
        .eq('id', field.fieldConfigId)
        .single();

      if (!fieldConfig) continue;

      const value = field.valueJson ? JSON.stringify(field.valueJson) : (field.fieldValue ?? '');

      await this.supabase.from('profile_field_values').upsert(
        {
          user_id: userId,
          field_config_id: field.fieldConfigId,
          field_value: field.fieldValue,
          value_json: field.valueJson as Record<string, unknown> | null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,field_config_id' },
      );

      if (fieldConfig.maps_to_column && allowedMappings.includes(fieldConfig.maps_to_column)) {
        const [table, column] = fieldConfig.maps_to_column.split('.');
        let dbValue: string | number | string[] | null = value;

        if (column === 'worker_experience_years' || column === 'wage_min' || column === 'wage_max') {
          dbValue = value ? parseFloat(value) : null;
        }
        if (column === 'expertise_codes' || column === 'available_days') {
          try {
            dbValue = field.valueJson && Array.isArray(field.valueJson)
              ? (field.valueJson as string[])
              : (value ? (JSON.parse(value || '[]') as string[]) : []);
          } catch {
            dbValue = [];
          }
        }

        if (table === 'personal_profiles') {
          await this.supabase
            .from('personal_profiles')
            .update({ [column]: dbValue, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
        if (table === 'worker_profiles') {
          await this.supabase
            .from('worker_profiles')
            .update({ [column]: dbValue, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
      }

      if (fieldConfig.maps_to_table && allowedRelationTables.includes(fieldConfig.maps_to_table)) {
        await this.writeToRelationTable(
          userId,
          fieldConfig.maps_to_table,
          field.valueJson,
        );
      }
    }

    await this.updateProfileCompletenessAndSearchable(userId);
  }

  private parseRelationItems(valueJson: unknown): unknown[] {
    if (Array.isArray(valueJson)) return valueJson;
    if (valueJson && typeof valueJson === 'object' && 'items' in valueJson) {
      const items = (valueJson as { items?: unknown }).items;
      return Array.isArray(items) ? items : [];
    }
    return [];
  }

  private async writeToRelationTable(
    userId: string,
    tableName: string,
    valueJson: unknown,
  ): Promise<void> {
    const items = this.parseRelationItems(valueJson);
    const now = new Date().toISOString();

    if (tableName === 'worker_languages') {
      await this.supabase
        .from('worker_languages')
        .delete()
        .eq('user_id', userId);
      if (items.length > 0) {
        const rows = items
          .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
          .map((item) => ({
            user_id: userId,
            language_code: String(item.language_code ?? item.languageCode ?? ''),
            language_name: String(item.language_name ?? item.languageName ?? ''),
            proficiency: String(item.proficiency ?? 'intermediate'),
            created_at: now,
          }))
          .filter((r) => r.language_code && r.language_name);
        if (rows.length > 0) {
          await this.supabase.from('worker_languages').insert(rows);
        }
      }
    } else if (tableName === 'worker_certifications') {
      await this.supabase
        .from('worker_certifications')
        .delete()
        .eq('user_id', userId);
      if (items.length > 0) {
        const rows = items
          .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
          .map((item) => ({
            user_id: userId,
            certification_key: String(item.certification_key ?? item.certificationKey ?? ''),
            certification_name: String(item.certification_name ?? item.certificationName ?? ''),
            issued_by: item.issued_by ?? item.issuedBy ?? null,
            issued_date: item.issued_date ?? item.issuedDate ?? null,
            expiry_date: item.expiry_date ?? item.expiryDate ?? null,
            document_id: item.document_id ?? item.documentId ?? null,
            country_code: item.country_code ?? item.countryCode ?? null,
            expertise_code: item.expertise_code ?? item.expertiseCode ?? null,
            created_at: now,
            updated_at: now,
          }))
          .filter((r) => r.certification_key && r.certification_name);
        if (rows.length > 0) {
          await this.supabase.from('worker_certifications').insert(rows);
        }
      }
    }
  }

  private async updateProfileCompletenessAndSearchable(userId: string): Promise<void> {
    const { data: wp } = await this.supabase
      .from('worker_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    if (!wp) return;

    const { data: pp } = await this.supabase
      .from('personal_profiles')
      .select('first_name, last_name, country_code, worker_bio, profile_image_url')
      .eq('user_id', userId)
      .single();
    const { data: wpData } = await this.supabase
      .from('worker_profiles')
      .select('expertise_codes, wage_min, available_days, work_visa_type')
      .eq('user_id', userId)
      .single();

    let score = 0;
    let total = 0;
    if (pp) {
      if (pp.first_name) { score += 1; total += 1; } else { total += 1; }
      if (pp.last_name) { score += 1; total += 1; } else { total += 1; }
      if (pp.country_code) { score += 1; total += 1; } else { total += 1; }
      if (pp.worker_bio) { score += 1; total += 1; } else { total += 1; }
      if (pp.profile_image_url) { score += 1; total += 1; } else { total += 1; }
    }
    if (wpData) {
      if (wpData.expertise_codes?.length) { score += 1; total += 1; } else { total += 1; }
      if (wpData.wage_min != null) { score += 1; total += 1; } else { total += 1; }
      if (wpData.available_days?.length) { score += 1; total += 1; } else { total += 1; }
      if (wpData.work_visa_type) { score += 1; total += 1; } else { total += 1; }
    }
    const completeness = total > 0 ? Math.round((score / total) * 100) : 0;
    const isSearchable = completeness >= 50;

    await this.supabase
      .from('worker_profiles')
      .update({
        profile_completeness: completeness,
        is_searchable: isSearchable,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  // ---- Admin CRUD: Tabs ----
  async getTabById(id: string): Promise<ProfileTabConfig | null> {
    const { data: tab, error } = await this.supabase
      .from('profile_tab_configs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !tab) return null;
    const [fields, sections] = await Promise.all([
      this.getFieldsForTab(id, true),
      this.getSectionsForTab(id),
    ]);
    const tabSections = sections.map((sec) => ({
      ...sec,
      fields: fields.filter((f) => f.section_id === sec.id),
    }));
    const fieldsWithoutSection = fields.filter((f) => !f.section_id);
    return {
      ...tab,
      sections: tabSections,
      fields: fieldsWithoutSection,
    };
  }

  async createTab(payload: {
    tab_key: string;
    display_name: string;
    description?: string;
    profile_type: 'personal' | 'worker' | 'organization';
    country_code?: string;
    expertise_codes?: string[];
    tab_order?: number;
    icon?: string;
    is_active?: boolean;
  }): Promise<ProfileTabConfig> {
    const { data, error } = await this.supabase
      .from('profile_tab_configs')
      .insert({
        tab_key: payload.tab_key,
        display_name: payload.display_name,
        description: payload.description ?? null,
        profile_type: payload.profile_type,
        country_code: payload.country_code ?? null,
        expertise_codes: payload.expertise_codes ?? null,
        tab_order: payload.tab_order ?? 0,
        icon: payload.icon ?? null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ...data, fields: [] };
  }

  async updateTab(
    id: string,
    payload: Partial<{
      tab_key: string;
      display_name: string;
      description: string | null;
      country_code: string | null;
      expertise_codes: string[] | null;
      tab_order: number;
      icon: string | null;
      is_active: boolean;
    }>,
  ): Promise<ProfileTabConfig> {
    const { data, error } = await this.supabase
      .from('profile_tab_configs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const fields = await this.getFieldsForTab(id, true);
    return { ...data, fields };
  }

  async deleteTab(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('profile_tab_configs')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---- Admin CRUD: Sections (cards) ----
  async getSectionsForTab(tabId: string): Promise<ProfileSectionConfig[]> {
    const { data, error } = await this.supabase
      .from('profile_section_configs')
      .select('*')
      .eq('tab_id', tabId)
      .order('section_order', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileSectionConfig[];
  }

  async getSectionById(id: string): Promise<ProfileSectionConfig | null> {
    const { data, error } = await this.supabase
      .from('profile_section_configs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as ProfileSectionConfig;
  }

  async createSection(
    tabId: string,
    payload: {
      section_key: string;
      display_name: string;
      description?: string;
      section_order?: number;
      max_items?: number;
      contact_type_filter?: string;
      maps_to_table?: string;
    },
  ): Promise<ProfileSectionConfig> {
    const { data, error } = await this.supabase
      .from('profile_section_configs')
      .insert({
        tab_id: tabId,
        section_key: payload.section_key,
        display_name: payload.display_name,
        description: payload.description ?? null,
        section_order: payload.section_order ?? 0,
        max_items: payload.max_items ?? 1,
        contact_type_filter: payload.contact_type_filter ?? null,
        maps_to_table: payload.maps_to_table ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileSectionConfig;
  }

  async updateSection(
    id: string,
    payload: Partial<{
      section_key: string;
      display_name: string;
      description: string | null;
      section_order: number;
      max_items: number;
      contact_type_filter: string | null;
      maps_to_table: string | null;
    }>,
  ): Promise<ProfileSectionConfig> {
    const { data, error } = await this.supabase
      .from('profile_section_configs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileSectionConfig;
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('profile_section_configs')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---- Admin CRUD: Fields ----
  async getFieldsForTab(
    tabId: string,
    includeInactive = false,
  ): Promise<ProfileFieldConfig[]> {
    let query = this.supabase
      .from('profile_field_configs')
      .select('*')
      .eq('tab_id', tabId)
      .order('field_order', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileFieldConfig[];
  }

  async getFieldById(id: string): Promise<ProfileFieldConfig | null> {
    const { data, error } = await this.supabase
      .from('profile_field_configs')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as ProfileFieldConfig;
  }

  async createField(
    tabId: string,
    payload: {
      field_key: string;
      field_label: string;
      field_type: string;
      section_id?: string | null;
      maps_to_column?: string;
      maps_to_table?: string;
      default_value_source?: DefaultValueSource | null;
      default_display_value_source?: DefaultValueSource | null;
      field_options?: unknown[];
      placeholder?: string;
      help_text?: string;
      is_required?: boolean;
      field_order?: number;
      validation_rules?: Record<string, unknown>;
      field_config?: Record<string, unknown>;
      conditional_logic?: Record<string, unknown>;
      is_active?: boolean;
    },
  ): Promise<ProfileFieldConfig> {
    const { data, error } = await this.supabase
      .from('profile_field_configs')
      .insert({
        tab_id: tabId,
        section_id: payload.section_id ?? null,
        field_key: payload.field_key,
        field_label: payload.field_label,
        field_type: payload.field_type,
        maps_to_column: payload.maps_to_column ?? null,
        maps_to_table: payload.maps_to_table ?? null,
        default_value_source: payload.default_value_source ?? null,
        default_display_value_source: payload.default_display_value_source ?? null,
        field_options: payload.field_options ?? [],
        placeholder: payload.placeholder ?? null,
        help_text: payload.help_text ?? null,
        is_required: payload.is_required ?? false,
        field_order: payload.field_order ?? 0,
        validation_rules: payload.validation_rules ?? {},
        field_config: payload.field_config ?? {},
        conditional_logic: payload.conditional_logic ?? null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileFieldConfig;
  }

  async updateField(
    id: string,
    payload: Partial<{
      field_key: string;
      field_label: string;
      field_type: string;
      section_id: string | null;
      maps_to_column: string | null;
      maps_to_table: string | null;
      default_value_source: DefaultValueSource | null;
      default_display_value_source: DefaultValueSource | null;
      field_options: unknown[];
      placeholder: string | null;
      help_text: string | null;
      is_required: boolean;
      field_order: number;
      validation_rules: Record<string, unknown>;
      field_config: Record<string, unknown>;
      conditional_logic: Record<string, unknown> | null;
      is_active: boolean;
    }>,
  ): Promise<ProfileFieldConfig> {
    const { data, error } = await this.supabase
      .from('profile_field_configs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileFieldConfig;
  }

  async deleteField(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('profile_field_configs')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}
