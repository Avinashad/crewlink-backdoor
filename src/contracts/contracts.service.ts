import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { PdfService } from './pdf.service';
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
  IssueContractDto,
  SignContractDto,
  ContractBlockDto,
} from './dto';

export interface ContractTemplate {
  id: string;
  orgId?: string;
  personalUserId?: string;
  ownerType: 'org' | 'personal';
  name: string;
  description?: string;
  blocks: ContractBlockDto[];
  variablesUsed: string[];
  isPredefined: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssuedContract {
  id: string;
  orgId?: string;
  senderUserId: string;
  senderType: 'org' | 'personal';
  templateId?: string;
  jobPostId?: string;
  applicationId?: string;
  workerUserId: string;
  issuedBy: string;
  blocksSnapshot: ContractBlockDto[];
  resolvedVariables: Record<string, string>;
  pdfStoragePath?: string;
  documentHash?: string;
  offerExpiryAt?: string;
  offerNote?: string;
  senderChecklist: Record<string, boolean>;
  senderChecklistConfirmedAt?: string;
  status: 'pending' | 'viewed' | 'signed' | 'declined' | 'expired' | 'revoked';
  issuedAt: string;
  viewedAt?: string;
  signedAt?: string;
  consentCheckboxes: Record<string, boolean>;
  consentGivenAt?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractClause {
  id: string;
  key: string;
  title: string;
  body: string;
  category: string;
  countryCode?: string;
  sortOrder: number;
}

export interface AuditEvent {
  id: string;
  contractId: string;
  eventType: string;
  actorUserId?: string;
  actorRole?: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
    private readonly pdfService: PdfService,
  ) {}

  // ── Membership helpers ────────────────────────────────────────────────────

  private async checkOrgMembership(
    orgId: string,
    userId: string,
    requiredRoles?: string[],
  ): Promise<boolean> {
    let query = this.supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    const { data, error } = await query;
    if (error || !data) return false;
    if (requiredRoles && !requiredRoles.includes(data.role)) return false;
    return true;
  }

  private async assertOrgMembership(
    orgId: string,
    userId: string,
    requiredRoles?: string[],
  ): Promise<void> {
    const ok = await this.checkOrgMembership(orgId, userId, requiredRoles);
    if (!ok) throw new ForbiddenException('You do not have access to this organisation');
  }

  private async insertAuditLog(
    contractId: string,
    eventType: string,
    actorUserId: string | null,
    actorRole: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.supabase.from('contract_audit_log').insert({
      contract_id: contractId,
      event_type: eventType,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      metadata,
    });
    if (error) {
      this.logger.warn(`Failed to insert audit log: ${error.message}`);
    }
  }

  private computeDocumentHash(blocks: ContractBlockDto[]): string {
    return createHash('sha256')
      .update(JSON.stringify(blocks))
      .digest('hex');
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async createTemplate(
    userId: string,
    dto: CreateContractTemplateDto,
  ): Promise<ContractTemplate> {
    if (dto.ownerType === 'org') {
      if (!dto.orgId) throw new BadRequestException('orgId is required for org templates');
      await this.assertOrgMembership(dto.orgId, userId, ['owner', 'admin', 'recruiter']);
    } else {
      if (!dto.personalUserId) throw new BadRequestException('personalUserId is required for personal templates');
      if (dto.personalUserId !== userId) throw new ForbiddenException('You can only create templates for yourself');
    }

    const variablesUsed = dto.variablesUsed ?? this.extractVariables(dto.blocks);

    const { data, error } = await this.supabase
      .from('contract_templates')
      .insert({
        org_id: dto.orgId ?? null,
        personal_user_id: dto.personalUserId ?? null,
        owner_type: dto.ownerType,
        name: dto.name,
        description: dto.description ?? null,
        blocks: dto.blocks,
        variables_used: variablesUsed,
        is_predefined: false,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create template: ${error.message}`);
    return this.mapTemplate(data);
  }

  async findAllTemplates(
    userId: string,
    orgId?: string,
    includePersonal = false,
  ): Promise<ContractTemplate[]> {
    let query = this.supabase
      .from('contract_templates')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (orgId) {
      await this.assertOrgMembership(orgId, userId);
      query = query.eq('org_id', orgId);
    } else if (includePersonal) {
      query = query.eq('personal_user_id', userId).eq('owner_type', 'personal');
    } else {
      throw new BadRequestException('Provide orgId or set includePersonal=true');
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(`Failed to fetch templates: ${error.message}`);
    return (data ?? []).map(this.mapTemplate);
  }

  async getPredefinedTemplates(): Promise<ContractTemplate[]> {
    const { data, error } = await this.supabase
      .from('contract_templates')
      .select('*')
      .eq('is_predefined', true)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(`Failed to fetch predefined templates: ${error.message}`);
    return (data ?? []).map(this.mapTemplate);
  }

  async getClauseLibrary(): Promise<ContractClause[]> {
    const { data, error } = await this.supabase
      .from('contract_clause_library')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new BadRequestException(`Failed to fetch clause library: ${error.message}`);
    return (data ?? []).map(this.mapClause);
  }

  async findOneTemplate(id: string, userId: string): Promise<ContractTemplate> {
    const { data, error } = await this.supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new NotFoundException('Contract template not found');

    // Access check
    if (!data.is_predefined) {
      if (data.owner_type === 'org') {
        await this.assertOrgMembership(data.org_id, userId);
      } else if (data.owner_type === 'personal' && data.personal_user_id !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.mapTemplate(data);
  }

  async updateTemplate(
    id: string,
    userId: string,
    dto: UpdateContractTemplateDto,
  ): Promise<ContractTemplate> {
    const template = await this.findOneTemplate(id, userId);
    if (template.isPredefined) throw new ForbiddenException('Cannot modify predefined templates');

    if (template.ownerType === 'org') {
      await this.assertOrgMembership(template.orgId!, userId, ['owner', 'admin', 'recruiter']);
    } else if (template.personalUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.blocks !== undefined) {
      updateData.blocks = dto.blocks;
      updateData.variables_used = dto.variablesUsed ?? this.extractVariables(dto.blocks);
    }
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await this.supabase
      .from('contract_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update template: ${error.message}`);
    return this.mapTemplate(data);
  }

  async deleteTemplate(id: string, userId: string): Promise<void> {
    const template = await this.findOneTemplate(id, userId);
    if (template.isPredefined) throw new ForbiddenException('Cannot delete predefined templates');

    if (template.ownerType === 'org') {
      await this.assertOrgMembership(template.orgId!, userId, ['owner', 'admin', 'recruiter']);
    } else if (template.personalUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const { error } = await this.supabase
      .from('contract_templates')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', id);

    if (error) throw new BadRequestException(`Failed to delete template: ${error.message}`);
  }

  // ── Issued Contracts ──────────────────────────────────────────────────────

  async issueContract(userId: string, dto: IssueContractDto): Promise<IssuedContract> {
    // Validate sender checklist — all must be true
    if (!dto.workerEligible || !dto.payRateConfirmed || !dto.termsAccurate || !dto.authorityConfirmed) {
      throw new BadRequestException(
        'All pre-send checklist items must be confirmed before issuing a contract',
      );
    }

    // Validate sender access
    if (dto.senderType === 'org') {
      if (!dto.orgId) throw new BadRequestException('orgId is required for org contracts');
      await this.assertOrgMembership(dto.orgId, userId, ['owner', 'admin', 'recruiter']);
    }

    // Resolve blocks from template or custom
    let blocks: ContractBlockDto[] = dto.blocks ?? [];
    let templateName: string | undefined;

    if (dto.templateId) {
      const template = await this.findOneTemplate(dto.templateId, userId);
      if (!blocks.length) blocks = template.blocks;
      templateName = template.name;
    }

    if (!blocks.length) {
      throw new BadRequestException('Contract must have content: provide templateId or blocks');
    }

    const documentHash = this.computeDocumentHash(blocks);
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('issued_contracts')
      .insert({
        org_id: dto.orgId ?? null,
        sender_user_id: userId,
        sender_type: dto.senderType,
        template_id: dto.templateId ?? null,
        job_post_id: dto.jobPostId ?? null,
        application_id: dto.applicationId ?? null,
        worker_user_id: dto.workerUserId,
        issued_by: userId,
        blocks_snapshot: blocks,
        resolved_variables: dto.resolvedVariables ?? {},
        document_hash: documentHash,
        offer_expiry_at: dto.offerExpiryAt ?? null,
        offer_note: dto.offerNote ?? null,
        sender_checklist: {
          worker_eligible: dto.workerEligible,
          pay_rate_confirmed: dto.payRateConfirmed,
          terms_accurate: dto.termsAccurate,
          authority_confirmed: dto.authorityConfirmed,
        },
        sender_checklist_confirmed_at: now,
        status: 'pending',
        is_locked: false,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to issue contract: ${error.message}`);

    // Insert audit log
    await this.insertAuditLog(data.id, 'issued', userId, dto.senderType === 'org' ? 'org_admin' : 'personal_sender', {
      template_id: dto.templateId,
      job_post_id: dto.jobPostId,
      document_hash: documentHash,
      offer_expiry_at: dto.offerExpiryAt,
    });

    // Generate PDF asynchronously (fire and forget — don't block the response)
    this.pdfService
      .generateForContract(data.id, blocks, dto.resolvedVariables ?? {}, templateName)
      .then((storagePath) => {
        this.supabase
          .from('issued_contracts')
          .update({ pdf_storage_path: storagePath })
          .eq('id', data.id)
          .then(() => {
            this.insertAuditLog(data.id, 'pdf_generated', null, 'system', { pdf_storage_path: storagePath });
          });
      })
      .catch((err) => {
        this.logger.error(`Background PDF generation failed for ${data.id}`, err);
      });

    return this.mapIssuedContract(data);
  }

  async findAllIssuedForOrg(orgId: string, userId: string): Promise<IssuedContract[]> {
    await this.assertOrgMembership(orgId, userId);

    const { data, error } = await this.supabase
      .from('issued_contracts')
      .select('*')
      .eq('org_id', orgId)
      .eq('sender_type', 'org')
      .order('issued_at', { ascending: false });

    if (error) throw new BadRequestException(`Failed to fetch contracts: ${error.message}`);
    return (data ?? []).map(this.mapIssuedContract);
  }

  async findAllIssuedBySender(userId: string): Promise<IssuedContract[]> {
    const { data, error } = await this.supabase
      .from('issued_contracts')
      .select('*')
      .eq('sender_user_id', userId)
      .eq('sender_type', 'personal')
      .order('issued_at', { ascending: false });

    if (error) throw new BadRequestException(`Failed to fetch contracts: ${error.message}`);
    return (data ?? []).map(this.mapIssuedContract);
  }

  async findAllIssuedForWorker(userId: string): Promise<IssuedContract[]> {
    const { data, error } = await this.supabase
      .from('issued_contracts')
      .select('*')
      .eq('worker_user_id', userId)
      .order('issued_at', { ascending: false });

    if (error) throw new BadRequestException(`Failed to fetch contracts: ${error.message}`);
    return (data ?? []).map(this.mapIssuedContract);
  }

  async findOneIssued(id: string, userId: string): Promise<IssuedContract> {
    const { data, error } = await this.supabase
      .from('issued_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Contract not found');
    await this.assertIssuedContractAccess(data, userId);
    return this.mapIssuedContract(data);
  }

  async markViewed(id: string, userId: string): Promise<IssuedContract> {
    const contract = await this.findOneIssued(id, userId);
    if (contract.workerUserId !== userId) throw new ForbiddenException('Only the worker can mark this as viewed');
    if (contract.status !== 'pending') return contract; // Already progressed

    const { data, error } = await this.supabase
      .from('issued_contracts')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to mark viewed: ${error.message}`);

    await this.insertAuditLog(id, 'viewed', userId, 'worker', {});
    return this.mapIssuedContract(data);
  }

  async signContract(
    id: string,
    userId: string,
    dto: SignContractDto,
    userAgent?: string,
    ip?: string,
  ): Promise<IssuedContract> {
    const contract = await this.findOneIssued(id, userId);

    if (contract.workerUserId !== userId) throw new ForbiddenException('Only the worker can sign this contract');
    if (contract.isLocked) throw new BadRequestException('This contract has already been signed or declined');
    if (contract.status === 'expired' || contract.status === 'revoked') {
      throw new BadRequestException(`This contract is ${contract.status} and cannot be signed`);
    }

    // Validate all consent checkboxes
    if (!dto.consentElectronicSig || !dto.consentElectronicDelivery || !dto.consentWithdrawalRight || !dto.consentAccessibility) {
      throw new BadRequestException('All consent checkboxes must be acknowledged to sign');
    }

    // Check offer expiry
    if (contract.offerExpiryAt && new Date(contract.offerExpiryAt) < new Date()) {
      await this.supabase.from('issued_contracts').update({ status: 'expired' }).eq('id', id);
      await this.insertAuditLog(id, 'offer_expired', null, 'system', {});
      throw new BadRequestException('This offer has expired');
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('issued_contracts')
      .update({
        status: 'signed',
        signed_at: now,
        is_locked: true,
        consent_checkboxes: {
          electronic_sig: dto.consentElectronicSig,
          electronic_delivery: dto.consentElectronicDelivery,
          withdrawal_right: dto.consentWithdrawalRight,
          accessibility: dto.consentAccessibility,
        },
        consent_given_at: now,
        signer_user_agent: userAgent ?? null,
        signer_ip: ip ?? null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to sign contract: ${error.message}`);

    await this.insertAuditLog(id, 'signed', userId, 'worker', {
      user_agent: userAgent,
      ip,
      consent_checkboxes: {
        electronic_sig: dto.consentElectronicSig,
        electronic_delivery: dto.consentElectronicDelivery,
        withdrawal_right: dto.consentWithdrawalRight,
        accessibility: dto.consentAccessibility,
      },
      document_hash: contract.documentHash,
    });

    return this.mapIssuedContract(data);
  }

  async declineContract(id: string, userId: string): Promise<IssuedContract> {
    const contract = await this.findOneIssued(id, userId);
    if (contract.workerUserId !== userId) throw new ForbiddenException('Only the worker can decline this contract');
    if (contract.isLocked) throw new BadRequestException('This contract is already finalised');

    const { data, error } = await this.supabase
      .from('issued_contracts')
      .update({ status: 'declined', declined_at: new Date().toISOString(), is_locked: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to decline contract: ${error.message}`);
    await this.insertAuditLog(id, 'declined', userId, 'worker', {});
    return this.mapIssuedContract(data);
  }

  async revokeContract(id: string, userId: string): Promise<void> {
    const { data: raw, error } = await this.supabase
      .from('issued_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !raw) throw new NotFoundException('Contract not found');

    // Only org admins or personal sender can revoke
    if (raw.sender_type === 'org') {
      await this.assertOrgMembership(raw.org_id, userId, ['owner', 'admin', 'recruiter']);
    } else if (raw.sender_user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (raw.is_locked && raw.status === 'signed') {
      throw new BadRequestException('Cannot revoke a signed contract');
    }

    const { error: updateError } = await this.supabase
      .from('issued_contracts')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: userId })
      .eq('id', id);

    if (updateError) throw new BadRequestException(`Failed to revoke: ${updateError.message}`);
    await this.insertAuditLog(id, 'revoked', userId, raw.sender_type === 'org' ? 'org_admin' : 'personal_sender', {});
  }

  async getAuditLog(contractId: string, userId: string): Promise<AuditEvent[]> {
    // Verify access
    await this.findOneIssued(contractId, userId);

    const { data, error } = await this.supabase
      .from('contract_audit_log')
      .select('*')
      .eq('contract_id', contractId)
      .order('occurred_at', { ascending: true });

    if (error) throw new BadRequestException(`Failed to fetch audit log: ${error.message}`);
    return (data ?? []).map(this.mapAuditEvent);
  }

  async getPdfSignedUrl(id: string, userId: string): Promise<string> {
    const contract = await this.findOneIssued(id, userId);
    if (!contract.pdfStoragePath) throw new NotFoundException('PDF not yet generated for this contract');
    return this.pdfService.getSignedUrl(contract.pdfStoragePath);
  }

  // ── Access helpers ────────────────────────────────────────────────────────

  private async assertIssuedContractAccess(raw: Record<string, unknown>, userId: string): Promise<void> {
    if (raw.worker_user_id === userId) return;
    if (raw.sender_user_id === userId) return;
    if (raw.sender_type === 'org' && raw.org_id) {
      const isMember = await this.checkOrgMembership(raw.org_id as string, userId);
      if (isMember) return;
    }
    throw new ForbiddenException('You do not have access to this contract');
  }

  // ── Variable extraction ───────────────────────────────────────────────────

  private extractVariables(blocks: ContractBlockDto[]): string[] {
    const tokens = new Set<string>();
    const regex = /\{\{(\w+)\}\}/g;
    for (const block of blocks) {
      for (const text of [block.content, block.title ?? '']) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          tokens.add(match[1]);
        }
        regex.lastIndex = 0;
      }
    }
    return Array.from(tokens);
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapTemplate = (raw: Record<string, unknown>): ContractTemplate => ({
    id: raw.id as string,
    orgId: raw.org_id as string | undefined,
    personalUserId: raw.personal_user_id as string | undefined,
    ownerType: raw.owner_type as 'org' | 'personal',
    name: raw.name as string,
    description: raw.description as string | undefined,
    blocks: (raw.blocks as ContractBlockDto[]) ?? [],
    variablesUsed: (raw.variables_used as string[]) ?? [],
    isPredefined: raw.is_predefined as boolean,
    isActive: raw.is_active as boolean,
    createdBy: raw.created_by as string,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  });

  private mapIssuedContract = (raw: Record<string, unknown>): IssuedContract => ({
    id: raw.id as string,
    orgId: raw.org_id as string | undefined,
    senderUserId: raw.sender_user_id as string,
    senderType: raw.sender_type as 'org' | 'personal',
    templateId: raw.template_id as string | undefined,
    jobPostId: raw.job_post_id as string | undefined,
    applicationId: raw.application_id as string | undefined,
    workerUserId: raw.worker_user_id as string,
    issuedBy: raw.issued_by as string,
    blocksSnapshot: (raw.blocks_snapshot as ContractBlockDto[]) ?? [],
    resolvedVariables: (raw.resolved_variables as Record<string, string>) ?? {},
    pdfStoragePath: raw.pdf_storage_path as string | undefined,
    documentHash: raw.document_hash as string | undefined,
    offerExpiryAt: raw.offer_expiry_at as string | undefined,
    offerNote: raw.offer_note as string | undefined,
    senderChecklist: (raw.sender_checklist as Record<string, boolean>) ?? {},
    senderChecklistConfirmedAt: raw.sender_checklist_confirmed_at as string | undefined,
    status: raw.status as IssuedContract['status'],
    issuedAt: raw.issued_at as string,
    viewedAt: raw.viewed_at as string | undefined,
    signedAt: raw.signed_at as string | undefined,
    consentCheckboxes: (raw.consent_checkboxes as Record<string, boolean>) ?? {},
    consentGivenAt: raw.consent_given_at as string | undefined,
    isLocked: raw.is_locked as boolean,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  });

  private mapClause = (raw: Record<string, unknown>): ContractClause => ({
    id: raw.id as string,
    key: raw.key as string,
    title: raw.title as string,
    body: raw.body as string,
    category: raw.category as string,
    countryCode: raw.country_code as string | undefined,
    sortOrder: raw.sort_order as number,
  });

  private mapAuditEvent = (raw: Record<string, unknown>): AuditEvent => ({
    id: raw.id as string,
    contractId: raw.contract_id as string,
    eventType: raw.event_type as string,
    actorUserId: raw.actor_user_id as string | undefined,
    actorRole: raw.actor_role as string | undefined,
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    occurredAt: raw.occurred_at as string,
  });
}
