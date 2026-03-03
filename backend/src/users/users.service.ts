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
    const defaultPassword = process.env.AUTH_TEST_USER_PASSWORD ?? 'ChangeMe123!';
    this.users = [
      {
        id: 'user-1',
        email: process.env.AUTH_TEST_USER_EMAIL ?? 'user@agilys.local',
        passwordHash: hashSync(defaultPassword, 10),
        tenantId: 'tenant-1',
        roles: ['admin_client']
      },
      {
        id: 'user-ops',
        email: 'ops@agilys.local',
        passwordHash: hashSync(defaultPassword, 10),
        tenantId: 'tenant-1',
        roles: ['operateur_saisie']
      },
      {
        id: 'user-super',
        email: 'superadmin@agilys.local',
        passwordHash: hashSync(defaultPassword, 10),
        tenantId: 'tenant-1',
        roles: ['super_admin']
      },
      {
        id: 'user-sod',
        email: 'sod@agilys.local',
        passwordHash: hashSync(defaultPassword, 10),
        tenantId: 'tenant-1',
        roles: ['ordonnateur', 'comptable']
      },
      {
        id: 'user-other-tenant',
        email: 'tenant2-admin@agilys.local',
        passwordHash: hashSync(defaultPassword, 10),
        tenantId: 'tenant-2',
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
        for (const seededUser of this.users) {
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
        }
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

  async existsByTenantId(tenantId: string): Promise<boolean> {
    if (this.storageMode === 'memory') {
      return this.users.some((user) => user.tenantId === tenantId);
    }

    await this.ensurePostgresReady();
    const catalogExists = await this.existsTenantInCatalog(tenantId);
    if (catalogExists !== null) {
      return catalogExists;
    }

    const result = await this.runPostgresQuery<{ exists: number }>(
      `
        SELECT 1 AS exists
        FROM public.auth_users
        WHERE tenant_id = $1 AND is_active = true
        LIMIT 1
      `,
      [tenantId]
    );

    return result.rowCount > 0;
  }

  async assignRole(userId: string, role: string): Promise<UserRecord | undefined> {
    if (this.storageMode === 'memory') {
      const user = this.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return undefined;
      }

      if (!user.roles.includes(role)) {
        user.roles = this.sanitizeRoles([...user.roles, role]);
      }

      return { ...user };
    }

    await this.ensurePostgresReady();
    const result = await this.runPostgresQuery<{
      id: string;
      email: string;
      password_hash: string;
      tenant_id: string;
      roles: string[] | null;
    }>(
      `
        UPDATE public.auth_users
        SET
          roles = CASE
            WHEN $2 = ANY(roles) THEN roles
            ELSE array_append(roles, $2)
          END,
          updated_at = now()
        WHERE id = $1 AND is_active = true
        RETURNING id, email, password_hash, tenant_id, roles
      `,
      [userId, role]
    );

    return this.rowToUserRecord(result.rows[0]);
  }

  async revokeRole(userId: string, role: string): Promise<UserRecord | undefined> {
    if (this.storageMode === 'memory') {
      const user = this.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return undefined;
      }

      user.roles = user.roles.filter((candidateRole) => candidateRole !== role);
      return { ...user };
    }

    await this.ensurePostgresReady();
    const result = await this.runPostgresQuery<{
      id: string;
      email: string;
      password_hash: string;
      tenant_id: string;
      roles: string[] | null;
    }>(
      `
        UPDATE public.auth_users
        SET
          roles = array_remove(roles, $2),
          updated_at = now()
        WHERE id = $1 AND is_active = true
        RETURNING id, email, password_hash, tenant_id, roles
      `,
      [userId, role]
    );

    return this.rowToUserRecord(result.rows[0]);
  }

  private rowToUserRecord(
    row:
      | {
          id: string;
          email: string;
          password_hash: string;
          tenant_id: string;
          roles: string[] | null;
        }
      | undefined
  ): UserRecord | undefined {
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      tenantId: row.tenant_id,
      roles: this.sanitizeRoles(row.roles ?? [])
    };
  }

  private sanitizeRoles(roles: readonly string[]): string[] {
    return [...new Set(roles.map((role) => role.trim()).filter((role) => role.length > 0))];
  }

  private async existsTenantInCatalog(tenantId: string): Promise<boolean | null> {
    try {
      const result = await this.postgresService.query<{ exists: number }>(
        `
          SELECT 1 AS exists
          FROM public.tenants
          WHERE id = $1 AND is_active = true
          LIMIT 1
        `,
        [tenantId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === '42P01') {
        return null;
      }

      throw error;
    }
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
