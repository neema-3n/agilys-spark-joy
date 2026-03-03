import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from './authenticated-user.interface';
import type { AccessTokenClaims } from './auth.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string>; user?: AuthenticatedUser }>();
    const rawAuthorization = request.headers?.authorization ?? request.headers?.Authorization;

    if (!rawAuthorization || !rawAuthorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = rawAuthorization.replace('Bearer ', '').trim();
    if (!token) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Missing JWT_ACCESS_SECRET');
    }

    try {
      const claims = await this.jwtService.verifyAsync<AccessTokenClaims>(token, { secret });

      if (!claims.sub || !claims.tenantId || !Array.isArray(claims.roles)) {
        throw new UnauthorizedException('Invalid access token claims');
      }

      const currentUser = await this.usersService.findById(claims.sub);
      if (!currentUser || currentUser.tenantId !== claims.tenantId) {
        throw new UnauthorizedException('Unknown or inactive user');
      }

      request.user = {
        sub: currentUser.id,
        tenantId: currentUser.tenantId,
        roles: currentUser.roles
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
