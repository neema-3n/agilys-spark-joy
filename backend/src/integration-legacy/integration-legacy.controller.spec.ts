import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { IntegrationLegacyController } from './integration-legacy.controller';

describe('IntegrationLegacyController metadata', () => {
  const reflector = new Reflector();

  it('sécurise le contrôleur avec JwtAuthGuard + AuthorizationPolicyGuard', () => {
    const guards = reflector.getAllAndOverride(GUARDS_METADATA, [IntegrationLegacyController]);

    expect(guards).toEqual([JwtAuthGuard, AuthorizationPolicyGuard]);
  });

  it('protège la supervision avec permission audit read', () => {
    const method = IntegrationLegacyController.prototype.getSupervision;
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as string[];

    expect(permissions).toEqual(['referentiels:audit:read']);
  });

  it('protège le retry avec permission write', () => {
    const method = IntegrationLegacyController.prototype.retryFailed;
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as string[];

    expect(permissions).toEqual(['referentiels:write']);
  });
});
