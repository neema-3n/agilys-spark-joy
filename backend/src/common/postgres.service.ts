import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

interface SqlExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}

export interface SchemaPrerequisiteColumn {
  table: string;
  column: string;
}

export interface SchemaPrerequisiteCheckResult {
  missingRelations: string[];
  missingColumns: SchemaPrerequisiteColumn[];
}

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

  async withTransaction<T>(callback: (executor: SqlExecutor) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client as PoolClient & SqlExecutor);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async assertSchemaPrerequisites(input: {
    relations: string[];
    columns: SchemaPrerequisiteColumn[];
  }): Promise<SchemaPrerequisiteCheckResult> {
    const missingRelationsResult = await this.query<{ relation_name: string }>(
      `
        SELECT relation_name
        FROM unnest($1::text[]) AS relation_name
        WHERE to_regclass(relation_name) IS NULL
        ORDER BY relation_name ASC
      `,
      [input.relations]
    );

    const requiredColumns = input.columns.map(({ table, column }) => `${table}.${column}`);
    const missingColumnsResult = requiredColumns.length === 0
      ? { rows: [] as Array<{ table_name: string; column_name: string }> }
      : await this.query<{ table_name: string; column_name: string }>(
          `
            WITH required AS (
              SELECT
                split_part(item, '.', 1) AS table_schema,
                split_part(item, '.', 2) AS table_name,
                split_part(item, '.', 3) AS column_name
              FROM unnest($1::text[]) AS item
            )
            SELECT
              CONCAT(required.table_schema, '.', required.table_name) AS table_name,
              required.column_name
            FROM required
            LEFT JOIN information_schema.columns columns
              ON columns.table_schema = required.table_schema
             AND columns.table_name = required.table_name
             AND columns.column_name = required.column_name
            WHERE columns.column_name IS NULL
            ORDER BY table_name ASC, required.column_name ASC
          `,
          [requiredColumns]
        );

    return {
      missingRelations: missingRelationsResult.rows.map((row) => row.relation_name),
      missingColumns: missingColumnsResult.rows.map((row) => ({
        table: row.table_name,
        column: row.column_name,
      })),
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
