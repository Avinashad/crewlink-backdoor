import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  ProfileConfigService,
  ProfileTabConfig,
  ProfileFieldConfig,
  ProfileSectionConfig,
} from './profile-config.service';
import {
  SaveProfileFieldsDto,
  CreateProfileTabDto,
  UpdateProfileTabDto,
  CreateProfileSectionDto,
  UpdateProfileSectionDto,
  CreateProfileFieldDto,
  UpdateProfileFieldDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Profile Config')
@Controller('profile-config')
export class ProfileConfigController {
  constructor(private readonly profileConfigService: ProfileConfigService) {}

  @Get('schema')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get database schema (tables and columns) for field mapping' })
  @ApiResponse({ status: 200, description: 'List of table.column with data types' })
  async getSchema(): Promise<{ table_name: string; column_name: string; data_type: string }[]> {
    return this.profileConfigService.getSchema();
  }

  @Get('schema/tables/:table/rows')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rows for a table (for default value row picker)' })
  @ApiResponse({ status: 200, description: 'List of { row_id, label }' })
  async getTableRows(
    @Param('table') table: string,
    @Query('limit') limit?: string,
  ): Promise<{ row_id: string; label: string }[]> {
    return this.profileConfigService.getTableRows(table, limit ? parseInt(limit, 10) : 200);
  }

  @Get('tabs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile tabs for current user' })
  @ApiResponse({ status: 200, description: 'Profile tabs with fields' })
  async getTabsForUser(
    @CurrentUser('sub') userId: string,
    @Query('profileType') profileType: 'personal' | 'worker' | 'organization' = 'worker',
  ): Promise<ProfileTabConfig[]> {
    return this.profileConfigService.getTabsForUser(userId, profileType);
  }

  @Get('me/values')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile field values' })
  @ApiResponse({ status: 200, description: 'Field values keyed by field config id' })
  async getMyValues(
    @CurrentUser('sub') userId: string,
    @Query('profileType') profileType: 'personal' | 'worker' | 'organization' = 'worker',
  ): Promise<Record<string, { fieldValue?: string; valueJson?: unknown }>> {
    return this.profileConfigService.getProfileValuesForUser(userId, profileType);
  }

  @Get('tabs/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile tabs (admin - with filters)' })
  @ApiResponse({ status: 200, description: 'Profile tabs with fields' })
  async getTabs(
    @Query('profileType') profileType: 'personal' | 'worker' | 'organization',
    @Query('countryCode') countryCode?: string,
    @Query('expertiseCodes') expertiseCodes?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ProfileTabConfig[]> {
    const codes = expertiseCodes ? expertiseCodes.split(',') : undefined;
    return this.profileConfigService.getTabs({
      profileType,
      countryCode: countryCode || undefined,
      expertiseCodes: codes,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('tabs/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile tab by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Tab with fields' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getTabById(@Param('id') id: string): Promise<ProfileTabConfig | null> {
    return this.profileConfigService.getTabById(id);
  }

  @Post('tabs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create profile tab (admin)' })
  @ApiResponse({ status: 201, description: 'Tab created' })
  async createTab(@Body() dto: CreateProfileTabDto): Promise<ProfileTabConfig> {
    return this.profileConfigService.createTab(dto);
  }

  @Put('tabs/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile tab (admin)' })
  @ApiResponse({ status: 200, description: 'Tab updated' })
  async updateTab(
    @Param('id') id: string,
    @Body() dto: UpdateProfileTabDto,
  ): Promise<ProfileTabConfig> {
    return this.profileConfigService.updateTab(id, dto);
  }

  @Delete('tabs/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete profile tab (admin)' })
  @ApiResponse({ status: 200, description: 'Tab deleted' })
  async deleteTab(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.profileConfigService.deleteTab(id);
    return { ok: true };
  }

  @Get('tabs/:tabId/sections')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sections (cards) for a tab (admin)' })
  @ApiResponse({ status: 200, description: 'Sections list' })
  async getSectionsForTab(@Param('tabId') tabId: string): Promise<ProfileSectionConfig[]> {
    return this.profileConfigService.getSectionsForTab(tabId);
  }

  @Get('sections/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile section by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Section' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getSectionById(@Param('id') id: string): Promise<ProfileSectionConfig | null> {
    return this.profileConfigService.getSectionById(id);
  }

  @Post('tabs/:tabId/sections')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create profile section / card (admin)' })
  @ApiResponse({ status: 201, description: 'Section created' })
  async createSection(
    @Param('tabId') tabId: string,
    @Body() dto: CreateProfileSectionDto,
  ): Promise<ProfileSectionConfig> {
    return this.profileConfigService.createSection(tabId, dto);
  }

  @Put('sections/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile section (admin)' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  async updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateProfileSectionDto,
  ): Promise<ProfileSectionConfig> {
    return this.profileConfigService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete profile section (admin)' })
  @ApiResponse({ status: 200, description: 'Section deleted' })
  async deleteSection(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.profileConfigService.deleteSection(id);
    return { ok: true };
  }

  @Get('tabs/:tabId/fields')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List fields for a tab (admin)' })
  @ApiResponse({ status: 200, description: 'Fields list' })
  async getFieldsForTab(
    @Param('tabId') tabId: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ProfileFieldConfig[]> {
    return this.profileConfigService.getFieldsForTab(
      tabId,
      includeInactive === 'true',
    );
  }

  @Get('fields/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile field by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Field' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getFieldById(@Param('id') id: string): Promise<ProfileFieldConfig | null> {
    return this.profileConfigService.getFieldById(id);
  }

  @Post('tabs/:tabId/fields')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create profile field (admin)' })
  @ApiResponse({ status: 201, description: 'Field created' })
  async createField(
    @Param('tabId') tabId: string,
    @Body() dto: CreateProfileFieldDto,
  ): Promise<ProfileFieldConfig> {
    return this.profileConfigService.createField(tabId, dto);
  }

  @Put('fields/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile field (admin)' })
  @ApiResponse({ status: 200, description: 'Field updated' })
  async updateField(
    @Param('id') id: string,
    @Body() dto: UpdateProfileFieldDto,
  ): Promise<ProfileFieldConfig> {
    return this.profileConfigService.updateField(id, dto);
  }

  @Delete('fields/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete profile field (admin)' })
  @ApiResponse({ status: 200, description: 'Field deleted' })
  async deleteField(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.profileConfigService.deleteField(id);
    return { ok: true };
  }

  @Put('fields')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save profile field values (dual-write to mapped columns)' })
  @ApiResponse({ status: 200, description: 'Fields saved' })
  async saveProfileFields(
    @CurrentUser('sub') userId: string,
    @Body() dto: SaveProfileFieldsDto,
  ): Promise<{ success: boolean }> {
    await this.profileConfigService.saveProfileFields(userId, dto.fields);
    return { success: true };
  }
}
