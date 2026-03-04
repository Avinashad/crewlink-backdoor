import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RoleResponsibilitiesService, RoleResponsibilityTemplate, JobResponsibility } from './role-responsibilities.service';
import { CreateRoleResponsibilityTemplateDto, UpdateRoleResponsibilityTemplateDto, SaveJobResponsibilitiesDto } from './dto';
import { Public } from '../auth/decorators';

@ApiTags('Role Responsibilities')
@Controller('role-responsibilities')
export class RoleResponsibilitiesController {
  constructor(private readonly roleResponsibilitiesService: RoleResponsibilitiesService) {}

  @Get('templates')
  @Public()
  @ApiOperation({ summary: 'Get all role responsibility templates' })
  @ApiQuery({ name: 'expertiseCode', required: false, description: 'Filter by expertise code' })
  @ApiQuery({ name: 'activeOnly', required: false, description: 'Only return active templates (default: true)' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getAllTemplates(
    @Query('expertiseCode') expertiseCode?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<RoleResponsibilityTemplate[]> {
    const isActiveOnly = activeOnly !== 'false';
    return this.roleResponsibilitiesService.findAllTemplates(expertiseCode, isActiveOnly);
  }

  @Get('templates/:id')
  @Public()
  @ApiOperation({ summary: 'Get a single role responsibility template' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('id') id: string): Promise<RoleResponsibilityTemplate | null> {
    return this.roleResponsibilitiesService.findOneTemplate(id);
  }

  @Post('templates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new role responsibility template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Body() dto: CreateRoleResponsibilityTemplateDto,
  ): Promise<RoleResponsibilityTemplate> {
    return this.roleResponsibilitiesService.createTemplate(dto);
  }

  @Put('templates/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a role responsibility template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateRoleResponsibilityTemplateDto,
  ): Promise<RoleResponsibilityTemplate> {
    return this.roleResponsibilitiesService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a role responsibility template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Param('id') id: string): Promise<{ message: string }> {
    await this.roleResponsibilitiesService.deleteTemplate(id);
    return { message: 'Template deleted successfully' };
  }

  @Get('job/:jobPostId')
  @Public()
  @ApiOperation({ summary: 'Get responsibilities for a job post' })
  @ApiResponse({ status: 200, description: 'Job responsibilities retrieved successfully' })
  async getJobResponsibilities(
    @Param('jobPostId') jobPostId: string,
  ): Promise<JobResponsibility[]> {
    return this.roleResponsibilitiesService.findJobResponsibilities(jobPostId);
  }

  @Post('job/:jobPostId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save/replace responsibilities for a job post' })
  @ApiResponse({ status: 201, description: 'Job responsibilities saved successfully' })
  async saveJobResponsibilities(
    @Param('jobPostId') jobPostId: string,
    @Body() dto: SaveJobResponsibilitiesDto,
  ): Promise<JobResponsibility[]> {
    return this.roleResponsibilitiesService.saveJobResponsibilities(jobPostId, dto.items);
  }
}
