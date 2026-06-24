import postgres, { type Sql } from 'postgres';
import { config } from './config';

let dbInstance: Sql | null = null;

export function getDb(): Sql {
  if (!dbInstance) {
    dbInstance = postgres(config.database.url, {
      max: config.database.maxConnections,
      idle_timeout: config.database.idleTimeoutSeconds * 1000,
      connect_timeout: config.database.connectionTimeoutSeconds * 1000,
    });
  }
  return dbInstance;
}

export async function disconnectDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.end();
    dbInstance = null;
  }
}
