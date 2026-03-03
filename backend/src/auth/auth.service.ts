import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { AuthLoggerService } from './auth-logger.service';
import type { AccessTokenClaims, AuthResponse, RefreshTokenClaims } from './auth.types';
import { RefreshTokenStore } from './refresh-token.store';
import { hasIncompatibleRoleCombination } from './authorization.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly authLogger: AuthLoggerService
  ) {
    this.accessTokenSecret = this.requireEnv('JWT_ACCESS_SECRET');
    this.refreshTokenSecret = this.requireEnv('JWT_REFRESH_SECRET');
    this.accessTokenTtlSeconds = this.parsePositiveIntEnv('JWT_ACCESS_TTL_SECONDS', 900);
    this.refreshTokenTtlSeconds = this.parsePositiveIntEnv('JWT_REFRESH_TTL_SECONDS', 604800);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.authLogger.logEvent('login_failure');
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(password, user.passwordHash);
    if (!passwordMatches) {
      this.authLogger.logEvent('login_failure', user.id, user.tenantId);
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair({
      sub: user.id,
      tenantId: user.tenantId,
      roles: user.roles
    });

    this.authLogger.logEvent('login_success', user.id, user.tenantId);
    return tokens;
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const claims = await this.verifyRefreshToken(refreshToken);
    const tokenRecord = await this.refreshTokenStore.findByJti(claims.jti);

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token revoked or expired');
    }

    const tokenHashMatches = await compare(refreshToken, tokenRecord.tokenHash);
    if (!tokenHashMatches) {
      throw new ForbiddenException('Refresh token mismatch');
    }

    const tokens = await this.issueTokenPair({
      sub: claims.sub,
      tenantId: claims.tenantId,
      roles: claims.roles
    }, claims.jti);

    this.authLogger.logEvent('refresh', claims.sub, claims.tenantId);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const claims = await this.verifyRefreshToken(refreshToken);
    await this.refreshTokenStore.revoke(claims.jti);
    this.authLogger.logEvent('logout', claims.sub, claims.tenantId);
  }

  async assignRole(actor: AuthenticatedUser, userId: string, role: string): Promise<{ userId: string; roles: string[] }> {
    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    this.assertTenantRoleManagement(actor, targetUser.tenantId);

    const targetRolesAfterAssign = targetUser.roles.includes(role) ? targetUser.roles : [...targetUser.roles, role];
    if (hasIncompatibleRoleCombination(targetRolesAfterAssign)) {
      throw new ForbiddenException('Separation des responsabilites: roles ordonnateur et comptable incompatibles');
    }

    const updatedUser = await this.usersService.assignRole(userId, role);
    if (!updatedUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      userId: updatedUser.id,
      roles: updatedUser.roles
    };
  }

  async revokeRole(actor: AuthenticatedUser, userId: string, role: string): Promise<{ userId: string; roles: string[] }> {
    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    this.assertTenantRoleManagement(actor, targetUser.tenantId);

    const updatedUser = await this.usersService.revokeRole(userId, role);
    if (!updatedUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      userId: updatedUser.id,
      roles: updatedUser.roles
    };
  }

  private async issueTokenPair(claims: AccessTokenClaims, rotateFromJti?: string): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync(claims, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenTtlSeconds
    });

    const refreshJti = randomUUID();
    const refreshPayload: RefreshTokenClaims = {
      ...claims,
      jti: refreshJti,
      type: 'refresh'
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenTtlSeconds
    });

    const refreshTokenHash = await hash(refreshToken, 10);
    const refreshRecord = {
      jti: refreshJti,
      userId: claims.sub,
      tenantId: claims.tenantId,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlSeconds * 1000),
      revokedAt: null
    };

    if (rotateFromJti) {
      const rotated = await this.refreshTokenStore.revokeAndSave(rotateFromJti, refreshRecord);
      if (!rotated) {
        throw new ForbiddenException('Refresh token revoked or expired');
      }
    } else {
      await this.refreshTokenStore.save(refreshRecord);
    }

    return {
      accessToken,
      refreshToken
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenClaims> {
    try {
      const claims = await this.jwtService.verifyAsync<RefreshTokenClaims>(refreshToken, {
        secret: this.refreshTokenSecret
      });

      if (claims.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return claims;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }

  private parsePositiveIntEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid positive integer for ${name}: ${raw}`);
    }

    return parsed;
  }

  private assertTenantRoleManagement(actor: AuthenticatedUser, targetTenantId: string): void {
    const isSuperAdmin = actor.roles.includes('super_admin');
    if (!isSuperAdmin && actor.tenantId !== targetTenantId) {
      throw new ForbiddenException('Gestion des roles inter-tenant interdite');
    }
  }
}
