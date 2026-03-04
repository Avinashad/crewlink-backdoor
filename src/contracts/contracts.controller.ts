import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import * as express from 'express';
import { ContractsService } from './contracts.service';
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
  IssueContractDto,
  SignContractDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // ── Templates ─────────────────────────────────────────────────────────────

  @Post('templates')
  @ApiOperation({ summary: 'Create a contract template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateContractTemplateDto,
  ) {
    return this.contractsService.createTemplate(userId, dto);
  }

  @Get('templates/predefined')
  @ApiOperation({ summary: 'Get predefined system contract templates' })
  async getPredefinedTemplates() {
    return this.contractsService.getPredefinedTemplates();
  }

  @Get('templates/clauses')
  @ApiOperation({ summary: 'Get standard clause library' })
  async getClauseLibrary() {
    return this.contractsService.getClauseLibrary();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get contract templates for an org or personal user' })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'personal', required: false, type: Boolean })
  async findAllTemplates(
    @CurrentUser('sub') userId: string,
    @Query('orgId') orgId?: string,
    @Query('personal') personal?: string,
  ) {
    return this.contractsService.findAllTemplates(
      userId,
      orgId,
      personal === 'true',
    );
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a contract template by ID' })
  async findOneTemplate(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.findOneTemplate(id, userId);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a contract template' })
  async updateTemplate(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContractTemplateDto,
  ) {
    return this.contractsService.updateTemplate(id, userId, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Soft-delete a contract template' })
  async deleteTemplate(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.contractsService.deleteTemplate(id, userId);
    return { success: true };
  }

  // ── Issued Contracts ──────────────────────────────────────────────────────

  @Post('issue')
  @ApiOperation({ summary: 'Issue a contract to a worker' })
  @ApiResponse({ status: 201, description: 'Contract issued' })
  async issueContract(
    @CurrentUser('sub') userId: string,
    @Body() dto: IssueContractDto,
  ) {
    return this.contractsService.issueContract(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get contracts issued to the current worker' })
  async findMyContracts(@CurrentUser('sub') userId: string) {
    return this.contractsService.findAllIssuedForWorker(userId);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get contracts sent by the current personal user' })
  async findSentContracts(@CurrentUser('sub') userId: string) {
    return this.contractsService.findAllIssuedBySender(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get issued contracts for an organisation' })
  @ApiQuery({ name: 'orgId', required: true })
  async findAllIssuedForOrg(
    @CurrentUser('sub') userId: string,
    @Query('orgId') orgId: string,
  ) {
    return this.contractsService.findAllIssuedForOrg(orgId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an issued contract by ID' })
  async findOneIssued(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.findOneIssued(id, userId);
  }

  @Put(':id/view')
  @ApiOperation({ summary: 'Mark contract as viewed by the worker' })
  async markViewed(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.markViewed(id, userId);
  }

  @Put(':id/sign')
  @ApiOperation({ summary: 'Sign a contract (worker only)' })
  async signContract(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SignContractDto,
    @Req() req: express.Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';
    return this.contractsService.signContract(id, userId, dto, userAgent, ip);
  }

  @Put(':id/decline')
  @ApiOperation({ summary: 'Decline a contract (worker only)' })
  async declineContract(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.declineContract(id, userId);
  }

  @Put(':id/revoke')
  @ApiOperation({ summary: 'Revoke a contract (sender only)' })
  async revokeContract(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.contractsService.revokeContract(id, userId);
    return { success: true };
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get audit log for a contract' })
  async getAuditLog(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.getAuditLog(id, userId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Get a signed URL to download the contract PDF' })
  async getPdfSignedUrl(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const signedUrl = await this.contractsService.getPdfSignedUrl(id, userId);
    return { signedUrl };
  }
}
