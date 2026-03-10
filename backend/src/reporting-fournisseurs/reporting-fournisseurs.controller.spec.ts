import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { ReportingFournisseursController } from './reporting-fournisseurs.controller';

describe('ReportingFournisseursController security metadata', () => {
  it('applique les guards JwtAuthGuard et AuthorizationPolicyGuard au controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReportingFournisseursController) as Array<unknown>;

    expect(guards).toEqual([JwtAuthGuard, AuthorizationPolicyGuard]);
  });

  it('exige referentiels:read sur toutes les routes reporting fournisseurs', () => {
    const methods = [
      'getEtatDettesFournisseurs',
      'getEtatAvancesRegularisations',
      'startExport',
      'getExportStatus',
      'downloadExport'
    ] as const;

    for (const method of methods) {
      const handler = ReportingFournisseursController.prototype[method] as (...args: unknown[]) => unknown;
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[];
      expect(permissions).toEqual(['referentiels:read']);
    }
  });
});
