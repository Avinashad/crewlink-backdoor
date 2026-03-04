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
import { ConversationsService } from './conversations.service';
import { CreateMessageDto, UpdateMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('applicationId') applicationId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.conversationsService.findAll(userId, pageNum, limitNum, {
      applicationId,
    });
  }

  @Get('application/:applicationId')
  @ApiOperation({ summary: 'Get conversation by application ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findByApplicationId(
    @Param('applicationId') applicationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const conversation = await this.conversationsService.findByApplicationId(
      applicationId,
      userId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  @Post('application/:applicationId')
  @ApiOperation({ summary: 'Get or create a conversation for an application' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved or created successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getOrCreate(
    @Param('applicationId') applicationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.conversationsService.getOrCreateConversation(userId, applicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const conversation = await this.conversationsService.findOne(id, userId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.conversationsService.getMessages(
      conversationId,
      userId,
      pageNum,
      limitNum,
    );
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Create a new message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async createMessage(
    @Param('id') conversationId: string,
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateMessageDto,
  ) {
    return this.conversationsService.createMessage(
      conversationId,
      userId,
      createDto,
    );
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Update a message (edit or mark as read)' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async updateMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateMessageDto,
  ) {
    return this.conversationsService.updateMessage(
      messageId,
      userId,
      updateDto,
    );
  }

  @Put(':id/messages/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async markMessagesAsRead(
    @Param('id') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.conversationsService.markMessagesAsRead(conversationId, userId);
    return { message: 'Messages marked as read' };
  }
}
