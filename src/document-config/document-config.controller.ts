import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  DocumentConfigService,
  DocumentTypeConfig,
} from './document-config.service';
import { CurrentUser } from '../auth/decorators';
import {
  CreateDocumentConfigDto,
  UpdateDocumentConfigDto,
} from './dto';

@ApiTags('Document Config')
@Controller('document-config')
export class DocumentConfigController {
  constructor(private readonly documentConfigService: DocumentConfigService) {}

  @Get('requirements')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document requirements for current user' })
  @ApiResponse({ status: 200, description: 'Document requirements by expertise' })
  async getRequirementsForUser(
    @CurrentUser('sub') userId: string,
  ): Promise<DocumentTypeConfig[]> {
    return this.documentConfigService.getDocumentRequirementsForUser(userId);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document configs with filters (admin)' })
  @ApiResponse({ status: 200, description: 'Document type configs' })
  async getDocumentConfigs(
    @Query('countryCode') countryCode?: string,
    @Query('expertiseCodes') expertiseCodes?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<DocumentTypeConfig[]> {
    const codes = expertiseCodes ? expertiseCodes.split(',') : undefined;
    return this.documentConfigService.getDocumentRequirements({
      countryCode: countryCode || undefined,
      expertiseCodes: codes,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document config by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Document type config' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getById(@Param('id') id: string): Promise<DocumentTypeConfig | null> {
    return this.documentConfigService.getById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create document config (admin)' })
  @ApiResponse({ status: 201, description: 'Created' })
  async create(
    @Body() dto: CreateDocumentConfigDto,
  ): Promise<DocumentTypeConfig> {
    return this.documentConfigService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update document config (admin)' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentConfigDto,
  ): Promise<DocumentTypeConfig> {
    return this.documentConfigService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete document config (admin)' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async delete(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.documentConfigService.delete(id);
    return { ok: true };
  }
}
