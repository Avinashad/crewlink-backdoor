import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService, WorkerSearchParams, JobSearchParams } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('workers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search workers (for orgs)' })
  @ApiResponse({ status: 200, description: 'Matching workers' })
  async searchWorkers(
    @Query('expertiseCodes') expertiseCodes?: string,
    @Query('availableDays') availableDays?: string,
    @Query('wageMin') wageMin?: string,
    @Query('wageMax') wageMax?: string,
    @Query('visaType') visaType?: string,
    @Query('visaValid') visaValid?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('minRating') minRating?: string,
    @Query('workedForOrgId') workedForOrgId?: string,
    @Query('verificationLevel') verificationLevel?: string,
    @Query('requiredBadgeCodes') requiredBadgeCodes?: string,
    @Query('preferredNationalityCodes') preferredNationalityCodes?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'rating' | 'distance' | 'completeness',
  ) {
    const params: WorkerSearchParams = {
      expertiseCodes: expertiseCodes?.split(',').filter(Boolean),
      availableDays: availableDays?.split(',').filter(Boolean),
      wageMin: wageMin ? parseFloat(wageMin) : undefined,
      wageMax: wageMax ? parseFloat(wageMax) : undefined,
      visaType,
      visaValid: visaValid === 'true',
      radiusKm: radiusKm ? parseInt(radiusKm, 10) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      workedForOrgId,
      verificationLevel: verificationLevel?.split(',').filter(Boolean),
      requiredBadgeCodes: requiredBadgeCodes?.split(',').filter(Boolean),
      preferredNationalityCodes: preferredNationalityCodes?.split(',').filter(Boolean),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
    };
    return this.searchService.searchWorkers(params);
  }

  @Get('jobs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search jobs (for workers)' })
  @ApiResponse({ status: 200, description: 'Matching jobs' })
  async searchJobs(
    @Query('expertiseCodes') expertiseCodes?: string,
    @Query('preferredDays') preferredDays?: string,
    @Query('wageMin') wageMin?: string,
    @Query('wageMax') wageMax?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('minOrgRating') minOrgRating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'distance' | 'day_match' | 'rating',
  ) {
    const params: JobSearchParams = {
      expertiseCodes: expertiseCodes?.split(',').filter(Boolean),
      preferredDays: preferredDays?.split(',').filter(Boolean),
      wageMin: wageMin ? parseFloat(wageMin) : undefined,
      wageMax: wageMax ? parseFloat(wageMax) : undefined,
      radiusKm: radiusKm ? parseInt(radiusKm, 10) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      minOrgRating: minOrgRating ? parseFloat(minOrgRating) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
    };
    return this.searchService.searchJobs(params);
  }
}
