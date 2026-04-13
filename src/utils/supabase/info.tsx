/**
 * Public Supabase credentials.
 *
 * We still prefer deploy-time env vars, but we keep the current public project
 * config as a safe fallback so static production builds do not ship with the
 * placeholder values from `.env.example`.
 */

const DEFAULT_SUPABASE_URL = 'https://djccmatubyyudeosrngm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Iy-jArsso0ehGKQ83kuiDg_1T-cl9zE';

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
  return !PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function pickConfiguredValue(...candidates: Array<string | undefined>): string {
  return candidates.find(isConfiguredValue) ?? '';
}

export const publicSupabaseUrl = pickConfiguredValue(
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
  import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined,
  import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined,
  DEFAULT_SUPABASE_URL,
);

export const publicAnonKey = pickConfiguredValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
  DEFAULT_SUPABASE_ANON_KEY,
);

export const projectId: string = publicSupabaseUrl
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .replace(/\.supabase\.co$/, '');

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
