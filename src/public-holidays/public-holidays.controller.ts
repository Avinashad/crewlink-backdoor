import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PublicHolidaysService, PublicHoliday } from './public-holidays.service';
import { CreatePublicHolidayDto, UpdatePublicHolidayDto } from './dto';
import { Public } from '../auth/decorators';

@ApiTags('Public Holidays')
@Controller('public-holidays')
export class PublicHolidaysController {
  constructor(private readonly publicHolidaysService: PublicHolidaysService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get public holidays with optional filters' })
  @ApiQuery({ name: 'countryCode', required: false, description: 'Filter by country code (e.g. NZ, AU)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date for date range filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date for date range filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year (e.g. 2026)' })
  @ApiQuery({ name: 'activeOnly', required: false, description: 'Only return active holidays (default: true)' })
  @ApiResponse({ status: 200, description: 'Public holidays retrieved successfully' })
  async getPublicHolidays(
    @Query('countryCode') countryCode?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('year') year?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<PublicHoliday[]> {
    const isActiveOnly = activeOnly !== 'false';

    if (dateFrom && dateTo && countryCode) {
      return this.publicHolidaysService.findByDateRange(countryCode, dateFrom, dateTo);
    }

    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.publicHolidaysService.findAll(countryCode, parsedYear, isActiveOnly);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single public holiday by ID' })
  @ApiResponse({ status: 200, description: 'Public holiday retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Public holiday not found' })
  async getPublicHoliday(@Param('id') id: string): Promise<PublicHoliday | null> {
    return this.publicHolidaysService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new public holiday' })
  @ApiResponse({ status: 201, description: 'Public holiday created successfully' })
  async createPublicHoliday(@Body() dto: CreatePublicHolidayDto): Promise<PublicHoliday> {
    return this.publicHolidaysService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a public holiday' })
  @ApiResponse({ status: 200, description: 'Public holiday updated successfully' })
  async updatePublicHoliday(
    @Param('id') id: string,
    @Body() dto: UpdatePublicHolidayDto,
  ): Promise<PublicHoliday> {
    return this.publicHolidaysService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a public holiday' })
  @ApiResponse({ status: 200, description: 'Public holiday deleted successfully' })
  async deletePublicHoliday(@Param('id') id: string): Promise<{ message: string }> {
    await this.publicHolidaysService.delete(id);
    return { message: 'Public holiday deleted successfully' };
  }
}
