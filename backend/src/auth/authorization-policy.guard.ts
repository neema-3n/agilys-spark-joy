import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { AuthorizationAuditService } from './authorization-audit.service';
import { AuthorizationPolicyService } from './authorization-policy.service';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { Permission } from './authorization.types';

interface RequestShape {
  method?: string;
  route?: { path?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthorizationPolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: AuthorizationPolicyService,
    private readonly authorizationAuditService: AuthorizationAuditService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestShape>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifie');
    }

    const action = this.resolveAction(request);
    const decision = this.policyService.evaluate(user, requiredPermissions);
    this.authorizationAuditService.logDecision({
      userId: user.sub,
      tenantId: user.tenantId,
      action,
      decision: decision.allowed ? 'allow' : 'deny',
      reason: decision.reason
    });

    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason ?? 'Action refusee par la politique de securite');
    }

    return true;
  }

  private resolveAction(request: RequestShape): string {
    const method = (request.method ?? 'UNKNOWN').toUpperCase();
    const path = request.route?.path ?? 'unknown-route';
    return `${method} ${path}`;
  }
}
