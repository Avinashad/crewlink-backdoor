import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('steps')
  @ApiOperation({ summary: 'List onboarding steps' })
  @ApiResponse({ status: 200, description: 'Steps retrieved' })
  async listSteps() {
    return this.onboardingService.listSteps();
  }

  @Get('steps/:id')
  @ApiOperation({ summary: 'Get onboarding step by id' })
  @ApiResponse({ status: 200, description: 'Step retrieved' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async getStep(@Param('id') id: string) {
    const step = await this.onboardingService.getStep(id);
    if (!step) return null;
    return step;
  }

  @Post('steps')
  @ApiOperation({ summary: 'Create onboarding step' })
  @ApiResponse({ status: 201, description: 'Step created' })
  async createStep(@Body() body: Record<string, unknown>) {
    return this.onboardingService.createStep({
      step_key: body.step_key as string,
      display_name: body.display_name as string,
      description: (body.description as string) ?? null,
      step_order: (body.step_order as number) ?? 1,
      category_key: (body.category_key as string) || null,
      country_code: (body.country_code as string) || null,
      is_active: (body.is_active as boolean) ?? true,
    });
  }

  @Patch('steps/:id')
  @ApiOperation({ summary: 'Update onboarding step' })
  @ApiResponse({ status: 200, description: 'Step updated' })
  async updateStep(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    if (body.step_key !== undefined) payload.step_key = body.step_key;
    if (body.display_name !== undefined) payload.display_name = body.display_name;
    if (body.description !== undefined) payload.description = body.description ?? null;
    if (body.step_order !== undefined) payload.step_order = body.step_order;
    if (body.category_key !== undefined) payload.category_key = body.category_key || null;
    if (body.country_code !== undefined) payload.country_code = body.country_code || null;
    if (body.is_active !== undefined) payload.is_active = body.is_active;
    return this.onboardingService.updateStep(id, payload as Parameters<OnboardingService['updateStep']>[1]);
  }

  @Delete('steps/:id')
  @ApiOperation({ summary: 'Delete onboarding step' })
  @ApiResponse({ status: 200, description: 'Step deleted' })
  async deleteStep(@Param('id') id: string) {
    await this.onboardingService.deleteStep(id);
    return { ok: true };
  }

  @Get('steps/:stepId/fields')
  @ApiOperation({ summary: 'List fields for a step' })
  @ApiResponse({ status: 200, description: 'Fields retrieved' })
  async listFields(@Param('stepId') stepId: string) {
    return this.onboardingService.listFields(stepId);
  }

  @Get('steps/:stepId/fields/:fieldId')
  @ApiOperation({ summary: 'Get field by id' })
  @ApiResponse({ status: 200, description: 'Field retrieved' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async getField(@Param('stepId') stepId: string, @Param('fieldId') fieldId: string) {
    const field = await this.onboardingService.getField(stepId, fieldId);
    if (!field) return null;
    return field;
  }

  @Post('steps/:stepId/fields')
  @ApiOperation({ summary: 'Create field for a step' })
  @ApiResponse({ status: 201, description: 'Field created' })
  async createField(@Param('stepId') stepId: string, @Body() body: Record<string, unknown>) {
    return this.onboardingService.createField(stepId, {
      field_key: body.field_key as string,
      field_label: body.field_label as string,
      field_type: (body.field_type as string) ?? 'text',
      field_options: (body.field_options as unknown) ?? [],
      placeholder: (body.placeholder as string) ?? null,
      help_text: (body.help_text as string) ?? null,
      is_required: (body.is_required as boolean) ?? false,
      field_order: (body.field_order as number) ?? 1,
      country_specific: (body.country_specific as boolean) ?? false,
      country_code: (body.country_code as string) || null,
    });
  }

  @Patch('steps/:stepId/fields/:fieldId')
  @ApiOperation({ summary: 'Update field' })
  @ApiResponse({ status: 200, description: 'Field updated' })
  async updateField(
    @Param('stepId') stepId: string,
    @Param('fieldId') fieldId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const payload: Record<string, unknown> = {};
    if (body.field_key !== undefined) payload.field_key = body.field_key;
    if (body.field_label !== undefined) payload.field_label = body.field_label;
    if (body.field_type !== undefined) payload.field_type = body.field_type;
    if (body.field_options !== undefined) payload.field_options = body.field_options;
    if (body.placeholder !== undefined) payload.placeholder = body.placeholder ?? null;
    if (body.help_text !== undefined) payload.help_text = body.help_text ?? null;
    if (body.is_required !== undefined) payload.is_required = body.is_required;
    if (body.field_order !== undefined) payload.field_order = body.field_order;
    if (body.country_specific !== undefined) payload.country_specific = body.country_specific;
    if (body.country_code !== undefined) payload.country_code = body.country_code || null;
    return this.onboardingService.updateField(stepId, fieldId, payload as Parameters<OnboardingService['updateField']>[2]);
  }

  @Delete('steps/:stepId/fields/:fieldId')
  @ApiOperation({ summary: 'Delete field' })
  @ApiResponse({ status: 200, description: 'Field deleted' })
  async deleteField(@Param('stepId') stepId: string, @Param('fieldId') fieldId: string) {
    await this.onboardingService.deleteField(stepId, fieldId);
    return { ok: true };
  }

  @Post('steps/reorder')
  @ApiOperation({ summary: 'Reorder steps by updating step_order' })
  @ApiResponse({ status: 200, description: 'Steps reordered' })
  async reorderSteps(@Body() body: { stepIds: string[] }) {
    await this.onboardingService.reorderSteps(body.stepIds);
    return { ok: true };
  }

  @Post('steps/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a step with all its fields' })
  @ApiResponse({ status: 201, description: 'Step duplicated' })
  async duplicateStep(@Param('id') id: string) {
    return this.onboardingService.duplicateStep(id);
  }

  @Post('steps/:stepId/fields/reorder')
  @ApiOperation({ summary: 'Reorder fields within a step' })
  @ApiResponse({ status: 200, description: 'Fields reordered' })
  async reorderFields(@Param('stepId') stepId: string, @Body() body: { fieldIds: string[] }) {
    await this.onboardingService.reorderFields(stepId, body.fieldIds);
    return { ok: true };
  }

  @Post('validate-conditional-logic')
  @ApiOperation({ summary: 'Validate conditional logic structure' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateConditionalLogic(@Body() body: { logic: any }) {
    const isValid = this.onboardingService.validateConditionalLogic(body.logic);
    return { valid: isValid };
  }
}
