import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobPostDto, UpdateJobPostDto, CreateJobTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JobPostStatus } from './dto/create-job-post.dto';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // Job Posts
  @Post('posts')
  @ApiOperation({ summary: 'Create a new job post' })
  @ApiResponse({ status: 201, description: 'Job post created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  async createJobPost(
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateJobPostDto,
  ) {
    return this.jobsService.createJobPost(userId, createDto);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get all job posts (published for public, all for org members)' })
  @ApiQuery({ name: 'orgId', required: false, description: 'Filter by organization ID' })
  @ApiQuery({ name: 'countryCode', required: false, description: 'Filter by country code' })
  @ApiQuery({ name: 'categoryKey', required: false, description: 'Filter by category key' })
  @ApiQuery({ name: 'status', required: false, enum: JobPostStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Job posts retrieved successfully' })
  async findAllJobPosts(
    @CurrentUser('sub') userId: string | undefined,
    @Query('orgId') orgId?: string,
    @Query('countryCode') countryCode?: string,
    @Query('categoryKey') categoryKey?: string,
    @Query('status') status?: JobPostStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.jobsService.findAllJobPosts(
      userId,
      orgId,
      countryCode,
      categoryKey,
      status,
      pageNum,
      limitNum,
    );
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a job post by ID' })
  @ApiResponse({ status: 200, description: 'Job post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job post not found' })
  async findOneJobPost(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string | undefined,
  ) {
    return this.jobsService.findOneJobPost(id, userId);
  }

  @Put('posts/:id')
  @ApiOperation({ summary: 'Update a job post' })
  @ApiResponse({ status: 200, description: 'Job post updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  @ApiResponse({ status: 404, description: 'Job post not found' })
  async updateJobPost(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateJobPostDto,
  ) {
    return this.jobsService.updateJobPost(id, userId, updateDto);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a job post (soft delete)' })
  @ApiResponse({ status: 200, description: 'Job post deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  @ApiResponse({ status: 404, description: 'Job post not found' })
  async deleteJobPost(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.jobsService.deleteJobPost(id, userId);
    return { message: 'Job post deleted successfully' };
  }

  // Job Templates
  @Post('templates')
  @ApiOperation({ summary: 'Create a new job template' })
  @ApiResponse({ status: 201, description: 'Job template created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  async createJobTemplate(
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateJobTemplateDto,
  ) {
    return this.jobsService.createJobTemplate(userId, createDto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all job templates for an organization' })
  @ApiQuery({ name: 'orgId', required: true, description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Job templates retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  async findAllJobTemplates(
    @Query('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.jobsService.findAllJobTemplates(orgId, userId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a job template by ID' })
  @ApiResponse({ status: 200, description: 'Job template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job template not found' })
  async findOneJobTemplate(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.jobsService.findOneJobTemplate(id, userId);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a job template' })
  @ApiResponse({ status: 200, description: 'Job template updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  @ApiResponse({ status: 404, description: 'Job template not found' })
  async updateJobTemplate(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: Partial<CreateJobTemplateDto>,
  ) {
    return this.jobsService.updateJobTemplate(id, userId, updateDto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete a job template (soft delete)' })
  @ApiResponse({ status: 200, description: 'Job template deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of organization' })
  @ApiResponse({ status: 404, description: 'Job template not found' })
  async deleteJobTemplate(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.jobsService.deleteJobTemplate(id, userId);
    return { message: 'Job template deleted successfully' };
  }
}
