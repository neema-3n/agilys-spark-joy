import { AuthorizationPolicyService } from './authorization-policy.service';
import type { AuthenticatedUser } from './authenticated-user.interface';

const baseUser: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: []
};

describe('AuthorizationPolicyService', () => {
  const service = new AuthorizationPolicyService();

  it('allows write permission for admin_client', () => {
    const decision = service.evaluate(
      {
        ...baseUser,
        roles: ['admin_client']
      },
      ['referentiels:write']
    );

    expect(decision.allowed).toBeTruthy();
  });

  it('rejects write permission for read-only role', () => {
    const decision = service.evaluate(
      {
        ...baseUser,
        roles: ['operateur_saisie']
      },
      ['referentiels:write']
    );

    expect(decision.allowed).toBeFalsy();
    expect(decision.reason).toContain('Permission insuffisante');
  });

  it('blocks incompatible ordonnateur/comptable on sensitive actions', () => {
    const decision = service.evaluate(
      {
        ...baseUser,
        roles: ['ordonnateur', 'comptable']
      },
      ['referentiels:write']
    );

    expect(decision.allowed).toBeFalsy();
    expect(decision.reason).toContain('Separation des responsabilites');
  });

  it('allows read for operateur_saisie', () => {
    const decision = service.evaluate(
      {
        ...baseUser,
        roles: ['operateur_saisie']
      },
      ['referentiels:read']
    );

    expect(decision.allowed).toBeTruthy();
  });
});
