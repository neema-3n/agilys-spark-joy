import { ForbiddenException, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { TenantPoliciesService } from './tenant-policies.service';

describe('TenantPoliciesService', () => {
  const actorTenant1: AuthenticatedUser = {
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client']
  };

  const superAdmin: AuthenticatedUser = {
    sub: 'user-super',
    tenantId: 'tenant-1',
    roles: ['super_admin']
  };

  let previousStorageMode: string | undefined;

  beforeEach(() => {
    previousStorageMode = process.env.AUTH_STORAGE_MODE;
    process.env.AUTH_STORAGE_MODE = 'memory';
  });

  afterEach(() => {
    if (previousStorageMode === undefined) {
      delete process.env.AUTH_STORAGE_MODE;
      return;
    }

    process.env.AUTH_STORAGE_MODE = previousStorageMode;
  });

  it('returns default policy when tenant has no persisted policy yet', async () => {
    const service = new TenantPoliciesService({} as PostgresService);

    const policy = await service.getRetentionPolicy(actorTenant1);

    expect(policy.tenantId).toBe('tenant-1');
    expect(policy.version).toBe(0);
    expect(policy.retentionDays).toBe(365);
    expect(policy.legalHoldEnabled).toBe(false);
  });

  it('versions policy updates per tenant without destructive overwrite', async () => {
    const service = new TenantPoliciesService({} as PostgresService);

    const first = await service.updateRetentionPolicy(actorTenant1, {
      retentionDays: 180,
      legalHoldEnabled: false
    });
    const second = await service.updateRetentionPolicy(actorTenant1, {
      retentionDays: 365,
      legalHoldEnabled: true
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);

    const current = await service.getRetentionPolicy(actorTenant1);
    expect(current.version).toBe(2);
    expect(current.retentionDays).toBe(365);
    expect(current.legalHoldEnabled).toBe(true);
  });

  it('rejects cross-tenant updates for non super-admin', async () => {
    const service = new TenantPoliciesService({} as PostgresService);

    await expect(
      service.updateRetentionPolicy(actorTenant1, {
        tenantId: 'tenant-2',
        retentionDays: 120,
        legalHoldEnabled: false
      })
    ).rejects.toThrow(new ForbiddenException('Access hors tenant refuse'));
  });

  it('allows super-admin to target another tenant', async () => {
    const service = new TenantPoliciesService({} as PostgresService);

    const policy = await service.updateRetentionPolicy(superAdmin, {
      tenantId: 'tenant-2',
      retentionDays: 90,
      legalHoldEnabled: true
    });

    expect(policy.tenantId).toBe('tenant-2');
    expect(policy.version).toBe(1);
  });

  it('writes minimal audit payload on allow and deny decisions', async () => {
    const service = new TenantPoliciesService({} as PostgresService);
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await service.getRetentionPolicy(actorTenant1);
    await expect(
      service.updateRetentionPolicy(actorTenant1, {
        tenantId: 'tenant-2',
        retentionDays: 300,
        legalHoldEnabled: false
      })
    ).rejects.toThrow(ForbiddenException);

    expect(logSpy).toHaveBeenCalled();
    const payloads = logSpy.mock.calls.map((call) => call[0] as string);
    expect(payloads.some((payload) => payload.includes('"decision":"allow"'))).toBe(true);
    expect(payloads.some((payload) => payload.includes('"decision":"deny"'))).toBe(true);
    expect(payloads.every((payload) => !payload.includes('passwordHash'))).toBe(true);

    logSpy.mockRestore();
  });
});
