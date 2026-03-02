export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  roles: string[];
}

export interface RefreshTokenClaims extends AccessTokenClaims {
  jti: string;
  type: 'refresh';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}
