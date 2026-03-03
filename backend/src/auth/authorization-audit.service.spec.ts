import { Logger } from '@nestjs/common';
import { AuthorizationAuditService } from './authorization-audit.service';

describe('AuthorizationAuditService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs minimal payload with timestamp and no sensitive fields', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const service = new AuthorizationAuditService();

    service.logDecision({
      userId: 'user-1',
      tenantId: 'tenant-1',
      action: 'POST exercices',
      decision: 'deny',
      reason: 'Permission insuffisante'
    });

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const rawPayload = loggerSpy.mock.calls[0][0] as string;
    const payload = JSON.parse(rawPayload) as Record<string, unknown>;

    expect(payload.userId).toBe('user-1');
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.action).toBe('POST exercices');
    expect(payload.decision).toBe('deny');
    expect(payload.timestamp).toEqual(expect.any(String));
    expect(payload.password).toBeUndefined();
    expect(payload.passwordHash).toBeUndefined();
    expect(payload.refreshToken).toBeUndefined();
  });
});
