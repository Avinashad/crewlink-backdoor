import { IsUUID, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add to organization' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ 
    description: 'Role to assign', 
  enum: ['owner', 'admin', 'member', 'manager', 'recruiter'],
  default: 'member'
  })
  @IsString()
  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'manager', 'recruiter'])
  role?: string = 'member';
}
