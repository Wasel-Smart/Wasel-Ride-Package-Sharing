/**
 * Public Supabase credentials.
 *
 * All credentials must be supplied via environment variables.
 * No hardcoded fallback values — missing config will surface clearly at runtime.
 */

const FORCE_LOCAL_E2E_AUTH = (import.meta.env.VITE_E2E_LOCAL_AUTH as string | undefined) === 'true';

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
  return !PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
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
  return candidates.find((candidate) => isConfiguredValue(candidate) && isValidPublicSupabaseUrl(candidate)) ?? '';
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
      ]),
);

export const publicAnonKey = pickConfiguredKey(
  ...(FORCE_LOCAL_E2E_AUTH
    ? []
    : [
        import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
        import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
      ]),
);

export const projectId: string = publicSupabaseUrl
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .replace(/\.supabase\.co$/, '');

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
