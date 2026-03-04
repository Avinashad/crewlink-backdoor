import { PartialType } from '@nestjs/swagger';
import { CreateVerificationCriteriaDto } from './create-criteria.dto';

export class UpdateVerificationCriteriaDto extends PartialType(CreateVerificationCriteriaDto) {}
