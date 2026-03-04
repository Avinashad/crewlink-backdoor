import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { UpdateUserDto, ChangePasswordDto, CreateContactDto, UpdateContactDto } from './dto';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneExtension?: string;
  phoneNumber?: string;
  userType: string;
  countryCode?: string;
  organisationType?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface PersonalProfile {
  userId: string;
  displayName?: string;
  profileImageUrl?: string | null;
  dateOfBirth?: string | null;
  countryCode?: string | null;
  careNotes?: string | null;
  isCareProfile: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInformation {
  id: string;
  type: 'emergency' | 'guardian' | 'organisation_contact';
  userId?: string | null;
  organisationId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error || !data.user) {
      return null;
    }

    const user = data.user;
    const metadata = user.user_metadata || {};

    return {
      id: user.id,
      email: user.email || '',
      firstName: metadata.first_name,
      lastName: metadata.last_name,
      phone: user.phone || (metadata.phone as string),
      phoneExtension: metadata.phone_extension as string | undefined,
      phoneNumber: metadata.phone_number as string | undefined,
      userType: metadata.user_type || 'worker',
      countryCode: metadata.country_code,
      organisationType: metadata.organisation_type,
      emailVerified: !!user.email_confirmed_at,
      phoneVerified: !!user.phone_confirmed_at,
      createdAt: user.created_at,
    };
  }

  /**
   * Fetch the structured personal profile for a user, if it exists.
   * This complements, but does not replace, auth user_metadata.
   */
  async findPersonalProfile(userId: string): Promise<PersonalProfile | null> {
    const { data, error } = await this.supabase
      .from('personal_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && (error as any).code !== 'PGRST116') {
      throw new BadRequestException('Failed to fetch personal profile');
    }

    if (!data) {
      return null;
    }

    return {
      userId: data.user_id,
      displayName: data.display_name ?? undefined,
      profileImageUrl: data.profile_image_url ?? undefined,
      dateOfBirth: data.date_of_birth,
      countryCode: data.country_code,
      careNotes: data.care_notes,
      isCareProfile: (data.is_care_profile as boolean) ?? false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Create or update the personal profile for a user.
   * The dto is a partial of the PersonalProfile fields (excluding ids/timestamps).
   */
  async upsertPersonalProfile(
    userId: string,
    payload: Partial<Omit<PersonalProfile, 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PersonalProfile> {
    const upsertData: Record<string, any> = {
      user_id: userId,
    };

    if (payload.displayName !== undefined) upsertData.display_name = payload.displayName;
    if (payload.profileImageUrl !== undefined) upsertData.profile_image_url = payload.profileImageUrl;
    if (payload.dateOfBirth !== undefined) upsertData.date_of_birth = payload.dateOfBirth;
    if (payload.countryCode !== undefined) upsertData.country_code = payload.countryCode;
    if (payload.careNotes !== undefined) upsertData.care_notes = payload.careNotes;
    if (payload.isCareProfile !== undefined) upsertData.is_care_profile = payload.isCareProfile;

    const { data, error } = await this.supabase
      .from('personal_profiles')
      .upsert(upsertData, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to save personal profile');
    }

    return {
      userId: data.user_id,
      displayName: data.display_name ?? undefined,
      profileImageUrl: data.profile_image_url ?? undefined,
      dateOfBirth: data.date_of_birth,
      countryCode: data.country_code,
      careNotes: data.care_notes,
      isCareProfile: (data.is_care_profile as boolean) ?? false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserProfile> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = {};

    if (updateUserDto.firstName !== undefined) {
      updateData.first_name = updateUserDto.firstName;
    }
    if (updateUserDto.lastName !== undefined) {
      updateData.last_name = updateUserDto.lastName;
    }
    if (updateUserDto.phoneExtension !== undefined || updateUserDto.phoneNumber !== undefined) {
      const { data: currentData } = await this.supabase.auth.admin.getUserById(userId);
      const currentMetadata = (currentData?.user?.user_metadata as Record<string, unknown>) || {};
      const ext = updateUserDto.phoneExtension ?? (currentMetadata.phone_extension as string);
      const num = updateUserDto.phoneNumber != null ? String(updateUserDto.phoneNumber).replace(/\D/g, '') : (currentMetadata.phone_number as string);
      if (ext && num && num.length >= 4) {
        const extDigits = String(ext).replace(/\D/g, '');
        updateData.phone = `+${extDigits}${num}`;
        updateData.phone_extension = ext;
        updateData.phone_number = num;
      } else if (updateUserDto.phoneNumber === '' || (updateUserDto.phoneNumber === undefined && updateUserDto.phoneExtension === undefined)) {
        updateData.phone = null;
        updateData.phone_extension = null;
        updateData.phone_number = null;
      }
    }
    if (updateUserDto.countryCode !== undefined) {
      updateData.country_code = updateUserDto.countryCode;
    }
    if (updateUserDto.userType !== undefined) {
      updateData.user_type = updateUserDto.userType;
    }
    if (updateUserDto.organisationType !== undefined) {
      updateData.organisation_type = updateUserDto.organisationType;
    }

    const { data, error } = await this.supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: updateData },
    );

    if (error) {
      throw new BadRequestException('Failed to update profile');
    }

    const updatedUser = data.user;
    const metadata = updatedUser.user_metadata || {};

    return {
      id: updatedUser.id,
      email: updatedUser.email || '',
      firstName: metadata.first_name,
      lastName: metadata.last_name,
      phone: updatedUser.phone || (metadata.phone as string),
      phoneExtension: metadata.phone_extension as string | undefined,
      phoneNumber: metadata.phone_number as string | undefined,
      userType: metadata.user_type || 'worker',
      countryCode: metadata.country_code,
      organisationType: metadata.organisation_type,
      emailVerified: !!updatedUser.email_confirmed_at,
      phoneVerified: !!updatedUser.phone_confirmed_at,
      createdAt: updatedUser.created_at,
    };
  }

  /** List personal contacts (emergency, guardian) for the current user. */
  async findContacts(userId: string): Promise<ContactInformation[]> {
    const { data, error } = await this.supabase
      .from('contact_information')
      .select('*')
      .eq('user_id', userId)
      .in('type', ['emergency', 'guardian'])
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to fetch contacts');
    }

    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      userId: row.user_id,
      organisationId: row.organisation_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      relationship: row.relationship,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /** Create a personal contact (emergency or guardian). */
  async createContact(
    userId: string,
    dto: CreateContactDto,
  ): Promise<ContactInformation> {
    const { data, error } = await this.supabase
      .from('contact_information')
      .insert({
        user_id: userId,
        organisation_id: null,
        type: dto.type,
        name: dto.name ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        relationship: dto.relationship ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to create contact');
    }

    return {
      id: data.id,
      type: data.type,
      userId: data.user_id,
      organisationId: data.organisation_id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      relationship: data.relationship,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /** Update a personal contact. Ensures the contact belongs to the user. */
  async updateContact(
    userId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<ContactInformation> {
    const { data: existing } = await this.supabase
      .from('contact_information')
      .select('id')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    const updatePayload: Record<string, unknown> = {};
    if (dto.type !== undefined) updatePayload.type = dto.type;
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone;
    if (dto.email !== undefined) updatePayload.email = dto.email;
    if (dto.relationship !== undefined) updatePayload.relationship = dto.relationship;

    const { data, error } = await this.supabase
      .from('contact_information')
      .update(updatePayload)
      .eq('id', contactId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to update contact');
    }

    return {
      id: data.id,
      type: data.type,
      userId: data.user_id,
      organisationId: data.organisation_id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      relationship: data.relationship,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /** Delete a personal contact. Ensures the contact belongs to the user. */
  async deleteContact(userId: string, contactId: string): Promise<void> {
    const { error } = await this.supabase
      .from('contact_information')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to delete contact');
    }
  }

  /**
   * Upload profile image to Supabase Storage and update personal profile
   */
  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ profileImageUrl: string }> {
    try {
      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const fileName = `${userId}/profile-${timestamp}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await this.supabase.storage
        .from('profile-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw new BadRequestException(`Failed to upload image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('profile-images')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Update personal profile with new image URL
      await this.upsertPersonalProfile(userId, { profileImageUrl: publicUrl });

      return { profileImageUrl: publicUrl };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload profile image');
    }
  }

  /**
   * Upload a document to Supabase Storage and create record in user_documents table.
   * Optionally link to document_type_config (profile documents tab) via documentTypeConfigId and expertiseCode.
   */
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    type: 'document' | 'invoice' | 'job' | 'contract',
    metadata: Record<string, unknown> = {},
    options?: { documentTypeConfigId?: string; expertiseCode?: string },
  ): Promise<{ id: string; filePath: string; fileName: string; documentUrl: string }> {
    try {
      // Create unique filename
      const timestamp = Date.now();
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${userId}/documents/${timestamp}-${sanitizedOriginalName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await this.supabase.storage
        .from('user-documents')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw new BadRequestException(`Failed to upload document: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('user-documents')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Create record in user_documents table
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        type,
        file_path: data.path,
        file_name: file.originalname,
        metadata: {
          ...metadata,
          mimeType: file.mimetype,
          size: file.size,
          publicUrl,
        },
      };
      if (options?.documentTypeConfigId) {
        insertPayload.document_type_config_id = options.documentTypeConfigId;
      }
      if (options?.expertiseCode != null) {
        insertPayload.expertise_code = options.expertiseCode;
      }
      if (options?.documentTypeConfigId) {
        insertPayload.status = 'pending';
      }

      const { data: docData, error: docError } = await this.supabase
        .from('user_documents')
        .insert(insertPayload)
        .select('*')
        .single();

      if (docError || !docData) {
        // Clean up uploaded file
        await this.supabase.storage.from('user-documents').remove([data.path]);
        throw new BadRequestException('Failed to create document record');
      }

      return {
        id: docData.id,
        filePath: docData.file_path,
        fileName: docData.file_name,
        documentUrl: publicUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload document');
    }
  }

  /**
   * Get user documents with optional type and document_type_config_id filter.
   * Returns document_type_config_id and expertise_code when present (for profile Documents tab).
   */
  async findDocuments(
    userId: string,
    type?: string,
    documentTypeConfigId?: string,
  ): Promise<any[]> {
    let query = this.supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (documentTypeConfigId) {
      query = query.eq('document_type_config_id', documentTypeConfigId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch documents');
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      filePath: row.file_path,
      fileName: row.file_name,
      metadata: row.metadata,
      createdAt: row.created_at,
      documentTypeConfigId: row.document_type_config_id ?? undefined,
      expertiseCode: row.expertise_code ?? undefined,
      status: row.status ?? undefined,
    }));
  }

  /**
   * Delete a document (file + record)
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    // Get document record
    const { data: doc, error: fetchError } = await this.supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !doc) {
      throw new NotFoundException('Document not found');
    }

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from('user-documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      // Continue to delete record even if storage delete fails
    }

    // Delete record
    const { error: deleteError } = await this.supabase
      .from('user_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new BadRequestException('Failed to delete document record');
    }
  }

  /**
   * Upsert the user's active profile type into user_active_profile table.
   * Called by PUT /users/me/active-profile.
   */
  async setActiveProfile(
    userId: string,
    profileType: 'worker' | 'personal' | 'organisation',
    orgId?: string | null,
  ): Promise<{ profileType: string; orgId: string | null }> {
    const { data, error } = await this.supabase
      .from('user_active_profile')
      .upsert(
        {
          user_id: userId,
          profile_type: profileType,
          org_id: orgId || null,
        },
        { onConflict: 'user_id' },
      )
      .select('profile_type, org_id')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to set active profile');
    }

    return { profileType: data.profile_type, orgId: data.org_id };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Note: Supabase doesn't support verifying current password directly
    // You'd need to re-authenticate the user first
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      password: changePasswordDto.newPassword,
    });

    if (error) {
      throw new BadRequestException('Failed to change password');
    }

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const { error } = await this.supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new BadRequestException('Failed to delete account');
    }

    return { message: 'Account deleted successfully' };
  }

  // Admin methods
  async findAll(page: number = 1, limit: number = 50): Promise<{ users: UserProfile[]; total: number; page: number; limit: number }> {
    const { data, error } = await this.supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (error) {
      throw new BadRequestException('Failed to fetch users');
    }

    const users: UserProfile[] = (data.users || []).map((user) => {
      const metadata = user.user_metadata || {};
      return {
        id: user.id,
        email: user.email || '',
        firstName: metadata.first_name,
        lastName: metadata.last_name,
        phone: user.phone || (metadata.phone as string),
        phoneExtension: metadata.phone_extension as string | undefined,
        phoneNumber: metadata.phone_number as string | undefined,
        userType: metadata.user_type || 'worker',
        countryCode: metadata.country_code,
        organisationType: metadata.organisation_type,
        emailVerified: !!user.email_confirmed_at,
        phoneVerified: !!user.phone_confirmed_at,
        createdAt: user.created_at,
      };
    });

    return {
      users,
      total: data.total || users.length,
      page,
      limit,
    };
  }

  async findOne(userId: string): Promise<UserProfile | null> {
    return this.findById(userId);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserProfile> {
    return this.updateProfile(userId, updateUserDto);
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.deleteAccount(userId);
  }
}
