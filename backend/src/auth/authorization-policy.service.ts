import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';
import {
  hasIncompatibleRoleCombination,
  ROLE_PERMISSIONS,
  type AuthorizationDecision,
  type Permission
} from './authorization.types';

const SOD_SENSITIVE_PERMISSIONS: ReadonlySet<Permission> = new Set(['referentiels:write', 'roles:manage']);

@Injectable()
export class AuthorizationPolicyService {
  evaluate(user: AuthenticatedUser, requiredPermissions: Permission[]): AuthorizationDecision {
    if (!requiredPermissions.length) {
      return { allowed: true };
    }

    if (hasIncompatibleRoleCombination(user.roles) && requiredPermissions.some((permission) => SOD_SENSITIVE_PERMISSIONS.has(permission))) {
      return {
        allowed: false,
        reason: 'Separation des responsabilites: roles ordonnateur et comptable incompatibles'
      };
    }

    const userPermissions = this.resolvePermissions(user.roles);
    const missingPermission = requiredPermissions.find((permission) => !userPermissions.has(permission));

    if (missingPermission) {
      return {
        allowed: false,
        reason: `Permission insuffisante: ${missingPermission}`,
        requiredPermission: missingPermission
      };
    }

    return { allowed: true };
  }

  private resolvePermissions(roles: readonly string[]): Set<Permission> {
    const resolved = new Set<Permission>();

    roles.forEach((role) => {
      const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
      permissions?.forEach((permission) => resolved.add(permission));
    });

    return resolved;
  }
}
