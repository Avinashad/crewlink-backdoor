import { PartialType } from '@nestjs/swagger';
import { CreatePlatformFeeTierDto } from './create-platform-fee-tier.dto';

export class UpdatePlatformFeeTierDto extends PartialType(
  CreatePlatformFeeTierDto,
) {}
