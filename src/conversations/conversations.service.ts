import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateMessageDto, UpdateMessageDto } from './dto';

export interface Conversation {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  // Joined data
  application?: {
    id: string;
    jobPostId: string;
    applicantId: string;
    status: string;
  };
  jobPost?: {
    id: string;
    title: string;
    orgId: string;
  };
  applicant?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
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

export interface ConversationsListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface MessagesListResponse {
  messages: Message[];
  total: number;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  /**
   * Get or create a conversation for a job application
   * Conversations are automatically created when an application is accepted/shortlisted
   */
  async getOrCreateConversation(
    userId: string,
    applicationId: string,
  ): Promise<Conversation> {
    try {
      // Verify application exists and user has access
      const { data: application, error: appError } = await this.supabase
        .from('job_applications')
        .select('id, job_post_id, applicant_id, status')
        .eq('id', applicationId)
        .single();

      if (appError || !application) {
        throw new NotFoundException('Application not found');
      }

      // Check if user has access to this application
      const hasAccess =
        application.applicant_id === userId ||
        (await this.checkOrgMemberAccess(userId, application.job_post_id));

      if (!hasAccess) {
        throw new BadRequestException('You do not have access to this application');
      }

      // Check if conversation already exists
      const { data: existing, error: existingError } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('application_id', applicationId)
        .single();

      if (existing && !existingError) {
        return this.mapConversation(existing);
      }

      // Verify application status allows conversation creation
      if (!['accepted', 'shortlisted'].includes(application.status)) {
        throw new BadRequestException(
          'Conversations can only be created for accepted or shortlisted applications',
        );
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await this.supabase
        .from('conversations')
        .insert({
          application_id: applicationId,
        })
        .select()
        .single();

      if (createError || !newConversation) {
        this.logger.error('Error creating conversation:', createError);
        throw new BadRequestException(
          `Failed to create conversation: ${createError?.message || 'Unknown error'}`,
        );
      }

      return this.mapConversation(newConversation);
    } catch (error) {
      this.logger.error('Error in getOrCreateConversation:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get or create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all conversations for a user
   */
  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 50,
    filters?: {
      applicationId?: string;
    },
  ): Promise<ConversationsListResponse> {
    try {
      let query = this.supabase
        .from('conversations')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.applicationId) {
        query = query.eq('application_id', filters.applicationId);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) {
        this.logger.error('Error fetching conversations:', error);
        throw new BadRequestException(
          `Failed to fetch conversations: ${error.message}`,
        );
      }

      const conversations = (data || []).map((conv) => this.mapConversation(conv));

      // Fetch related data for each conversation
      for (const conversation of conversations) {
        // Get application info
        const { data: application } = await this.supabase
          .from('job_applications')
          .select('id, job_post_id, applicant_id, status')
          .eq('id', conversation.applicationId)
          .single();

        if (application) {
          conversation.application = {
            id: application.id,
            jobPostId: application.job_post_id,
            applicantId: application.applicant_id,
            status: application.status,
          };

          // Get job post info
          const { data: jobPost } = await this.supabase
            .from('job_posts')
            .select('id, title, org_id')
            .eq('id', application.job_post_id)
            .single();

          if (jobPost) {
            conversation.jobPost = {
              id: jobPost.id,
              title: jobPost.title,
              orgId: jobPost.org_id,
            };
          }

          // Get applicant info
          const { data: userData } = await this.supabase.auth.admin.getUserById(
            application.applicant_id,
          );
          if (userData?.user) {
            const metadata = userData.user.user_metadata || {};
            conversation.applicant = {
              id: userData.user.id,
              email: userData.user.email || '',
              firstName: metadata.first_name,
              lastName: metadata.last_name,
            };
          }
        }
      }

      return {
        conversations,
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error in findAll conversations:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a single conversation by ID
   */
  async findOne(id: string, userId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      const conversation = this.mapConversation(data);

      // Verify user has access
      const { data: application } = await this.supabase
        .from('job_applications')
        .select('job_post_id, applicant_id')
        .eq('id', conversation.applicationId)
        .single();

      if (application) {
        const hasAccess =
          application.applicant_id === userId ||
          (await this.checkOrgMemberAccess(userId, application.job_post_id));

        if (!hasAccess) {
          return null;
        }
      }

      return conversation;
    } catch (error) {
      this.logger.error('Error in findOne conversation:', error);
      return null;
    }
  }

  /**
   * Get conversation by application ID
   */
  async findByApplicationId(
    applicationId: string,
    userId: string,
  ): Promise<Conversation | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('application_id', applicationId)
        .single();

      if (error || !data) {
        return null;
      }

      const conversation = this.mapConversation(data);

      // Verify user has access
      const { data: application } = await this.supabase
        .from('job_applications')
        .select('job_post_id, applicant_id')
        .eq('id', applicationId)
        .single();

      if (application) {
        const hasAccess =
          application.applicant_id === userId ||
          (await this.checkOrgMemberAccess(userId, application.job_post_id));

        if (!hasAccess) {
          return null;
        }
      }

      return conversation;
    } catch (error) {
      this.logger.error('Error in findByApplicationId:', error);
      return null;
    }
  }

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    conversationId: string,
    userId: string,
    createDto: CreateMessageDto,
  ): Promise<Message> {
    try {
      // Verify conversation exists and user has access
      const conversation = await this.findOne(conversationId, userId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found or access denied');
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: createDto.content,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating message:', error);
        throw new BadRequestException(`Failed to create message: ${error.message}`);
      }

      const message = this.mapMessage(data);

      // Fetch sender info
      const { data: userData } = await this.supabase.auth.admin.getUserById(
        userId,
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

      return message;
    } catch (error) {
      this.logger.error('Error in createMessage:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 100,
  ): Promise<MessagesListResponse> {
    try {
      // Verify conversation exists and user has access
      const conversation = await this.findOne(conversationId, userId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found or access denied');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) {
        this.logger.error('Error fetching messages:', error);
        throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
      }

      const messages = (data || []).map((msg) => this.mapMessage(msg));

      // Fetch sender info for each message
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

      return {
        messages,
        total: count || 0,
      };
    } catch (error) {
      this.logger.error('Error in getMessages:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a message (edit content or mark as read)
   */
  async updateMessage(
    messageId: string,
    userId: string,
    updateDto: UpdateMessageDto,
  ): Promise<Message> {
    try {
      // Get message to verify ownership/access
      const { data: message, error: msgError } = await this.supabase
        .from('messages')
        .select('*, conversation_id')
        .eq('id', messageId)
        .single();

      if (msgError || !message) {
        throw new NotFoundException('Message not found');
      }

      // If updating content, verify sender owns the message
      if (updateDto.content && message.sender_id !== userId) {
        throw new BadRequestException('You can only edit your own messages');
      }

      const updateData: any = {};
      if (updateDto.content !== undefined) {
        updateData.content = updateDto.content;
      }
      if (updateDto.markAsRead) {
        updateData.read_at = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await this.supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId)
        .select()
        .single();

      if (updateError || !updated) {
        throw new BadRequestException(
          `Failed to update message: ${updateError?.message || 'Unknown error'}`,
        );
      }

      return this.mapMessage(updated);
    } catch (error) {
      this.logger.error('Error in updateMessage:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Mark multiple messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Verify conversation exists and user has access
      const conversation = await this.findOne(conversationId, userId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found or access denied');
      }

      // Mark all unread messages in this conversation as read (except own messages)
      const { error } = await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) {
        this.logger.error('Error marking messages as read:', error);
        throw new BadRequestException(
          `Failed to mark messages as read: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in markMessagesAsRead:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to mark messages as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Helper: Check if user is an org member for a job post
   */
  private async checkOrgMemberAccess(
    userId: string,
    jobPostId: string,
  ): Promise<boolean> {
    const { data: jobPost } = await this.supabase
      .from('job_posts')
      .select('org_id')
      .eq('id', jobPostId)
      .single();

    if (!jobPost) {
      return false;
    }

    const { data: membership } = await this.supabase
      .from('org_memberships')
      .select('id')
      .eq('org_id', jobPost.org_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return !!membership;
  }

  private mapConversation(data: any): Conversation {
    return {
      id: data.id,
      applicationId: data.application_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastMessageAt: data.last_message_at,
    };
  }

  private mapMessage(data: any): Message {
    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      content: data.content,
      readAt: data.read_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
