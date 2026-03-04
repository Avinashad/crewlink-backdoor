import {
  Controller,
  Get,
  Post,
  Put,
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
import { JobInquiriesService } from './job-inquiries.service';
import {
  CreateJobInquiryDto,
  UpdateJobInquiryDto,
  CreateInquiryMessageDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Job Inquiries')
@Controller('job-inquiries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobInquiriesController {
  constructor(private readonly jobInquiriesService: JobInquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job inquiry' })
  @ApiResponse({ status: 201, description: 'Inquiry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateJobInquiryDto,
  ) {
    return this.jobInquiriesService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job inquiries (with filters)' })
  @ApiResponse({ status: 200, description: 'Inquiries retrieved successfully' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobPostId') jobPostId?: string,
    @Query('orgId') orgId?: string,
    @Query('status') status?: string,
    @Query('inquirerId') inquirerId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.jobInquiriesService.findAll(userId, pageNum, limitNum, {
      jobPostId,
      orgId,
      status,
      inquirerId,
    });
  }

  @Get('admin')
  @ApiOperation({ summary: 'Get all job inquiries (Admin view)' })
  @ApiResponse({ status: 200, description: 'Inquiries retrieved successfully' })
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobPostId') jobPostId?: string,
    @Query('orgId') orgId?: string,
    @Query('status') status?: string,
    @Query('inquirerId') inquirerId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.jobInquiriesService.findAll('', pageNum, limitNum, {
      jobPostId,
      orgId,
      status,
      inquirerId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job inquiry by ID' })
  @ApiResponse({ status: 200, description: 'Inquiry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async findOne(@Param('id') id: string) {
    const inquiry = await this.jobInquiriesService.findOne(id);
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }
    return inquiry;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update job inquiry' })
  @ApiResponse({ status: 200, description: 'Inquiry updated successfully' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateJobInquiryDto,
  ) {
    return this.jobInquiriesService.update(id, updateDto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Create a message for an inquiry' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @ApiResponse({ status: 404, description: 'Inquiry not found' })
  async createMessage(
    @Param('id') inquiryId: string,
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateInquiryMessageDto,
  ) {
    return this.jobInquiriesService.createMessage(inquiryId, userId, createDto);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages for an inquiry' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(@Param('id') inquiryId: string) {
    return this.jobInquiriesService.getMessages(inquiryId);
  }

  @Put('messages/:messageId/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markMessageAsRead(@Param('messageId') messageId: string) {
    await this.jobInquiriesService.markMessageAsRead(messageId);
    return { message: 'Message marked as read' };
  }
}
