import { Injectable } from '@nestjs/common';

interface RefreshTokenRecord {
  jti: string;
  userId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class RefreshTokenStore {
  private readonly tokens = new Map<string, RefreshTokenRecord>();

  save(record: RefreshTokenRecord): void {
    this.tokens.set(record.jti, record);
  }

  findByJti(jti: string): RefreshTokenRecord | undefined {
    return this.tokens.get(jti);
  }

  revoke(jti: string): void {
    const token = this.tokens.get(jti);
    if (token && !token.revokedAt) {
      token.revokedAt = new Date();
      this.tokens.set(jti, token);
    }
  }
}
