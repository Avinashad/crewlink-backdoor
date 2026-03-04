import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface WorkerSearchParams {
  expertiseCodes?: string[];
  availableDays?: string[];
  wageMin?: number;
  wageMax?: number;
  visaType?: string;
  visaValid?: boolean;
  radiusKm?: number;
  lat?: number;
  lng?: number;
  minRating?: number;
  workedForOrgId?: string;
  verificationLevel?: string[];
  requiredBadgeCodes?: string[];
  preferredNationalityCodes?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'distance' | 'completeness';
}

export interface JobSearchParams {
  expertiseCodes?: string[];
  preferredDays?: string[];
  wageMin?: number;
  wageMax?: number;
  radiusKm?: number;
  lat?: number;
  lng?: number;
  minOrgRating?: number;
  page?: number;
  limit?: number;
  sortBy?: 'distance' | 'day_match' | 'rating';
}

@Injectable()
export class SearchService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async searchWorkers(params: WorkerSearchParams): Promise<{ workers: unknown[]; total: number }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Use PostGIS RPC when radius + lat/lng are provided
    const useRadiusSearch =
      params.radiusKm != null &&
      params.radiusKm > 0 &&
      params.lat != null &&
      params.lng != null;

    if (useRadiusSearch) {
      const rpcParams = {
        p_lat: params.lat,
        p_lng: params.lng,
        p_radius_km: params.radiusKm,
        p_expertise_codes: params.expertiseCodes?.length ? params.expertiseCodes : null,
        p_available_days: params.availableDays?.length ? params.availableDays : null,
        p_min_rating: params.minRating ?? null,
        p_worked_for_org_id: params.workedForOrgId ?? null,
        p_verification_levels: params.verificationLevel?.length ? params.verificationLevel : null,
        p_required_badge_codes: params.requiredBadgeCodes?.length ? params.requiredBadgeCodes : null,
        p_visa_type: params.visaType ?? null,
        p_visa_valid: params.visaValid ?? null,
        p_wage_min: params.wageMin ?? null,
        p_wage_max: params.wageMax ?? null,
        p_preferred_nationality_codes: params.preferredNationalityCodes?.length ? params.preferredNationalityCodes : null,
        p_sort_by: params.sortBy || 'rating_avg',
        p_limit: limit,
        p_offset: offset,
      };

      const [workersResult, countResult] = await Promise.all([
        this.supabase.rpc('search_workers_nearby', rpcParams),
        this.supabase.rpc('search_workers_nearby_count', {
          p_lat: params.lat,
          p_lng: params.lng,
          p_radius_km: params.radiusKm,
          p_expertise_codes: rpcParams.p_expertise_codes,
          p_available_days: rpcParams.p_available_days,
          p_min_rating: rpcParams.p_min_rating,
          p_worked_for_org_id: rpcParams.p_worked_for_org_id,
          p_verification_levels: rpcParams.p_verification_levels,
          p_required_badge_codes: rpcParams.p_required_badge_codes,
          p_visa_type: rpcParams.p_visa_type,
          p_visa_valid: rpcParams.p_visa_valid,
          p_wage_min: rpcParams.p_wage_min,
          p_wage_max: rpcParams.p_wage_max,
        }),
      ]);

      if (workersResult.error) {
        throw new Error(`Worker search failed: ${workersResult.error.message}`);
      }

      let workers = (workersResult.data || []) as unknown[];

      if (params.preferredNationalityCodes?.length) {
        workers = [...workers].sort((a: unknown, b: unknown) => {
          const aRow = a as { nationality_code?: string };
          const bRow = b as { nationality_code?: string };
          const aRank = params.preferredNationalityCodes!.includes(aRow.nationality_code ?? '') ? 0 : 1;
          const bRank = params.preferredNationalityCodes!.includes(bRow.nationality_code ?? '') ? 0 : 1;
          return aRank - bRank;
        });
      }

      const total = (countResult.data as number) ?? workers.length;
      return { workers, total };
    }

    // Standard query (no radius)
    let query = this.supabase
      .from('worker_search_mv')
      .select('*', { count: 'exact' });

    if (params.expertiseCodes?.length) {
      query = query.contains('expertise_codes', params.expertiseCodes);
    }
    if (params.availableDays?.length) {
      query = query.contains('available_days', params.availableDays);
    }
    if (params.minRating !== undefined) {
      query = query.gte('rating_avg', params.minRating);
    }
    if (params.workedForOrgId) {
      query = query.contains('past_org_ids', [params.workedForOrgId]);
    }
    if (params.verificationLevel?.length) {
      query = query.in('verification_level', params.verificationLevel);
    }
    if (params.requiredBadgeCodes?.length) {
      query = query.contains('badge_codes', params.requiredBadgeCodes);
    }
    if (params.visaType) {
      query = query.eq('work_visa_type', params.visaType);
    }
    if (params.visaValid === true) {
      query = query.gt('work_visa_expiry', new Date().toISOString().split('T')[0]);
    }
    if (params.wageMin !== undefined) {
      query = query.lte('wage_min', params.wageMax ?? params.wageMin);
    }
    if (params.wageMax !== undefined) {
      query = query.gte('wage_max', params.wageMin ?? params.wageMax);
    }

    const orderBy = params.sortBy === 'distance' ? 'rating_avg' : params.sortBy || 'rating_avg';
    query = query.order(orderBy, { ascending: false });

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Worker search failed: ${error.message}`);
    }

    let workers = data || [];

    if (params.preferredNationalityCodes?.length) {
      workers = [...workers].sort((a: any, b: any) => {
        const aRank = params.preferredNationalityCodes!.includes(a.nationality_code) ? 0 : 1;
        const bRank = params.preferredNationalityCodes!.includes(b.nationality_code) ? 0 : 1;
        return aRank - bRank;
      });
    }

    return { workers, total: count ?? workers.length };
  }

  async searchJobs(params: JobSearchParams): Promise<{ jobs: unknown[]; total: number }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('job_posts')
      .select(`
        *,
        organizations (
          id,
          name,
          rating_avg,
          badge_codes
        )
      `, { count: 'exact' })
      .eq('status', 'published');

    if (params.expertiseCodes?.length) {
      query = query.overlaps('expertise_codes', params.expertiseCodes);
    }
    if (params.preferredDays?.length) {
      query = query.overlaps('required_days', params.preferredDays);
    }
    if (params.wageMin !== undefined) {
      query = query.lte('wage_min', params.wageMax ?? params.wageMin);
    }
    if (params.wageMax !== undefined) {
      query = query.gte('wage_max', params.wageMin ?? params.wageMax);
    }
    if (params.minOrgRating != null && params.minOrgRating > 0) {
      query = query.gte('organizations.rating_avg', params.minOrgRating);
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Job search failed: ${error.message}`);
    }

    let jobs = data || [];

    if (params.preferredDays?.length) {
      jobs = [...jobs].sort((a: any, b: any) => {
        const aHas = (a.required_days || []).some((d: string) => params.preferredDays!.includes(d));
        const bHas = (b.required_days || []).some((d: string) => params.preferredDays!.includes(d));
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return 0;
      });
    }

    return { jobs, total: count ?? jobs.length };
  }
}
