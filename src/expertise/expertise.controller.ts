import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExpertiseService, Expertise } from './expertise.service';
import { Public } from '../auth/decorators';

@ApiTags('Expertise')
@Controller('expertise')
export class ExpertiseController {
  constructor(private readonly expertiseService: ExpertiseService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all expertise (active only by default)' })
  @ApiResponse({ status: 200, description: 'Expertise retrieved successfully' })
  async getAllExpertise(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<Expertise[]> {
    const activeOnly = includeInactive !== 'true';
    return this.expertiseService.findAll(activeOnly);
  }

  @Get(':code')
  @Public()
  @ApiOperation({ summary: 'Get expertise by code' })
  @ApiResponse({ status: 200, description: 'Expertise retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Expertise not found' })
  async getExpertiseByCode(@Param('code') code: string): Promise<Expertise | null> {
    return this.expertiseService.findByCode(code);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new expertise (Admin only)' })
  @ApiResponse({ status: 201, description: 'Expertise created successfully' })
  async createExpertise(@Body() expertise: Omit<Expertise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expertise> {
    return this.expertiseService.create(expertise);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update expertise (Admin only)' })
  @ApiResponse({ status: 200, description: 'Expertise updated successfully' })
  async updateExpertise(
    @Param('id') id: string,
    @Body() expertise: Partial<Omit<Expertise, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Expertise> {
    return this.expertiseService.update(id, expertise);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete expertise (Admin only)' })
  @ApiResponse({ status: 200, description: 'Expertise deleted successfully' })
  async deleteExpertise(@Param('id') id: string): Promise<{ message: string }> {
    await this.expertiseService.delete(id);
    return { message: 'Expertise deleted successfully' };
  }
}
