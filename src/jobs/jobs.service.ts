import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateJobPostDto, UpdateJobPostDto, CreateJobTemplateDto } from './dto';
import { JobPostStatus, JobType } from './dto/create-job-post.dto';
import { RoleResponsibilitiesService } from '../role-responsibilities/role-responsibilities.service';

export interface JobPost {
  id: string;
  orgId: string;
  countryCode: string;
  categoryKey: string;
  title: string;
  description?: string;
  requirements?: string;
  status: JobPostStatus;
  jobType?: string;
  startDate?: string;
  endDate?: string;
  workersNeeded?: number;
  payRate?: number;
  payRateType?: string;
  isRecurring?: boolean;
  shiftStartTime?: string;
  shiftEndTime?: string;
  breakMinutes?: number;
  activeDays?: string[];
  hoursPerWeek?: number;
  applyHolidayRate?: boolean;
  holidayRateMultiplier?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
  organization?: {
    id: string;
    name: string;
    orgType: string;
  };
}

export interface JobTemplate {
  id: string;
  orgId: string;
  categoryKey?: string;
  title: string;
  description?: string;
  requirements?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostsListResponse {
  jobPosts: JobPost[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
    private readonly roleResponsibilitiesService: RoleResponsibilitiesService,
  ) {}

  // Check if user is member of organization
  private async checkOrgMembership(orgId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('org_memberships')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return false;
    }
    return true;
  }

