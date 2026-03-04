import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  IsObject,
  IsIn,
  IsISO8601,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractBlockDto } from './create-contract-template.dto';

export class IssueContractDto {
  @ApiPropertyOptional({ description: 'Organization ID (required for sender_type=org)' })
  @IsUUID()
  @IsOptional()
  orgId?: string;

  @ApiProperty({ enum: ['org', 'personal'] })
  @IsString()
  @IsIn(['org', 'personal'])
  senderType: 'org' | 'personal';

  @ApiProperty({ description: 'Worker user ID to send the contract to' })
  @IsUUID()
  workerUserId: string;

  @ApiPropertyOptional({ description: 'Contract template ID to use' })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  jobPostId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  applicationId?: string;

  @ApiPropertyOptional({ description: 'Custom blocks override (if not using a template)' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContractBlockDto)
  blocks?: ContractBlockDto[];

  @ApiPropertyOptional({ description: 'Pre-resolved variable values e.g. { worker_name: "Jane" }' })
  @IsObject()
  @IsOptional()
  resolvedVariables?: Record<string, string>;

  // ── Offer settings ──────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'ISO 8601 datetime when the offer expires' })
  @IsISO8601()
  @IsOptional()
  offerExpiryAt?: string;

  @ApiPropertyOptional({ description: 'Optional note/message to the worker' })
  @IsString()
  @IsOptional()
  offerNote?: string;

  // ── Pre-send checklist (all must be TRUE) ────────────────────────────────────
  @ApiProperty({ description: 'I confirm this worker is eligible for this role' })
  @IsBoolean()
  workerEligible: boolean;

  @ApiProperty({ description: 'I confirm the pay rate and working hours are accurate' })
  @IsBoolean()
  payRateConfirmed: boolean;

  @ApiProperty({ description: 'I confirm the contract terms reflect actual conditions' })
  @IsBoolean()
  termsAccurate: boolean;

  @ApiProperty({ description: 'I confirm I have authority to issue this offer' })
  @IsBoolean()
  authorityConfirmed: boolean;
}
