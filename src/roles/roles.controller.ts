import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto, AssignRolesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Roles & Permissions')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('permissions.view')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('roles.view')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async getAllRoles() {
    return this.rolesService.getAllRoles();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('roles.view')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRoleById(@Param('id') id: string) {
    const role = await this.rolesService.getRoleById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role with this slug already exists' })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @Permissions('roles.delete')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }

  @Get('user/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions('users.view', 'roles.view')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  async getUserRoles(@Param('userId') userId: string) {
    return this.rolesService.getUserRoles(userId);
  }

  @Get('user/:userId/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions('users.view', 'roles.view')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rolesService.getUserPermissions(userId);
  }

  @Post('user/:userId/assign')
  @UseGuards(PermissionsGuard)
  @Permissions('roles.assign')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    await this.rolesService.assignRoleToUser(userId, assignRoleDto.roleSlug, currentUserId);
    return { message: 'Role assigned successfully' };
  }

  @Put('user/:userId/assign')
  @UseGuards(PermissionsGuard)
  @Permissions('roles.assign')
  @ApiOperation({ summary: 'Assign multiple roles to user' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() assignRolesDto: AssignRolesDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    await this.rolesService.assignRolesToUser(userId, assignRolesDto.roleSlugs, currentUserId);
    return { message: 'Roles assigned successfully' };
  }

  @Delete('user/:userId/remove/:roleSlug')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @Permissions('roles.assign')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRoleFromUser(@Param('userId') userId: string, @Param('roleSlug') roleSlug: string) {
    await this.rolesService.removeRoleFromUser(userId, roleSlug);
    return { message: 'Role removed successfully' };
  }
}
