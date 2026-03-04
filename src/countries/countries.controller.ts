import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CountriesService, Country } from './countries.service';
import { Public } from '../auth/decorators';
import { GeoIpService } from '../geoip/geoip.service';
import type { Request } from 'express';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
    private readonly geoIpService: GeoIpService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all countries' })
  @ApiResponse({ status: 200, description: 'Countries retrieved successfully' })
  async getAllCountries() {
    return this.countriesService.findAll();
  }

  @Get('detect')
  @Public()
  @ApiOperation({ summary: 'Detect country from client IP' })
  @ApiResponse({ status: 200, description: 'Detected country (or null if not available)' })
  async detectCountryFromIp(@Req() req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'] as string | string[] | undefined;
    const ipFromHeader =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : undefined;

    const ip =
      ipFromHeader ||
      (req.socket && req.socket.remoteAddress) ||
      (req as any).ip ||
      null;

    const countryCode = await this.geoIpService.detectCountryCode(ip);

    if (!countryCode) {
      return { countryCode: null, country: null };
    }

    const country = await this.countriesService.findByCode(countryCode);

    return {
      countryCode,
      country: country || null,
    };
  }

  @Get(':code')
  @Public()
  @ApiOperation({ summary: 'Get country by code' })
  @ApiResponse({ status: 200, description: 'Country retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async getCountryByCode(@Param('code') code: string) {
    const country = await this.countriesService.findByCode(code);
    if (!country) {
      return null;
    }
    return country;
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new country (Admin only)' })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  async createCountry(@Body() country: Omit<Country, 'id' | 'createdAt' | 'updatedAt'>): Promise<Country> {
    return this.countriesService.create(country);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update country (Admin only)' })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  async updateCountry(
    @Param('id') id: string,
    @Body() country: Partial<Omit<Country, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Country> {
    return this.countriesService.update(id, country);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete country (Admin only)' })
  @ApiResponse({ status: 200, description: 'Country deleted successfully' })
  async deleteCountry(@Param('id') id: string): Promise<{ message: string }> {
    await this.countriesService.delete(id);
    return { message: 'Country deleted successfully' };
  }
}
