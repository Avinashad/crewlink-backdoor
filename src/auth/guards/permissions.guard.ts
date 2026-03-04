import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolesService } from '../../roles/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.id) {
      throw new ForbiddenException('Access denied');
    }

    try {
      // Check if user has superadmin role (bypass all permission checks)
      const userRoles = await this.rolesService.getUserRoles(user.id);
      const hasSuperAdmin = userRoles.some((role) => role.slug === 'superadmin');
      
      if (hasSuperAdmin) {
        return true;
      }

      // Check if user has any of the required permissions
      const hasPermission = await this.rolesService.hasAnyPermission(
        user.id,
        requiredPermissions,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        );
      }
    } catch (error: any) {
      // If tables don't exist yet (migration not run), allow access for now
      // This prevents blocking all requests before migration is run
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        console.warn('Roles/permissions tables not found. Allowing access. Please run migration.');
        return true;
      }
      // Re-throw other errors
      throw error;
    }

    return true;
  }
}
