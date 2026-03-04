import { PartialType } from '@nestjs/swagger';
import { CreateVerificationBadgeDto } from './create-badge.dto';

export class UpdateVerificationBadgeDto extends PartialType(CreateVerificationBadgeDto) {}
