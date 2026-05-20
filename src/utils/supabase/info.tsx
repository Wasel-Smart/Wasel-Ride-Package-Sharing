/**
 * Public Supabase credentials.
 *
 * Browser-safe project configuration must come from environment variables.
 * The repository intentionally does not ship any checked-in runtime fallback.
 */

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

function hasExplicitValue(candidates: Array<string | undefined>): boolean {
  return candidates.some(candidate => typeof candidate === 'string' && candidate.trim().length > 0);
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
  return value
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\.supabase\.co$/, '');
}

function pickConfiguredUrl(
  explicitCandidates: Array<string | undefined>,
  fallbackCandidate?: string,
): string {
  const configuredExplicit = explicitCandidates.find(
    candidate => isConfiguredValue(candidate) && isValidPublicSupabaseUrl(candidate),
  );

  if (configuredExplicit) {
    return configuredExplicit;
  }

  if (hasExplicitValue(explicitCandidates)) {
    return '';
  }

  return isConfiguredValue(fallbackCandidate) && isValidPublicSupabaseUrl(fallbackCandidate)
    ? fallbackCandidate
    : '';
}

function pickMatchingKey(url: string, candidates: string[]): string {
  if (candidates.length === 0) return '';

  const urlProjectRef = url ? getProjectRefFromUrl(url) : '';
  if (!urlProjectRef) return candidates[0] ?? '';

  const matchingJwtCandidate = candidates.find(
    candidate => getProjectRefFromJwt(candidate) === urlProjectRef,
  );
  if (matchingJwtCandidate) return matchingJwtCandidate;

  const opaqueCandidate = candidates.find(candidate => !getProjectRefFromJwt(candidate));
  if (opaqueCandidate) return opaqueCandidate;

  return candidates[0] ?? '';
}

function pickConfiguredKey(
  url: string,
  explicitCandidates: Array<string | undefined>,
  fallbackCandidates: Array<string | undefined>,
): string {
  const configured = explicitCandidates.filter((candidate): candidate is string =>
    isConfiguredValue(candidate),
  );
  if (configured.length > 0) {
    return pickMatchingKey(url, configured);
  }

  if (hasExplicitValue(explicitCandidates)) {
    return '';
  }

  const configuredFallback = fallbackCandidates.filter((candidate): candidate is string =>
    isConfiguredValue(candidate),
  );
  return pickMatchingKey(url, configuredFallback);
}

const explicitUrlCandidates = [
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
  import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined,
  import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined,
];

const explicitKeyCandidates = [
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
];

export const publicSupabaseUrl = pickConfiguredUrl(
  explicitUrlCandidates,
  undefined,
);

export const publicAnonKey = pickConfiguredKey(
  publicSupabaseUrl,
  explicitKeyCandidates,
  [],
);

export const projectId: string = publicSupabaseUrl ? getProjectRefFromUrl(publicSupabaseUrl) : '';

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
