import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export { sql };

export interface QueryConfig {
  text: string;
  values?: any[];
}

export async function query<T>(config: QueryConfig): Promise<T[]> {
  try {
    const result = await sql.unsafe(config.text, config.values || []);
    return result as T[];
  } catch (error) {
    console.error('[Database] Query error:', error);
    throw error;
  }
}

export async function transaction<T>(callback: (tx: typeof sql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => callback(tx));
}
