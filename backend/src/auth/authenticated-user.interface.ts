import type { AccessTokenClaims } from './auth.types';

export interface AuthenticatedUser extends AccessTokenClaims {
  sub: string;
}
