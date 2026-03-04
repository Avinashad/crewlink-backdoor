import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import type { CreateAddressDto, UpdateAddressDto } from './addresses.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('primary')
  @ApiOperation({ summary: 'Get user primary address' })
  @ApiResponse({ status: 200, description: 'Primary address retrieved' })
  async getPrimaryAddress(@CurrentUser('id') userId: string) {
    return this.addressesService.getPrimaryAddress(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved' })
  async getAllAddresses(@CurrentUser('id') userId: string) {
    return this.addressesService.getUserAddresses(userId);
  }

  @Post('primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update primary address' })
  @ApiResponse({ status: 200, description: 'Primary address saved' })
  async upsertPrimaryAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.upsertPrimaryAddress(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(userId, addressId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    await this.addressesService.deleteAddress(userId, addressId);
  }
}
