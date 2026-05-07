/**
 * Public Supabase credentials.
 *
 * Environment variables stay the primary source of truth.
 * In development we also keep a checked-in public fallback so a long-running
 * dev server does not strand the auth screen if it was started before the
 * Supabase env vars were loaded.
 */

const FORCE_LOCAL_E2E_AUTH = (import.meta.env.VITE_E2E_LOCAL_AUTH as string | undefined) === 'true';
const ALLOW_CHECKED_IN_PUBLIC_FALLBACK =
  !FORCE_LOCAL_E2E_AUTH && (import.meta.env.MODE as string | undefined) === 'development';

const CHECKED_IN_PUBLIC_SUPABASE_URL = 'https://djccmatubyyudeosrngm.supabase.co';
const CHECKED_IN_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2NtYXR1Ynl5dWRlb3NybmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNjY5MjUsImV4cCI6MjA3NzQyNjkyNX0.WlYJmK-OUKlNyp3ktcb2ShILFN1vgCumAL4tOATziTQ';

const PLACEHOLDER_MARKERS = [
  'your-project.supabase.co',
  'your-anon-key',
  'your-anon-key-here',
  'your-publishable-key-or-anon-key',
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

function isValidPublicSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.hostname.endsWith('.supabase.co')
    );
  } catch {
    return false;
  }
}

function pickConfiguredUrl(...candidates: Array<string | undefined>): string {
  return (
    candidates.find(
      candidate => isConfiguredValue(candidate) && isValidPublicSupabaseUrl(candidate),
    ) ?? ''
  );
}

function pickConfiguredKey(...candidates: Array<string | undefined>): string {
  return candidates.find(isConfiguredValue) ?? '';
}

export const publicSupabaseUrl = pickConfiguredUrl(
  ...(FORCE_LOCAL_E2E_AUTH
    ? []
    : [
        import.meta.env.VITE_SUPABASE_URL as string | undefined,
        import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined,
        import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined,
        ...(ALLOW_CHECKED_IN_PUBLIC_FALLBACK ? [CHECKED_IN_PUBLIC_SUPABASE_URL] : []),
      ]),
);

export const publicAnonKey = pickConfiguredKey(
  ...(FORCE_LOCAL_E2E_AUTH
    ? []
    : [
        import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
        import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
        ...(ALLOW_CHECKED_IN_PUBLIC_FALLBACK ? [CHECKED_IN_PUBLIC_SUPABASE_ANON_KEY] : []),
      ]),
);

export const projectId: string = publicSupabaseUrl
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .replace(/\.supabase\.co$/, '');

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
