import 'reflect-metadata';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { TresorerieController } from './tresorerie.controller';

const getPermissions = (methodName: keyof TresorerieController): string[] | undefined => {
  return Reflect.getMetadata(PERMISSIONS_KEY, TresorerieController.prototype[methodName]);
};

describe('TresorerieController RBAC metadata', () => {
  it('protège les endpoints supervision avec referentiels:read', () => {
    expect(getPermissions('getSupervision')).toEqual(['referentiels:read']);
    expect(getPermissions('getStats')).toEqual(['referentiels:read']);
    expect(getPermissions('getFlux')).toEqual(['referentiels:read']);
    expect(getPermissions('getPrevisions')).toEqual(['referentiels:read']);
  });

  it('protège les endpoints audit avec referentiels:audit:read', () => {
    expect(getPermissions('getSupervisionAlerts')).toEqual(['referentiels:audit:read']);
    expect(getPermissions('getExceptionAudit')).toEqual(['referentiels:audit:read']);
    expect(getPermissions('getExceptionAuditDetail')).toEqual(['referentiels:audit:read']);
    expect(getPermissions('getExceptionAuditExportPrep')).toEqual(['referentiels:audit:read']);
    expect(getPermissions('getCloseoutDossier')).toEqual(['referentiels:audit:read']);
    expect(getPermissions('getCloseoutDossierExportPrep')).toEqual(['referentiels:audit:read']);
  });
});
