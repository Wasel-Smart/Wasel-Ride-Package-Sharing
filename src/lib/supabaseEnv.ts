const SUPABASE_URL_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL'] as const;
const SUPABASE_PUBLISHABLE_KEY_KEYS = [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
] as const;

function readRequiredEnv(keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required Supabase environment variable. Checked: ${keys.join(', ')}`);
}

export function getSupabasePublicEnv() {
  return {
    url: readRequiredEnv(SUPABASE_URL_KEYS),
    publishableKey: readRequiredEnv(SUPABASE_PUBLISHABLE_KEY_KEYS),
  };
}
