export const BUSINESS_ROLES = [
  'super_admin',
  'admin_client',
  'directeur_financier',
  'ordonnateur',
  'comptable',
  'operateur_saisie',
  'auditeur'
] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const PERMISSIONS = [
  'referentiels:read',
  'referentiels:write',
  'referentiels:audit:read',
  'roles:manage',
  'tenant_policies:read',
  'tenant_policies:write'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  requiredPermission?: Permission;
}

export const ROLE_PERMISSIONS: Readonly<Record<BusinessRole, readonly Permission[]>> = {
  super_admin: [
    'referentiels:read',
    'referentiels:write',
    'referentiels:audit:read',
    'roles:manage',
    'tenant_policies:read',
    'tenant_policies:write'
  ],
  admin_client: [
    'referentiels:read',
    'referentiels:write',
    'referentiels:audit:read',
    'roles:manage',
    'tenant_policies:read',
    'tenant_policies:write'
  ],
  directeur_financier: ['referentiels:read', 'referentiels:write', 'referentiels:audit:read', 'tenant_policies:read'],
  ordonnateur: ['referentiels:read', 'referentiels:write'],
  comptable: ['referentiels:read', 'referentiels:write'],
  operateur_saisie: ['referentiels:read'],
  auditeur: ['referentiels:read', 'referentiels:audit:read']
};

export const SOD_INCOMPATIBLE_ROLE_PAIRS: ReadonlyArray<readonly [BusinessRole, BusinessRole]> = [
  ['ordonnateur', 'comptable']
];

export const hasIncompatibleRoleCombination = (roles: readonly string[]): boolean => {
  const roleSet = new Set(roles);
  return SOD_INCOMPATIBLE_ROLE_PAIRS.some(
    ([firstRole, secondRole]) => roleSet.has(firstRole) && roleSet.has(secondRole)
  );
};
