import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { pgSsl } from '../common/pg';

/**
 * Thin Postgres access layer (pg Pool). Kept ORM-free for full control over
 * geo/haversine SQL. See ENGINEERING_PLAN for the prod PostGIS swap.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: pgSsl(),
  });

  async query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query<T>(text, params);
    return res.rows;
  }

  async one<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  /** Run a function inside a transaction; rolls back on throw. */
  async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
