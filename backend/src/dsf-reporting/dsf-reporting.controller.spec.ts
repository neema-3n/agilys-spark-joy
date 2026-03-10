import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { DsfReportingController } from './dsf-reporting.controller';

describe('DsfReportingController security metadata', () => {
  it('applique les guards JwtAuthGuard et AuthorizationPolicyGuard au controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DsfReportingController) as Array<unknown>;
    expect(guards).toEqual([JwtAuthGuard, AuthorizationPolicyGuard]);
  });

  it('exige referentiels:read sur toutes les routes dsf', () => {
    const methods = ['validate', 'startExport', 'getExportStatus', 'downloadExport'] as const;

    for (const method of methods) {
      const handler = DsfReportingController.prototype[method] as (...args: unknown[]) => unknown;
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[];
      expect(permissions).toEqual(['referentiels:read']);
    }
  });
});
