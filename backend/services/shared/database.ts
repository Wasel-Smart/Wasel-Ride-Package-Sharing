/**
 * Database Client
 * PostgreSQL + PostGIS connection with pooling
 */

import { Pool, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseClient {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    this.pool.on('error', (err) => {
      console.error('[Database] Unexpected pool error:', err);
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log('[Database] Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('[Database] Query error:', { text: text.substring(0, 100), error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      console.error('[Database] Health check failed:', error);
      return false;
    }
  }
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wasel';

export const db = new DatabaseClient({ connectionString });

export async function findOne<T>(query: string, params?: any[]): Promise<T | null> {
  const result = await db.query<T>(query, params);
  return result.rows[0] || null;
}

export async function findMany<T>(query: string, params?: any[]): Promise<T[]> {
  const result = await db.query<T>(query, params);
  return result.rows;
}

export async function insertOne<T>(table: string, data: Record<string, any>): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await db.query<T>(query, values);
  return result.rows[0];
}

export async function updateOne<T>(
  table: string,
  id: string | number,
  data: Record<string, any>,
): Promise<T | null> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  
  const query = `
    UPDATE ${table}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${keys.length + 1}
    RETURNING *
  `;
  
  const result = await db.query<T>(query, [...values, id]);
  return result.rows[0] || null;
}
