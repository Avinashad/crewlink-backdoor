import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MigrationsService } from './migrations.service';
import { JwtAuthGuard } from '../auth/guards';
// Note: You may want to add an AdminGuard here to restrict access

@ApiTags('Migrations')
@Controller('migrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MigrationsController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run database migrations (Admin only)' })
  @ApiResponse({ status: 200, description: 'Migrations executed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async runMigrations() {
    return this.migrationsService.runMigrations();
  }
}
