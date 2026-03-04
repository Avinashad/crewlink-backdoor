import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Invite code to accept' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
