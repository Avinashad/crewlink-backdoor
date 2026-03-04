import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  IsObject,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContractBlockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ enum: ['heading', 'paragraph', 'clause', 'divider'] })
  @IsString()
  @IsIn(['heading', 'paragraph', 'clause', 'divider'])
  type: 'heading' | 'paragraph' | 'clause' | 'divider';

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateContractTemplateDto {
  @ApiPropertyOptional({ description: 'Organization ID (required for owner_type=org)' })
  @IsUUID()
  @IsOptional()
  orgId?: string;

  @ApiPropertyOptional({ description: 'Personal user ID (required for owner_type=personal)' })
  @IsUUID()
  @IsOptional()
  personalUserId?: string;

  @ApiProperty({ enum: ['org', 'personal'] })
  @IsString()
  @IsIn(['org', 'personal'])
  ownerType: 'org' | 'personal';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [ContractBlockDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractBlockDto)
  blocks: ContractBlockDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  variablesUsed?: string[];
}
