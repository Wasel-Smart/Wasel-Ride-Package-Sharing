/**
 * Server-only Supabase admin client.
 *
 * Use this helper only from secure Node/server contexts. Never import it into
 * browser code, React components, or anything bundled by Vite for the client.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getEnv } from '../env';

function getRequiredEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = getEnv(key).trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${keys.join(', ')}`);
}

function assertServerOnly(): void {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client must never run in the browser.');
  }
}

export function createAdminClient() {
  assertServerOnly();

  const supabaseUrl = getRequiredEnv(
    'VITE_STORADGE_SUPABASE_URL',
    'NEXT_PUBLIC_STORADGE_SUPABASE_URL',
    'VITE_SUPABASE_URL',
  );

  const secretKey = getRequiredEnv(
    'STORADGE_SUPABASE_SECRET_KEY',
    'SUPABASE_SECRET_KEY',
    'STORADGE_SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  );

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'wasel-admin' },
    },
    db: { schema: 'public' },
  });
}
