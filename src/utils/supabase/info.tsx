import { getEnv } from '../env';

const PLACEHOLDER_MARKERS = [
  'your-project.supabase.co',
  'your-anon-key-here',
  'your-publishable-key',
  'your_publishable_key',
  'your-supabase-url',
  'your_supabase_url',
  'replace_with',
  'example.com',
];

function isConfiguredValue(value: string | undefined): value is string {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  return !PLACEHOLDER_MARKERS.some(marker => lower.includes(marker));
}

function pickConfiguredValue(...candidates: Array<string | undefined>): string {
  return candidates.find(isConfiguredValue) ?? '';
}

export const publicSupabaseUrl = pickConfiguredValue(
  getEnv('VITE_SUPABASE_URL') || undefined,
  getEnv('VITE_SUPABASE_PROJECT_URL') || undefined,
  getEnv('VITE_PUBLIC_SUPABASE_URL') || undefined,
);

export const publicAnonKey = pickConfiguredValue(
  getEnv('VITE_SUPABASE_ANON_KEY') || undefined,
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || undefined,
  getEnv('VITE_PUBLIC_SUPABASE_ANON_KEY') || undefined,
);

export const projectId: string = publicSupabaseUrl
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .replace(/\.supabase\.co$/, '');

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
