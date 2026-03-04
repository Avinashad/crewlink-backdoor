import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import {
  CreateJobInquiryDto,
  UpdateJobInquiryDto,
  CreateInquiryMessageDto,
} from './dto';

export interface JobInquiry {
  id: string;
  jobPostId?: string;
  inquirerId: string;
  orgId?: string;
  subject: string;
  status: string;
  priority: string;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  inquirer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  jobPost?: {
    id: string;
    title: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

export interface InquiryMessage {
  id: string;
  inquiryId: string;
  senderId: string;
  message: string;
  isInternal: boolean;
  attachments?: any[];
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  sender?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface JobInquiriesListResponse {
  inquiries: JobInquiry[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class JobInquiriesService {
  private readonly logger = new Logger(JobInquiriesService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async create(
    userId: string,
    createDto: CreateJobInquiryDto,
  ): Promise<JobInquiry> {
    try {
      const { data, error } = await this.supabase
        .from('job_inquiries')
        .insert({
          job_post_id: createDto.jobPostId,
          org_id: createDto.orgId,
          inquirer_id: userId,
          subject: createDto.subject,
          status: 'open',
          priority: 'medium',
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating job inquiry:', error);
        throw new BadRequestException(`Failed to create inquiry: ${error.message}`);
      }

      return this.mapInquiry(data);
    } catch (error) {
      this.logger.error('Error in create inquiry:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 50,
    filters?: {
      jobPostId?: string;
      orgId?: string;
      status?: string;
      inquirerId?: string;
    },
  ): Promise<JobInquiriesListResponse> {
    try {
      let query = this.supabase
        .from('job_inquiries')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.jobPostId) {
        query = query.eq('job_post_id', filters.jobPostId);
      }
      if (filters?.orgId) {
        query = query.eq('org_id', filters.orgId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.inquirerId) {
        query = query.eq('inquirer_id', filters.inquirerId);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        this.logger.error('Error fetching inquiries:', error);
        throw new BadRequestException(`Failed to fetch inquiries: ${error.message}`);
      }

      const inquiries = (data || []).map((inq) => this.mapInquiry(inq));

      // Fetch related data
      for (const inquiry of inquiries) {
        // Get inquirer info
        const { data: userData } = await this.supabase.auth.admin.getUserById(
          inquiry.inquirerId,
        );
        if (userData?.user) {
          const metadata = userData.user.user_metadata || {};
          inquiry.inquirer = {
            id: userData.user.id,
            email: userData.user.email || '',
            firstName: metadata.first_name,
            lastName: metadata.last_name,
          };
        }

        // Get job post info if exists
        if (inquiry.jobPostId) {
          const { data: jobPost } = await this.supabase
            .from('job_posts')
            .select('id, title')
            .eq('id', inquiry.jobPostId)
            .single();
          if (jobPost) {
            inquiry.jobPost = {
              id: jobPost.id,
              title: jobPost.title,
            };
          }
        }

        // Get organization info if exists
        if (inquiry.orgId) {
          const { data: org } = await this.supabase
            .from('organizations')
            .select('id, name')
            .eq('id', inquiry.orgId)
            .single();
          if (org) {
            inquiry.organization = {
              id: org.id,
              name: org.name,
            };
          }
        }
      }

      return {
        inquiries,
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error in findAll inquiries:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findOne(id: string): Promise<JobInquiry | null> {
    try {
      const { data, error } = await this.supabase
        .from('job_inquiries')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapInquiry(data);
    } catch (error) {
      this.logger.error('Error in findOne inquiry:', error);
      return null;
    }
  }

  async update(
    id: string,
    updateDto: UpdateJobInquiryDto,
  ): Promise<JobInquiry> {
    try {
      const updateData: any = {
        ...updateDto,
      };

      if (updateDto.status === 'resolved' || updateDto.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('job_inquiries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw new NotFoundException('Inquiry not found');
      }

      return this.mapInquiry(data);
    } catch (error) {
      this.logger.error('Error in update inquiry:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Inquiry Messages
  async createMessage(
    inquiryId: string,
    userId: string,
    createDto: CreateInquiryMessageDto,
  ): Promise<InquiryMessage> {
    try {
      // Verify inquiry exists
      const inquiry = await this.findOne(inquiryId);
      if (!inquiry) {
        throw new NotFoundException('Inquiry not found');
      }

      const { data, error } = await this.supabase
        .from('inquiry_messages')
        .insert({
          inquiry_id: inquiryId,
          sender_id: userId,
          message: createDto.message,
          is_internal: createDto.isInternal || false,
          attachments: createDto.attachments || [],
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating inquiry message:', error);
        throw new BadRequestException(`Failed to create message: ${error.message}`);
      }

      return this.mapMessage(data);
    } catch (error) {
      this.logger.error('Error in createMessage:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getMessages(inquiryId: string): Promise<InquiryMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('inquiry_messages')
        .select('*')
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true });

      if (error) {
        this.logger.error('Error fetching messages:', error);
        throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
      }

      const messages = (data || []).map((msg) => this.mapMessage(msg));

      // Fetch sender info
      for (const message of messages) {
        const { data: userData } = await this.supabase.auth.admin.getUserById(
          message.senderId,
        );
        if (userData?.user) {
          const metadata = userData.user.user_metadata || {};
          message.sender = {
            id: userData.user.id,
            email: userData.user.email || '',
            firstName: metadata.first_name,
            lastName: metadata.last_name,
          };
        }
      }

      return messages;
    } catch (error) {
      this.logger.error('Error in getMessages:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('inquiry_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        throw new BadRequestException(`Failed to mark message as read: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error in markMessageAsRead:', error);
      throw new BadRequestException(
        `Failed to mark message as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapInquiry(data: any): JobInquiry {
    return {
      id: data.id,
      jobPostId: data.job_post_id,
      inquirerId: data.inquirer_id,
      orgId: data.org_id,
      subject: data.subject,
      status: data.status,
      priority: data.priority,
      assignedTo: data.assigned_to,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapMessage(data: any): InquiryMessage {
    return {
      id: data.id,
      inquiryId: data.inquiry_id,
      senderId: data.sender_id,
      message: data.message,
      isInternal: data.is_internal,
      attachments: data.attachments,
      readAt: data.read_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
