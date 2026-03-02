import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private pool: Pool | null = null;

  private createPool(): Pool {
    const host = process.env.POSTGRES_HOST ?? '127.0.0.1';
    const port = Number(process.env.POSTGRES_PORT ?? 5432);
    const database = process.env.POSTGRES_DB ?? 'agilys';
    const user = process.env.POSTGRES_USER ?? 'agilys_app';
    const password = process.env.POSTGRES_PASSWORD ?? 'change-me-local-only';

    return new Pool({
      host,
      port,
      database,
      user,
      password,
      max: 10
    });
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = this.createPool();
    }

    return this.pool;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.getPool().query<T>(text, values);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
