import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateJobApplicationDto, UpdateJobApplicationDto } from './dto';

export interface JobApplication {
  id: string;
  jobPostId: string;
  applicantId: string;
  status: string;
  coverLetter?: string;
  resumeUrl?: string;
  additionalDocuments?: any[];
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  applicant?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  jobPost?: {
    id: string;
    title: string;
    orgId: string;
  };
}

export interface JobApplicationsListResponse {
  applications: JobApplication[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async create(
    userId: string,
    createDto: CreateJobApplicationDto,
  ): Promise<JobApplication> {
    try {
      // Check if job post exists
      const { data: jobPost, error: jobError } = await this.supabase
        .from('job_posts')
        .select('id, status')
        .eq('id', createDto.jobPostId)
        .single();

      if (jobError || !jobPost) {
        throw new NotFoundException('Job post not found');
      }

      if (jobPost.status !== 'published') {
        throw new BadRequestException('Cannot apply to unpublished job post');
      }

      // Check for duplicate application
      const { data: existing } = await this.supabase
        .from('job_applications')
        .select('id')
        .eq('job_post_id', createDto.jobPostId)
        .eq('applicant_id', userId)
        .single();

      if (existing) {
        throw new BadRequestException('You have already applied to this job');
      }

      const { data, error } = await this.supabase
        .from('job_applications')
        .insert({
          job_post_id: createDto.jobPostId,
          applicant_id: userId,
          cover_letter: createDto.coverLetter,
          resume_url: createDto.resumeUrl,
          additional_documents: createDto.additionalDocuments || [],
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating job application:', error);
        throw new BadRequestException(`Failed to create application: ${error.message}`);
      }

      return this.mapApplication(data);
    } catch (error) {
      this.logger.error('Error in create application:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 50,
    filters?: {
      jobPostId?: string;
      status?: string;
      applicantId?: string;
    },
  ): Promise<JobApplicationsListResponse> {
    try {
      let query = this.supabase
        .from('job_applications')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.jobPostId) {
        query = query.eq('job_post_id', filters.jobPostId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.applicantId) {
        query = query.eq('applicant_id', filters.applicantId);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        this.logger.error('Error fetching applications:', error);
        throw new BadRequestException(`Failed to fetch applications: ${error.message}`);
      }

      const applications = (data || []).map((app) => this.mapApplication(app));

      // Fetch applicant and job post details
      for (const app of applications) {
        // Get applicant info
        const { data: userData } = await this.supabase.auth.admin.getUserById(
          app.applicantId,
        );
        if (userData?.user) {
          const metadata = userData.user.user_metadata || {};
          app.applicant = {
            id: userData.user.id,
            email: userData.user.email || '',
            firstName: metadata.first_name,
            lastName: metadata.last_name,
          };
        }

        // Get job post info
        const { data: jobPost } = await this.supabase
          .from('job_posts')
          .select('id, title, org_id')
          .eq('id', app.jobPostId)
          .single();
        if (jobPost) {
          app.jobPost = {
            id: jobPost.id,
            title: jobPost.title,
            orgId: jobPost.org_id,
          };
        }
      }

      return {
        applications,
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error in findAll applications:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findOne(id: string): Promise<JobApplication | null> {
    try {
      const { data, error } = await this.supabase
        .from('job_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapApplication(data);
    } catch (error) {
      this.logger.error('Error in findOne application:', error);
      return null;
    }
  }

  async update(
    id: string,
    updateDto: UpdateJobApplicationDto,
    reviewerId?: string,
  ): Promise<JobApplication> {
    try {
      const updateData: any = {
        ...updateDto,
      };

      if (updateDto.status && reviewerId) {
        updateData.reviewed_by = reviewerId;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('job_applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw new NotFoundException('Application not found');
      }

      return this.mapApplication(data);
    } catch (error) {
      this.logger.error('Error in update application:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      // Check if user owns the application
      const { data: application } = await this.supabase
        .from('job_applications')
        .select('applicant_id, status')
        .eq('id', id)
        .single();

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      // Only allow deletion if user is applicant and status is pending
      if (application.applicant_id !== userId) {
        throw new BadRequestException('You can only delete your own applications');
      }

      if (application.status !== 'pending') {
        throw new BadRequestException('Can only delete pending applications');
      }

      const { error } = await this.supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (error) {
        throw new BadRequestException(`Failed to delete application: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error in delete application:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapApplication(data: any): JobApplication {
    return {
      id: data.id,
      jobPostId: data.job_post_id,
      applicantId: data.applicant_id,
      status: data.status,
      coverLetter: data.cover_letter,
      resumeUrl: data.resume_url,
      additionalDocuments: data.additional_documents,
      notes: data.notes,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
