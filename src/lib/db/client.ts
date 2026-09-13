import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';

let pgPool: Pool | null = null;
let pgliteInstance: any = null;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec?(sql: string): Promise<any>;
}

export interface TransactionClient extends DbClient {}

/**
 * Gets or initializes the database connection.
 * If DATABASE_URL is configured (e.g. Neon PostgreSQL), uses pg.Pool with SSL.
 * Otherwise, falls back to in-process local Postgres engine (@electric-sql/pglite)
 * with a persisted directory at .data/cinebook-pg.
 */
export async function getDb(): Promise<DbClient> {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (connectionString && connectionString.trim() !== '') {
    if (!pgPool) {
      const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
      pgPool = new Pool({
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    return {
      query: async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> => {
        const res = await pgPool!.query(sql, params);
        return { rows: res.rows as T[], rowCount: res.rowCount || 0 };
      },
      exec: async (sql: string): Promise<any> => {
        return await pgPool!.query(sql);
      },
    };
  }

  // Local zero-setup fallback using PGlite
  if (!pgliteInstance) {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = path.resolve(process.cwd(), '.data', 'cinebook-pg');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
  }

  return {
    query: async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> => {
      const res = await pgliteInstance.query(sql, params);
      return { rows: (res.rows || []) as T[], rowCount: res.rows ? res.rows.length : 0 };
    },
    exec: async (sql: string): Promise<any> => {
      return await pgliteInstance.exec(sql);
    },
  };
}

/**
 * Executes a function within an atomic transaction.
 * Supports row locks ('SELECT ... FOR UPDATE') and rollback on failure.
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (connectionString && connectionString.trim() !== '') {
    if (!pgPool) {
      await getDb();
    }
    const client: PoolClient = await pgPool!.connect();
    try {
      await client.query('BEGIN');
      const txClient: TransactionClient = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
          const res = await client.query(sql, params);
          return { rows: res.rows as R[], rowCount: res.rowCount || 0 };
        },
        exec: async (sql: string): Promise<any> => {
          return await client.query(sql);
        },
      };
      const result = await callback(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // PGlite fallback transaction
  const db = await getDb();
  if (pgliteInstance && typeof pgliteInstance.transaction === 'function') {
    return await pgliteInstance.transaction(async (tx: any) => {
      const txClient: TransactionClient = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
          const res = await tx.query(sql, params);
          return { rows: (res.rows || []) as R[], rowCount: res.rows ? res.rows.length : 0 };
        },
        exec: async (sql: string): Promise<any> => {
          return tx.exec ? await tx.exec(sql) : await tx.query(sql);
        },
      };
      return await callback(txClient);
    });
  }

  // Generic SQL transaction
  await db.query('BEGIN');
  try {
    const result = await callback(db);
    await db.query('COMMIT');
    return result;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}
