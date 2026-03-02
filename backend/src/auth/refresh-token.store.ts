import { Injectable, OnModuleInit } from '@nestjs/common';
import { resolveAuthStorageMode } from './auth-storage-mode';
import { PostgresService } from '../common/postgres.service';

interface RefreshTokenRecord {
  jti: string;
  userId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class RefreshTokenStore implements OnModuleInit {
  private readonly storageMode = resolveAuthStorageMode();
  private readonly tokens = new Map<string, RefreshTokenRecord>();
  private initPromise: Promise<void> | null = null;

  constructor(private readonly postgresService: PostgresService) {}

  async onModuleInit(): Promise<void> {
    if (this.storageMode === 'postgres') {
      await this.ensurePostgresReady();
    }
  }

  private async ensurePostgresReady(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.postgresService.query(`
          CREATE TABLE IF NOT EXISTS public.auth_refresh_tokens (
            jti TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);

        await this.postgresService.query(`
          CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id
          ON public.auth_refresh_tokens (user_id)
        `);
      })();
    }

    await this.initPromise;
  }

  async save(record: RefreshTokenRecord): Promise<void> {
    if (this.storageMode === 'memory') {
      this.tokens.set(record.jti, record);
      return;
    }

    await this.ensurePostgresReady();
    await this.postgresService.query(
      `
        INSERT INTO public.auth_refresh_tokens (jti, user_id, tenant_id, token_hash, expires_at, revoked_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (jti)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          tenant_id = EXCLUDED.tenant_id,
          token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at,
          revoked_at = EXCLUDED.revoked_at
      `,
      [record.jti, record.userId, record.tenantId, record.tokenHash, record.expiresAt, record.revokedAt]
    );
  }

  async findByJti(jti: string): Promise<RefreshTokenRecord | undefined> {
    if (this.storageMode === 'memory') {
      return this.tokens.get(jti);
    }

    await this.ensurePostgresReady();
    const result = await this.postgresService.query<{
      jti: string;
      user_id: string;
      tenant_id: string;
      token_hash: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `
        SELECT jti, user_id, tenant_id, token_hash, expires_at, revoked_at
        FROM public.auth_refresh_tokens
        WHERE jti = $1
        LIMIT 1
      `,
      [jti]
    );

    const row = result.rows[0];
    if (!row) {
      return undefined;
    }

    return {
      jti: row.jti,
      userId: row.user_id,
      tenantId: row.tenant_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null
    };
  }

  async revoke(jti: string): Promise<void> {
    if (this.storageMode === 'memory') {
      const token = this.tokens.get(jti);
      if (token && !token.revokedAt) {
        token.revokedAt = new Date();
        this.tokens.set(jti, token);
      }
      return;
    }

    await this.ensurePostgresReady();
    await this.postgresService.query(
      `
        UPDATE public.auth_refresh_tokens
        SET revoked_at = now()
        WHERE jti = $1 AND revoked_at IS NULL
      `,
      [jti]
    );
  }
}
