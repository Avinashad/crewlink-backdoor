import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto, UpdatePersonalProfileDto, CreateContactDto, UpdateContactDto, SetActiveProfileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WorkerProfilesService } from '../worker-profiles/worker-profiles.service';
import { UpdateWorkerProfileDto } from '../worker-profiles/dto';
import { OrganizationsService } from '../organizations/organizations.service';

export interface SwitchableProfileDto {
  id: string | null;
  type: 'personal' | 'organization';
  mode?: 'worker' | 'client';
  name: string;
  label: string;
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly workerProfilesService: WorkerProfilesService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Get('me/profiles')
  @ApiOperation({ summary: 'List all profiles the user can switch to' })
  @ApiResponse({ status: 200, description: 'Profiles list (personal + organizations)' })
  async getProfiles(@CurrentUser('id') userId: string): Promise<{ profiles: SwitchableProfileDto[] }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const profiles: SwitchableProfileDto[] = [];
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';

    // Check actual DB tables — a user may have added profiles beyond their original signup type
    const [workerProfile, personalProfile] = await Promise.all([
      this.workerProfilesService.findByUserId(userId).catch(() => null),
      this.usersService.findPersonalProfile(userId).catch(() => null),
    ]);

    const hasWorkerProfile = !!workerProfile || user.userType === 'worker';
    const hasClientProfile = !!personalProfile || user.userType === 'care_client';

    if (hasWorkerProfile) {
      profiles.push({
        id: null,
        type: 'personal',
        mode: 'worker',
        name: displayName,
        label: 'Personal Worker Profile',
      });
    }

    if (hasClientProfile) {
      profiles.push({
        id: null,
        type: 'personal',
        mode: 'client',
        name: displayName,
        label: 'Personal Client Profile',
      });
    }

    // Organizations
    const orgResult = await this.organizationsService.findAll(1, 100, userId);
    for (const org of orgResult.organizations) {
      profiles.push({
        id: org.id,
        type: 'organization',
        name: org.name,
        label: 'Organization',
      });
    }

    if (!profiles.length && user.userType === 'org_member') {
      profiles.push({
        id: null,
        type: 'personal',
        name: 'Organization',
        label: 'Organization',
      });
    }

    return { profiles };
  }

  @Put('me/active-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the active profile mode for the current user' })
  @ApiResponse({ status: 200, description: 'Active profile updated' })
  async setActiveProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: SetActiveProfileDto,
  ) {
    return this.usersService.setActiveProfile(userId, dto.profileType, dto.orgId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  @Get('me/personal-profile')
  @ApiOperation({ summary: 'Get current user personal profile' })
  @ApiResponse({ status: 200, description: 'Personal profile retrieved successfully' })
  async getPersonalProfile(@CurrentUser('id') userId: string) {
    const profile = await this.usersService.findPersonalProfile(userId);
    // Return null or an empty object when not found; frontend can treat as create-on-first-save
    return profile;
  }

  @Put('me/personal-profile')
  @ApiOperation({ summary: 'Create or update current user personal profile' })
  @ApiResponse({ status: 200, description: 'Personal profile saved successfully' })
  async updatePersonalProfile(
    @CurrentUser('id') userId: string,
    @Body() updatePersonalProfileDto: UpdatePersonalProfileDto,
  ) {
    return this.usersService.upsertPersonalProfile(userId, updatePersonalProfileDto);
  }

  @Get('me/contacts')
  @ApiOperation({ summary: 'List current user personal contacts (emergency, guardian)' })
  @ApiResponse({ status: 200, description: 'Contacts list' })
  async getContacts(@CurrentUser('id') userId: string) {
    return this.usersService.findContacts(userId);
  }

  @Post('me/contacts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a personal contact (emergency or guardian)' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  async createContact(
    @CurrentUser('id') userId: string,
    @Body() createContactDto: CreateContactDto,
  ) {
    return this.usersService.createContact(userId, createContactDto);
  }

  @Put('me/contacts/:id')
  @ApiOperation({ summary: 'Update a personal contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  async updateContact(
    @CurrentUser('id') userId: string,
    @Param('id') contactId: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.usersService.updateContact(userId, contactId, updateContactDto);
  }

  @Delete('me/contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a personal contact' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  async deleteContact(
    @CurrentUser('id') userId: string,
    @Param('id') contactId: string,
  ) {
    await this.usersService.deleteContact(userId, contactId);
  }

  @Get('me/worker-profile')
  @ApiOperation({ summary: 'Get current user worker profile' })
  @ApiResponse({ status: 200, description: 'Worker profile retrieved (or null)' })
  async getWorkerProfile(@CurrentUser('id') userId: string) {
    return this.workerProfilesService.findByUserId(userId);
  }

  @Put('me/worker-profile')
  @ApiOperation({ summary: 'Create or update current user worker profile' })
  @ApiResponse({ status: 200, description: 'Worker profile saved successfully' })
  async updateWorkerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return this.workerProfilesService.upsert(userId, dto);
  }

  @Post('me/profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiResponse({ status: 200, description: 'Profile image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadProfileImage(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    return this.usersService.uploadProfileImage(userId, file);
  }

  @Post('me/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['document', 'invoice', 'job', 'contract'], description: 'Document type' },
        metadata: { type: 'object', description: 'Optional metadata object' },
        documentTypeConfigId: { type: 'string', format: 'uuid', description: 'Link to document_type_configs (profile documents)' },
        expertiseCode: { type: 'string', description: 'Expertise code when linked to a document config' },
      },
      required: ['file', 'type'],
    },
  })
  @ApiOperation({ summary: 'Upload user document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'document' | 'invoice' | 'job' | 'contract',
    @Body('metadata') metadata?: string,
    @Body('documentTypeConfigId') documentTypeConfigId?: string,
    @Body('expertiseCode') expertiseCode?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (allow PDF and images)
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and image files (JPEG, PNG, WebP) are allowed.'
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate type
    const validTypes = ['document', 'invoice', 'job', 'contract'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException('Invalid document type');
    }

    // Parse metadata if provided
    let parsedMetadata: Record<string, unknown> = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (e) {
        throw new BadRequestException('Invalid metadata format. Must be valid JSON.');
      }
    }

    return this.usersService.uploadDocument(userId, file, type, parsedMetadata, {
      documentTypeConfigId: documentTypeConfigId || undefined,
      expertiseCode: expertiseCode || undefined,
    });
  }

  @Get('me/documents')
  @ApiOperation({ summary: 'List current user documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved' })
  async getDocuments(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('documentTypeConfigId') documentTypeConfigId?: string,
  ) {
    return this.usersService.findDocuments(userId, type, documentTypeConfigId);
  }

  @Delete('me/documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user document' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    await this.usersService.deleteDocument(userId, documentId);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  // Admin endpoints
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.usersService.findAll(pageNum, limitNum);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') userId: string) {
    return this.usersService.deleteUser(userId);
  }
}
