import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppSettingsService, AppSettings } from './app-settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { Public } from '../auth/decorators';

@ApiTags('App Settings')
@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get app settings (country, currency, etc.)' })
  @ApiResponse({ status: 200, description: 'App settings retrieved successfully' })
  async get(): Promise<AppSettings | null> {
    return this.appSettingsService.get();
  }

  @Put()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update app settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'App settings updated successfully' })
  async update(@Body() dto: UpdateAppSettingsDto): Promise<AppSettings> {
    return this.appSettingsService.update(dto);
  }
}
