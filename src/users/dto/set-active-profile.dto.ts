import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ProfileType {
  WORKER = 'worker',
  PERSONAL = 'personal',
  ORGANISATION = 'organisation',
}

export class SetActiveProfileDto {
  @ApiProperty({ enum: ProfileType, example: 'worker' })
  @IsEnum(ProfileType)
  profileType: ProfileType;

  @ApiPropertyOptional({ example: 'uuid-of-org', description: 'Required when profileType=organisation' })
  @IsOptional()
  @IsUUID()
  orgId?: string;
}
