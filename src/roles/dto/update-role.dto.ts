import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ example: 'Content Manager', description: 'Role name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Manages content and media', description: 'Role description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['users.view', 'onboarding.update'], description: 'Permission slugs to assign', required: false })
  @IsOptional()
  permissionSlugs?: string[];
}
