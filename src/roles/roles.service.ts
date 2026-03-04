import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto, AssignRolesDto } from './dto';

export interface Permission {
  id: string;
  name: string;
  slug: string;
  description?: string;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  role: Role;
  assignedAt: string;
  assignedBy?: string;
}

@Injectable()
export class RolesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  // Permissions
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to fetch permissions');
    }

    return (data || []).map(this.mapPermission);
  }

  async getPermissionBySlug(slug: string): Promise<Permission | null> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapPermission(data);
  }

  // Roles
  async getAllRoles(includePermissions: boolean = true): Promise<Role[]> {
    let selectQuery = '*';
    
    if (includePermissions) {
      selectQuery = `
        *,
        role_permissions (
          permission:permissions (*)
        )
      `;
    }

    const { data, error } = await this.supabase
      .from('roles')
      .select(selectQuery)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      throw new BadRequestException(`Failed to fetch roles: ${error.message}`);
    }

    return (data || []).map((role: any) => this.mapRole(role));
  }

  async getRoleById(id: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from('roles')
      .select(`
        *,
        role_permissions (
          permission:permissions (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRole(data);
  }

  async getRoleBySlug(slug: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from('roles')
      .select(`
        *,
        role_permissions (
          permission:permissions (*)
        )
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRole(data);
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    // Check if slug already exists
    const existing = await this.getRoleBySlug(createRoleDto.slug);
    if (existing) {
      throw new ConflictException('Role with this slug already exists');
    }

    // Create role
    const { data: roleData, error: roleError } = await this.supabase
      .from('roles')
      .insert({
        name: createRoleDto.name,
        slug: createRoleDto.slug,
        description: createRoleDto.description,
      })
      .select()
      .single();

    if (roleError || !roleData) {
      throw new BadRequestException('Failed to create role');
    }

    // Assign permissions if provided
    if (createRoleDto.permissionSlugs && createRoleDto.permissionSlugs.length > 0) {
      await this.assignPermissionsToRole(roleData.id, createRoleDto.permissionSlugs);
    }

    return this.getRoleById(roleData.id) as Promise<Role>;
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.getRoleById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem && updateRoleDto.name && updateRoleDto.name !== role.name) {
      throw new BadRequestException('Cannot modify system role name');
    }

    const updateData: any = {};
    if (updateRoleDto.name !== undefined) updateData.name = updateRoleDto.name;
    if (updateRoleDto.description !== undefined) updateData.description = updateRoleDto.description;

    const { error } = await this.supabase
      .from('roles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new BadRequestException('Failed to update role');
    }

    // Update permissions if provided
    if (updateRoleDto.permissionSlugs !== undefined) {
      // Remove all existing permissions
      await this.supabase.from('role_permissions').delete().eq('role_id', id);
      // Assign new permissions
      if (updateRoleDto.permissionSlugs.length > 0) {
        await this.assignPermissionsToRole(id, updateRoleDto.permissionSlugs);
      }
    }

    return this.getRoleById(id) as Promise<Role>;
  }

  async deleteRole(id: string): Promise<{ message: string }> {
    const role = await this.getRoleById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }

    const { error } = await this.supabase.from('roles').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Failed to delete role');
    }

    return { message: 'Role deleted successfully' };
  }

  // User roles
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      // First, get user role IDs
      const { data: userRolesData, error: userRolesError } = await this.supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
        // Check if table doesn't exist (migration not run)
        if (userRolesError.code === '42P01' || userRolesError.message?.includes('does not exist')) {
          throw new BadRequestException(
            'Roles and permissions tables not found. Please run the migration first.',
          );
        }
        throw new BadRequestException(
          `Failed to fetch user roles: ${userRolesError.message || JSON.stringify(userRolesError)}`,
        );
      }

      if (!userRolesData || userRolesData.length === 0) {
        return [];
      }

      // Get role IDs
      const roleIds = userRolesData.map((ur) => ur.role_id);

      if (roleIds.length === 0) {
        return [];
      }

      // Fetch roles with their permissions
      const { data: rolesData, error: rolesError } = await this.supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permission:permissions (*)
          )
        `)
        .in('id', roleIds);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        throw new BadRequestException(
          `Failed to fetch roles: ${rolesError.message || JSON.stringify(rolesError)}`,
        );
      }

      if (!rolesData) {
        return [];
      }

      return rolesData.map((role: any) => this.mapRole(role));
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Unexpected error in getUserRoles:', error);
      throw new BadRequestException(
        `Failed to fetch user roles: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(userId);
    const permissionMap = new Map<string, Permission>();

    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        if (!permissionMap.has(permission.id)) {
          permissionMap.set(permission.id, permission);
        }
      });
    });

    return Array.from(permissionMap.values());
  }

  async assignRoleToUser(userId: string, roleSlug: string, assignedBy?: string): Promise<void> {
    const role = await this.getRoleBySlug(roleSlug);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const { error } = await this.supabase.from('user_roles').insert({
      user_id: userId,
      role_id: role.id,
      assigned_by: assignedBy,
    });

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('User already has this role');
      }
      throw new BadRequestException('Failed to assign role');
    }
  }

  async assignRolesToUser(userId: string, roleSlugs: string[], assignedBy?: string): Promise<void> {
    // Remove existing roles first
    await this.removeAllRolesFromUser(userId);

    // Assign new roles
    for (const roleSlug of roleSlugs) {
      await this.assignRoleToUser(userId, roleSlug, assignedBy);
    }
  }

  async removeRoleFromUser(userId: string, roleSlug: string): Promise<void> {
    const role = await this.getRoleBySlug(roleSlug);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent removing superadmin role if it's the only role
    if (role.slug === 'superadmin') {
      const userRoles = await this.getUserRoles(userId);
      if (userRoles.length === 1 && userRoles[0].slug === 'superadmin') {
        throw new BadRequestException('Cannot remove the last superadmin role from a user');
      }
    }

    const { error } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', role.id);

    if (error) {
      throw new BadRequestException('Failed to remove role');
    }
  }

  async removeAllRolesFromUser(userId: string): Promise<void> {
    const { error } = await this.supabase.from('user_roles').delete().eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to remove roles');
    }
  }

  async hasPermission(userId: string, permissionSlug: string): Promise<boolean> {
    // Check if user has superadmin role
    const roles = await this.getUserRoles(userId);
    const hasSuperAdmin = roles.some((role) => role.slug === 'superadmin');
    if (hasSuperAdmin) {
      return true;
    }

    // Check if user has the specific permission
    const permissions = await this.getUserPermissions(userId);
    return permissions.some((p) => p.slug === permissionSlug);
  }

  async hasAnyPermission(userId: string, permissionSlugs: string[]): Promise<boolean> {
    // Check if user has superadmin role
    const roles = await this.getUserRoles(userId);
    const hasSuperAdmin = roles.some((role) => role.slug === 'superadmin');
    if (hasSuperAdmin) {
      return true;
    }

    // Check if user has any of the specified permissions
    const permissions = await this.getUserPermissions(userId);
    return permissionSlugs.some((slug) => permissions.some((p) => p.slug === slug));
  }

  // Helper methods
  private async assignPermissionsToRole(roleId: string, permissionSlugs: string[]): Promise<void> {
    // Get permission IDs
    const { data: permissions, error: permError } = await this.supabase
      .from('permissions')
      .select('id')
      .in('slug', permissionSlugs);

    if (permError || !permissions || permissions.length !== permissionSlugs.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Assign permissions
    const rolePermissions = permissions.map((p) => ({
      role_id: roleId,
      permission_id: p.id,
    }));

    const { error } = await this.supabase.from('role_permissions').insert(rolePermissions);

    if (error) {
      throw new BadRequestException('Failed to assign permissions to role');
    }
  }

  private mapPermission(data: any): Permission {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      resource: data.resource,
      action: data.action,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapRole(data: any): Role {
    const permissions =
      data.role_permissions?.map((rp: any) => {
        const perm = rp.permission || rp;
        return this.mapPermission(perm);
      }) || [];

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      isSystem: data.is_system,
      permissions,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
