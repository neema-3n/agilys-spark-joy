import { Injectable, OnModuleInit } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import type { DatabaseError } from 'pg';
import { resolveAuthStorageMode } from '../auth/auth-storage-mode';
import { PostgresService } from '../common/postgres.service';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  roles: string[];
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly storageMode = resolveAuthStorageMode();
  private readonly users: UserRecord[];
  private initPromise: Promise<void> | null = null;

  constructor(private readonly postgresService: PostgresService) {
    const email = process.env.AUTH_TEST_USER_EMAIL ?? 'user@agilys.local';
    const password = process.env.AUTH_TEST_USER_PASSWORD ?? 'ChangeMe123!';
    this.users = [
      {
        id: 'user-1',
        email,
        passwordHash: hashSync(password, 10),
        tenantId: 'tenant-1',
        roles: ['admin_client']
      }
    ];
  }

  async onModuleInit(): Promise<void> {
    if (this.storageMode === 'postgres') {
      await this.ensurePostgresReady();
    }
  }

  private async ensurePostgresReady(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const seededUser = this.users[0];
        await this.runPostgresQuery(
          `
            INSERT INTO public.auth_users (id, email, password_hash, tenant_id, roles, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (email)
            DO UPDATE SET
              password_hash = EXCLUDED.password_hash,
              tenant_id = EXCLUDED.tenant_id,
              roles = EXCLUDED.roles,
              is_active = true,
              updated_at = now()
          `,
          [seededUser.id, seededUser.email, seededUser.passwordHash, seededUser.tenantId, seededUser.roles]
        );
      })();
    }

    await this.initPromise;
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    if (this.storageMode === 'memory') {
      return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    }

    await this.ensurePostgresReady();
    const result = await this.runPostgresQuery<{
      id: string;
      email: string;
      password_hash: string;
      tenant_id: string;
      roles: string[];
    }>(
      `
        SELECT id, email, password_hash, tenant_id, roles
        FROM public.auth_users
        WHERE LOWER(email) = LOWER($1) AND is_active = true
        LIMIT 1
      `,
      [email]
    );

    const row = result.rows[0];
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      tenantId: row.tenant_id,
      roles: row.roles
    };
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    if (this.storageMode === 'memory') {
      return this.users.find((user) => user.id === id);
    }

    await this.ensurePostgresReady();
    const result = await this.runPostgresQuery<{
      id: string;
      email: string;
      password_hash: string;
      tenant_id: string;
      roles: string[];
    }>(
      `
        SELECT id, email, password_hash, tenant_id, roles
        FROM public.auth_users
        WHERE id = $1 AND is_active = true
        LIMIT 1
      `,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      tenantId: row.tenant_id,
      roles: row.roles
    };
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
        throw new Error('Missing auth_users table. Run `pnpm run db:migrate` before starting auth storage in postgres mode.');
      }

      throw error;
    }
  }
}
