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
} from '@nestjs/swagger';
import { JobApplicationsService } from './job-applications.service';
import { CreateJobApplicationDto, UpdateJobApplicationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Job Applications')
@Controller('job-applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job application' })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateJobApplicationDto,
  ) {
    return this.jobApplicationsService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job applications (with filters)' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobPostId') jobPostId?: string,
    @Query('status') status?: string,
    @Query('applicantId') applicantId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.jobApplicationsService.findAll(userId, pageNum, limitNum, {
      jobPostId,
      status,
      applicantId,
    });
  }

  @Get('admin')
  @ApiOperation({ summary: 'Get all job applications (Admin view)' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobPostId') jobPostId?: string,
    @Query('status') status?: string,
    @Query('applicantId') applicantId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.jobApplicationsService.findAll('', pageNum, limitNum, {
      jobPostId,
      status,
      applicantId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job application by ID' })
  @ApiResponse({ status: 200, description: 'Application retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@Param('id') id: string) {
    const application = await this.jobApplicationsService.findOne(id);
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update job application' })
  @ApiResponse({ status: 200, description: 'Application updated successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateJobApplicationDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.jobApplicationsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete job application (only pending applications)' })
  @ApiResponse({ status: 200, description: 'Application deleted successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.jobApplicationsService.delete(id, userId);
    return { message: 'Application deleted successfully' };
  }
}
