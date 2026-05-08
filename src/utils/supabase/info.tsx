/**
 * Public Supabase credentials.
 *
 * Environment variables stay the primary source of truth.
 * We also keep a checked-in public fallback so static builds still boot when
 * Vite env injection is unavailable. These values are public by design and are
 * limited by Supabase RLS plus the app's backend fallback policy.
 */

const FORCE_LOCAL_E2E_AUTH = (import.meta.env.VITE_E2E_LOCAL_AUTH as string | undefined) === 'true';
const ALLOW_CHECKED_IN_PUBLIC_FALLBACK = !FORCE_LOCAL_E2E_AUTH;

const CHECKED_IN_PUBLIC_SUPABASE_URL = 'https://zexlxabdcsjefptmjhuq.supabase.co';
const CHECKED_IN_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_t2cOnKt1HH-l2KmvJIAwcg_8fpCWdN0';
const CHECKED_IN_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0';

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

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return atob(`${normalized}${padding}`);
  } catch {
    return null;
  }
}

function getProjectRefFromJwt(value: string | undefined): string | null {
  if (!isConfiguredValue(value)) return null;

  const parts = value.split('.');
  if (parts.length < 2) return null;

  const decoded = decodeBase64Url(parts[1] ?? '');
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded) as { ref?: string };
    return typeof payload.ref === 'string' && payload.ref.length > 0 ? payload.ref : null;
  } catch {
    return null;
  }
}

function getProjectRefFromUrl(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\.supabase\.co$/, '');
}

function pickConfiguredUrl(...candidates: Array<string | undefined>): string {
  return (
    candidates.find(
      candidate => isConfiguredValue(candidate) && isValidPublicSupabaseUrl(candidate),
    ) ?? ''
  );
}

function pickConfiguredKey(url: string, ...candidates: Array<string | undefined>): string {
  const configured = candidates.filter((candidate): candidate is string => isConfiguredValue(candidate));
  if (configured.length === 0) return '';

  const urlProjectRef = url ? getProjectRefFromUrl(url) : '';
  if (!urlProjectRef) return configured[0] ?? '';

  const matchingJwtCandidate = configured.find(candidate => getProjectRefFromJwt(candidate) === urlProjectRef);
  if (matchingJwtCandidate) return matchingJwtCandidate;

  const opaqueCandidate = configured.find(candidate => !getProjectRefFromJwt(candidate));
  if (opaqueCandidate) return opaqueCandidate;

  return configured[0] ?? '';
}

export const publicSupabaseUrl = pickConfiguredUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
  import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined,
  import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined,
  ...(ALLOW_CHECKED_IN_PUBLIC_FALLBACK ? [CHECKED_IN_PUBLIC_SUPABASE_URL] : []),
);

export const publicAnonKey = pickConfiguredKey(
  publicSupabaseUrl,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
  ...(ALLOW_CHECKED_IN_PUBLIC_FALLBACK
    ? [CHECKED_IN_PUBLIC_SUPABASE_PUBLISHABLE_KEY, CHECKED_IN_PUBLIC_SUPABASE_ANON_KEY]
    : []),
);

export const projectId: string = publicSupabaseUrl ? getProjectRefFromUrl(publicSupabaseUrl) : '';

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
