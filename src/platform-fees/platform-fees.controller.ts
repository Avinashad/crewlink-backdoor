import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  PlatformFeesService,
  PlatformFeeTier,
} from './platform-fees.service';
import { CreatePlatformFeeTierDto, UpdatePlatformFeeTierDto } from './dto';
import { Public } from '../auth/decorators';

@ApiTags('Platform Fees')
@Controller('platform-fees')
export class PlatformFeesController {
  constructor(private readonly platformFeesService: PlatformFeesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all platform fee tiers' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    description: 'Filter to active tiers only (default: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform fee tiers retrieved successfully',
  })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<PlatformFeeTier[]> {
    const isActiveOnly = activeOnly !== 'false';
    return this.platformFeesService.findAll(isActiveOnly);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single platform fee tier by ID' })
  @ApiResponse({
    status: 200,
    description: 'Platform fee tier retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Platform fee tier not found' })
  async findOne(@Param('id') id: string): Promise<PlatformFeeTier> {
    return this.platformFeesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new platform fee tier' })
  @ApiResponse({
    status: 201,
    description: 'Platform fee tier created successfully',
  })
  async create(
    @Body() dto: CreatePlatformFeeTierDto,
  ): Promise<PlatformFeeTier> {
    return this.platformFeesService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing platform fee tier' })
  @ApiResponse({
    status: 200,
    description: 'Platform fee tier updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Platform fee tier not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformFeeTierDto,
  ): Promise<PlatformFeeTier> {
    return this.platformFeesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a platform fee tier' })
  @ApiResponse({
    status: 200,
    description: 'Platform fee tier deleted successfully',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.platformFeesService.delete(id);
  }
}
