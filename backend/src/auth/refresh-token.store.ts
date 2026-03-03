import { Injectable } from '@nestjs/common';
import type { DatabaseError } from 'pg';
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
export class RefreshTokenStore {
  private readonly storageMode = resolveAuthStorageMode();
  private readonly tokens = new Map<string, RefreshTokenRecord>();

  constructor(private readonly postgresService: PostgresService) {}

  async save(record: RefreshTokenRecord): Promise<void> {
    if (this.storageMode === 'memory') {
      this.tokens.set(record.jti, record);
      return;
    }

    await this.runPostgresQuery(
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

    const result = await this.runPostgresQuery<{
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

    await this.runPostgresQuery(
      `
        UPDATE public.auth_refresh_tokens
        SET revoked_at = now()
        WHERE jti = $1 AND revoked_at IS NULL
      `,
      [jti]
    );
  }

  async revokeAndSave(previousJti: string, record: RefreshTokenRecord): Promise<boolean> {
    if (this.storageMode === 'memory') {
      const previous = this.tokens.get(previousJti);
      if (!previous || previous.revokedAt) {
        return false;
      }

      previous.revokedAt = new Date();
      this.tokens.set(previousJti, previous);
      this.tokens.set(record.jti, record);
      return true;
    }

    const result = await this.runPostgresQuery<{ jti: string }>(
      `
        WITH revoked AS (
          UPDATE public.auth_refresh_tokens
          SET revoked_at = now()
          WHERE jti = $1 AND revoked_at IS NULL
          RETURNING jti
        )
        INSERT INTO public.auth_refresh_tokens (jti, user_id, tenant_id, token_hash, expires_at, revoked_at)
        SELECT $2, $3, $4, $5, $6, $7
        WHERE EXISTS (SELECT 1 FROM revoked)
        RETURNING jti
      `,
      [previousJti, record.jti, record.userId, record.tenantId, record.tokenHash, record.expiresAt, record.revokedAt]
    );

    return result.rowCount > 0;
  }

  private async runPostgresQuery<T extends object>(
    text: string,
    values: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.postgresService.query<T>(text, values);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === '42P01') {
        throw new Error('Missing auth_refresh_tokens table. Run `pnpm run db:migrate` before starting auth storage in postgres mode.');
      }

      throw error;
    }
  }
}
