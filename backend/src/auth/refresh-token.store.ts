import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

interface RefreshTokenRecord {
  jti: string;
  userId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface SerializedRefreshTokenRecord {
  jti: string;
  userId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
}

@Injectable()
export class RefreshTokenStore {
  private readonly logger = new Logger(RefreshTokenStore.name);
  private readonly tokens = new Map<string, RefreshTokenRecord>();
  private readonly storagePath = resolve(process.cwd(), '.data/refresh-tokens.json');

  constructor() {
    this.loadFromDisk();
  }

  save(record: RefreshTokenRecord): void {
    this.tokens.set(record.jti, record);
    this.persistToDisk();
  }

  findByJti(jti: string): RefreshTokenRecord | undefined {
    return this.tokens.get(jti);
  }

  revoke(jti: string): void {
    const token = this.tokens.get(jti);
    if (token && !token.revokedAt) {
      token.revokedAt = new Date();
      this.tokens.set(jti, token);
      this.persistToDisk();
    }
  }

  private loadFromDisk(): void {
    if (!existsSync(this.storagePath)) {
      return;
    }

    try {
      const content = readFileSync(this.storagePath, 'utf8');
      const parsed = JSON.parse(content) as SerializedRefreshTokenRecord[];

      for (const entry of parsed) {
        this.tokens.set(entry.jti, {
          ...entry,
          expiresAt: new Date(entry.expiresAt),
          revokedAt: entry.revokedAt ? new Date(entry.revokedAt) : null
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load refresh token store: ${message}`);
    }
  }

  private persistToDisk(): void {
    const directory = dirname(this.storagePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    const serialized: SerializedRefreshTokenRecord[] = Array.from(this.tokens.values()).map((token) => ({
      ...token,
      expiresAt: token.expiresAt.toISOString(),
      revokedAt: token.revokedAt ? token.revokedAt.toISOString() : null
    }));

    const tempPath = `${this.storagePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(serialized, null, 2), 'utf8');
    renameSync(tempPath, this.storagePath);
    this.logger.debug(`Persisted ${serialized.length} refresh token records`);
  }
}
