import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'admin', description: 'Role slug to assign' })
  @IsString()
  @IsNotEmpty()
  roleSlug: string;
}

export class AssignRolesDto {
  @ApiProperty({ example: ['admin', 'manager'], description: 'Role slugs to assign' })
  @IsArray()
  @IsString({ each: true })
  roleSlugs: string[];
}
