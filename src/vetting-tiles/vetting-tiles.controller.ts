import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { VettingTilesService } from './vetting-tiles.service';
import { CreateVettingTileDto, UpdateVettingTileDto, VettingTileQueryDto } from './dto';

@ApiTags('Vetting Tiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vetting-tiles')
export class VettingTilesController {
  constructor(private readonly vettingTilesService: VettingTilesService) {}

  @Get()
  @ApiOperation({ summary: 'List vetting tiles (filtered by country/expertise)' })
  @ApiResponse({ status: 200, description: 'Vetting tiles retrieved' })
  async list(@Query() query: VettingTileQueryDto) {
    return this.vettingTilesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vetting tile by id' })
  @ApiResponse({ status: 200, description: 'Vetting tile retrieved' })
  @ApiResponse({ status: 404, description: 'Vetting tile not found' })
  async get(@Param('id') id: string) {
    return this.vettingTilesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create vetting tile (admin only)' })
  @ApiResponse({ status: 201, description: 'Vetting tile created' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate code' })
  async create(@Body() dto: CreateVettingTileDto) {
    return this.vettingTilesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vetting tile (admin only)' })
  @ApiResponse({ status: 200, description: 'Vetting tile updated' })
  @ApiResponse({ status: 404, description: 'Vetting tile not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateVettingTileDto) {
    return this.vettingTilesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vetting tile (admin only)' })
  @ApiResponse({ status: 200, description: 'Vetting tile deleted' })
  @ApiResponse({ status: 404, description: 'Vetting tile not found' })
  async delete(@Param('id') id: string) {
    await this.vettingTilesService.delete(id);
    return { ok: true };
  }
}
