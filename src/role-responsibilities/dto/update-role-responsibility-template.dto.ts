import { PartialType } from '@nestjs/swagger';
import { CreateRoleResponsibilityTemplateDto } from './create-role-responsibility-template.dto';

export class UpdateRoleResponsibilityTemplateDto extends PartialType(CreateRoleResponsibilityTemplateDto) {}