  // Job Posts
  async createJobPost(userId: string, createDto: CreateJobPostDto): Promise<JobPost> {
    // Verify user is member of organization
    const isMember = await this.checkOrgMembership(createDto.orgId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const insertData: any = {
      org_id: createDto.orgId,
      country_code: createDto.countryCode,
      category_key: createDto.categoryKey,
      title: createDto.title,
      description: createDto.description || null,
      requirements: createDto.requirements || null,
      status: createDto.status || JobPostStatus.DRAFT,
    };

    // Scheduling fields
    if (createDto.jobType) insertData.job_type = createDto.jobType;
    if (createDto.startDate) insertData.start_date = createDto.startDate;
    if (createDto.endDate) insertData.end_date = createDto.endDate;
    if (createDto.workersNeeded !== undefined) insertData.workers_needed = createDto.workersNeeded;
    if (createDto.payRate !== undefined) insertData.pay_rate = createDto.payRate;
    if (createDto.payRateType) insertData.pay_rate_type = createDto.payRateType;
    if (createDto.isRecurring !== undefined) insertData.is_recurring = createDto.isRecurring;
    if (createDto.shiftStartTime) insertData.shift_start_time = createDto.shiftStartTime;
    if (createDto.shiftEndTime) insertData.shift_end_time = createDto.shiftEndTime;
    if (createDto.breakMinutes !== undefined) insertData.break_minutes = createDto.breakMinutes;
    if (createDto.activeDays) insertData.active_days = createDto.activeDays;
    if (createDto.hoursPerWeek !== undefined) insertData.hours_per_week = createDto.hoursPerWeek;
    if (createDto.applyHolidayRate !== undefined) insertData.apply_holiday_rate = createDto.applyHolidayRate;
    if (createDto.holidayRateMultiplier !== undefined) insertData.holiday_rate_multiplier = createDto.holidayRateMultiplier;

    // Set published_at if status is published
    if (insertData.status === JobPostStatus.PUBLISHED) {
      insertData.published_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('job_posts')
      .insert(insertData)
      .select(`
        *,
        organizations:org_id (
          id,
          name,
          org_type_code
        )
      `)
      .single();

    if (error) {
      this.logger.error('Error creating job post:', error);
      throw new BadRequestException(`Failed to create job post: ${error.message}`);
    }

    // Save responsibilities if provided
    if (createDto.responsibilities && createDto.responsibilities.length > 0) {
      try {
        await this.roleResponsibilitiesService.saveJobResponsibilities(
          data.id,
          createDto.responsibilities,
        );
      } catch (err) {
        this.logger.warn('Failed to save responsibilities for job post:', err);
      }
    }

    return this.mapJobPost(data);
  }

  async findAllJobPosts(
    userId?: string,
    orgId?: string,
    countryCode?: string,
    categoryKey?: string,
    status?: JobPostStatus,
    page: number = 1,
    limit: number = 50,
  ): Promise<JobPostsListResponse> {
    let query = this.supabase
      .from('job_posts')
      .select(`
        *,
        organizations:org_id (
          id,
          name,
          org_type_code
        )
      `, { count: 'exact' });

    // If user is authenticated, they can see their org's jobs
    // Otherwise, only published jobs
    if (userId && orgId) {
      query = query.eq('org_id', orgId);
    } else {
      query = query.eq('status', JobPostStatus.PUBLISHED);
    }

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    if (categoryKey) {
      query = query.eq('category_key', categoryKey);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Only show non-deleted
    query = query.is('deleted_at', null);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error('Error fetching job posts:', error);
      throw new BadRequestException(`Failed to fetch job posts: ${error.message}`);
    }

    return {
      jobPosts: (data || []).map(item => this.mapJobPost(item)),
      total: count || 0,
      page,
      limit,
    };
  }

  async findOneJobPost(id: string, userId?: string): Promise<JobPost> {
    let query = this.supabase
      .from('job_posts')
      .select(`
        *,
        organizations:org_id (
          id,
          name,
          org_type_code
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    const { data, error } = await query;

    if (error || !data) {
      throw new NotFoundException('Job post not found');
    }

    // If not published, check if user is member of org
    if (data.status !== JobPostStatus.PUBLISHED && userId) {
      const isMember = await this.checkOrgMembership(data.org_id, userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this job post');
      }
    }

    return this.mapJobPost(data);
  }

  async updateJobPost(
    id: string,
    userId: string,
    updateDto: UpdateJobPostDto,
  ): Promise<JobPost> {
    // Get existing job post
    const existing = await this.findOneJobPost(id, userId);

    // Verify user is member of organization
    const isMember = await this.checkOrgMembership(existing.orgId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const updateData: any = {};

    if (updateDto.countryCode !== undefined) updateData.country_code = updateDto.countryCode;
    if (updateDto.categoryKey !== undefined) updateData.category_key = updateDto.categoryKey;
    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.requirements !== undefined) updateData.requirements = updateDto.requirements;

    // Scheduling fields
    if (updateDto.jobType !== undefined) updateData.job_type = updateDto.jobType;
    if (updateDto.startDate !== undefined) updateData.start_date = updateDto.startDate;
    if (updateDto.endDate !== undefined) updateData.end_date = updateDto.endDate;
    if (updateDto.workersNeeded !== undefined) updateData.workers_needed = updateDto.workersNeeded;
    if (updateDto.payRate !== undefined) updateData.pay_rate = updateDto.payRate;
    if (updateDto.payRateType !== undefined) updateData.pay_rate_type = updateDto.payRateType;
    if (updateDto.isRecurring !== undefined) updateData.is_recurring = updateDto.isRecurring;
    if (updateDto.shiftStartTime !== undefined) updateData.shift_start_time = updateDto.shiftStartTime;
    if (updateDto.shiftEndTime !== undefined) updateData.shift_end_time = updateDto.shiftEndTime;
    if (updateDto.breakMinutes !== undefined) updateData.break_minutes = updateDto.breakMinutes;
    if (updateDto.activeDays !== undefined) updateData.active_days = updateDto.activeDays;
    if (updateDto.hoursPerWeek !== undefined) updateData.hours_per_week = updateDto.hoursPerWeek;
    if (updateDto.applyHolidayRate !== undefined) updateData.apply_holiday_rate = updateDto.applyHolidayRate;
    if (updateDto.holidayRateMultiplier !== undefined) updateData.holiday_rate_multiplier = updateDto.holidayRateMultiplier;

    // Handle status changes
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;

      if (updateDto.status === JobPostStatus.PUBLISHED && !existing.publishedAt) {
        updateData.published_at = new Date().toISOString();
      }

      if (updateDto.status === JobPostStatus.CLOSED && !existing.closedAt) {
        updateData.closed_at = new Date().toISOString();
      }
    }

    if (updateDto.contractTemplateId !== undefined) {
      updateData.contract_template_id = updateDto.contractTemplateId || null;
    }

    const { data, error } = await this.supabase
      .from('job_posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        organizations:org_id (
          id,
          name,
          org_type_code
        )
      `)
      .single();

    if (error) {
      this.logger.error('Error updating job post:', error);
      throw new BadRequestException(`Failed to update job post: ${error.message}`);
    }

    return this.mapJobPost(data);
  }

  async deleteJobPost(id: string, userId: string): Promise<void> {
    const existing = await this.findOneJobPost(id, userId);

    // Verify user is member of organization
    const isMember = await this.checkOrgMembership(existing.orgId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Soft delete
    const { error } = await this.supabase
      .from('job_posts')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) {
      this.logger.error('Error deleting job post:', error);
      throw new BadRequestException(`Failed to delete job post: ${error.message}`);
    }
  }

  private mapJobPost(data: any): JobPost {
    return {
      id: data.id,
      orgId: data.org_id,
      countryCode: data.country_code,
      categoryKey: data.category_key,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      status: data.status,
      jobType: data.job_type,
      startDate: data.start_date,
      endDate: data.end_date,
      workersNeeded: data.workers_needed,
      payRate: data.pay_rate != null ? Number(data.pay_rate) : undefined,
      payRateType: data.pay_rate_type,
      isRecurring: data.is_recurring,
      shiftStartTime: data.shift_start_time,
      shiftEndTime: data.shift_end_time,
      breakMinutes: data.break_minutes,
      activeDays: data.active_days,
      hoursPerWeek: data.hours_per_week != null ? Number(data.hours_per_week) : undefined,
      applyHolidayRate: data.apply_holiday_rate,
      holidayRateMultiplier: data.holiday_rate_multiplier != null ? Number(data.holiday_rate_multiplier) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      publishedAt: data.published_at,
      closedAt: data.closed_at,
      organization: data.organizations ? {
        id: data.organizations.id,
        name: data.organizations.name,
        orgType: data.organizations.org_type_code,
      } : undefined,
    };
  }

  // Job Templates
  async createJobTemplate(userId: string, createDto: CreateJobTemplateDto): Promise<JobTemplate> {
    // Verify user is member of organization
    const isMember = await this.checkOrgMembership(createDto.orgId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const { data, error } = await this.supabase
      .from('job_templates')
      .insert({
        org_id: createDto.orgId,
        category_key: createDto.categoryKey || null,
        title: createDto.title,
        description: createDto.description || null,
        requirements: createDto.requirements || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating job template:', error);
      throw new BadRequestException(`Failed to create job template: ${error.message}`);
    }

    return this.mapJobTemplate(data);
  }

  async findAllJobTemplates(orgId: string, userId: string): Promise<JobTemplate[]> {
    // Verify user is member of organization
    const isMember = await this.checkOrgMembership(orgId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const { data, error } = await this.supabase
      .from('job_templates')
      .select('*')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching job templates:', error);
      throw new BadRequestException(`Failed to fetch job templates: ${error.message}`);
    }

    return (data || []).map(item => this.mapJobTemplate(item));
  }

  async findOneJobTemplate(id: string, userId: string): Promise<JobTemplate> {
    const { data, error } = await this.supabase
      .from('job_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Job template not found');
    }

    // Verify user is member of organization
    const isMember = await this.checkOrgMembership(data.org_id, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return this.mapJobTemplate(data);
  }

  async updateJobTemplate(
    id: string,
    userId: string,
    updateDto: Partial<CreateJobTemplateDto>,
  ): Promise<JobTemplate> {
    const existing = await this.findOneJobTemplate(id, userId);

    const updateData: any = {};
    if (updateDto.categoryKey !== undefined) updateData.category_key = updateDto.categoryKey;
    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.requirements !== undefined) updateData.requirements = updateDto.requirements;

    const { data, error } = await this.supabase
      .from('job_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Error updating job template:', error);
      throw new BadRequestException(`Failed to update job template: ${error.message}`);
    }

    return this.mapJobTemplate(data);
  }

  async deleteJobTemplate(id: string, userId: string): Promise<void> {
    const existing = await this.findOneJobTemplate(id, userId);

    // Soft delete
    const { error } = await this.supabase
      .from('job_templates')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) {
      this.logger.error('Error deleting job template:', error);
      throw new BadRequestException(`Failed to delete job template: ${error.message}`);
    }
  }

  private mapJobTemplate(data: any): JobTemplate {
    return {
      id: data.id,
      orgId: data.org_id,
      categoryKey: data.category_key,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
