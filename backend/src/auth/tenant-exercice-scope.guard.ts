import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';

interface RequestShape {
  method?: string;
  route?: { path?: string };
  user?: AuthenticatedUser;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

const EXERCICE_SCOPED_ROUTES = ['enveloppes', 'sections', 'programmes', 'actions'];

@Injectable()
export class TenantExerciceScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestShape>();
    const user = request.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant utilisateur manquant');
    }

    const method = (request.method ?? 'GET').toUpperCase();
    const routePath = request.route?.path ?? '';
    const routeSegment = routePath.split('/')[0] ?? '';
    const needsExerciceScope = EXERCICE_SCOPED_ROUTES.includes(routeSegment);

    if (!needsExerciceScope) {
      return true;
    }

    const exerciceId =
      method === 'POST'
        ? request.body?.exerciceId
        : request.query?.exerciceId ?? request.body?.exerciceId;

    if (typeof exerciceId !== 'string' || exerciceId.trim().length === 0) {
      throw new BadRequestException('exerciceId est requis pour ce referentiel');
    }

    return true;
  }
}
