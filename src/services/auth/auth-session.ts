import { AppRole, User } from '@/types';

export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  roles: string[];
  exp?: number;
  email?: string;
  nom?: string;
  prenom?: string;
}

const BASE64URL_PADDING = 4;
const utf8Decoder = new TextDecoder();

const normalizeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % BASE64URL_PADDING;
  if (remainder === 0) {
    return normalized;
  }

  return `${normalized}${'='.repeat(BASE64URL_PADDING - remainder)}`;
};

const decodeBase64 = (value: string): string => {
  const normalized = normalizeBase64Url(value);
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return utf8Decoder.decode(bytes);
};

export const decodeAccessTokenClaims = (token: string): AccessTokenClaims | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const rawPayload = decodeBase64(segments[1]);
    const payload = JSON.parse(rawPayload) as Partial<AccessTokenClaims>;

    if (!payload.sub || !payload.tenantId || !Array.isArray(payload.roles)) {
      return null;
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      roles: payload.roles,
      exp: payload.exp,
      email: payload.email,
      nom: payload.nom,
      prenom: payload.prenom
    };
  } catch {
    return null;
  }
};

export const getTokenExpirationMs = (token: string): number | null => {
  const claims = decodeAccessTokenClaims(token);
  if (!claims?.exp) {
    return null;
  }

  return claims.exp * 1000;
};

export const isTokenExpired = (token: string, clockSkewSeconds = 10): boolean => {
  const claims = decodeAccessTokenClaims(token);

  if (!claims?.exp) {
    return true;
  }

  const threshold = Date.now() + clockSkewSeconds * 1000;
  return claims.exp * 1000 <= threshold;
};

const mapApiRoleToAppRole = (role: string): AppRole | null => {
  const normalized = role.toLowerCase();

  const map: Record<string, AppRole> = {
    super_admin: 'super_admin',
    admin_client: 'admin_client',
    directeur_financier: 'directeur_financier',
    chef_service: 'chef_service',
    comptable: 'comptable',
    operateur_saisie: 'operateur_saisie',
    admin: 'admin_client',
    user: 'operateur_saisie'
  };

  return map[normalized] ?? null;
};

export const mapClaimsToUser = (claims: AccessTokenClaims): User => {
  const mappedRoles = claims.roles
    .map(mapApiRoleToAppRole)
    .filter((role): role is AppRole => Boolean(role));

  return {
    id: claims.sub,
    email: claims.email ?? `${claims.sub}@local.agilys`,
    nom: claims.nom ?? 'Utilisateur',
    prenom: claims.prenom ?? 'AGILYS',
    clientId: claims.tenantId,
    roles: mappedRoles
  };
};
