import { Injectable, OnModuleInit } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
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
        await this.postgresService.query(`
          CREATE TABLE IF NOT EXISTS public.auth_users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);

        const seededUser = this.users[0];
        await this.postgresService.query(
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
    const result = await this.postgresService.query<{
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
    const result = await this.postgresService.query<{
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
}
