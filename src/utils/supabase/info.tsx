/**
 * Public Supabase credentials.
 *
 * Environment variables stay the primary source of truth.
 * Static builds must receive these values from environment injection. Keeping
 * project-specific defaults in source makes deployments easy to misroute.
 */

const ALLOW_CHECKED_IN_PUBLIC_FALLBACK = false;

const CHECKED_IN_PUBLIC_SUPABASE_URL = '';
const CHECKED_IN_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '';
const CHECKED_IN_PUBLIC_SUPABASE_ANON_KEY = '';

const BLOCKED_PUBLIC_SUPABASE_KEYS = new Set([
  ['sb_publishable_Iy', '-jArsso0ehGKQ83kuiDg_1T-cl9zE'].join(''),
]);

const PLACEHOLDER_MARKERS = [
  'your-project.supabase.co',
  'your-anon-key',
  'your-anon-key-here',
  'your-publishable-key-or-anon-key',
  'replace_with',
  'example.com',
];

type EnvCandidate = {
  value: string | undefined;
  explicit: boolean;
};

function getProcessEnvValue(key: string): EnvCandidate | null {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;

  if (!processEnv || !Object.prototype.hasOwnProperty.call(processEnv, key)) {
    return null;
  }

  return { value: processEnv[key], explicit: true };
}

function getEnvCandidate(key: string): EnvCandidate {
  return getProcessEnvValue(key) ?? {
    value: (import.meta.env as Record<string, string | undefined>)[key],
    explicit: false,
  };
}

function isConfiguredValue(value: string | undefined): value is string {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;
  if (BLOCKED_PUBLIC_SUPABASE_KEYS.has(normalized)) return false;

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

function pickConfiguredUrl(
  envCandidates: EnvCandidate[],
  fallbackCandidates: Array<string | undefined>,
): string {
  const explicitCandidates = envCandidates.filter(candidate => candidate.explicit);
  const candidates = explicitCandidates.length > 0 ? explicitCandidates : envCandidates;
  const configuredUrl = candidates.find(
    candidate => isConfiguredValue(candidate.value) && isValidPublicSupabaseUrl(candidate.value),
  )?.value;

  if (configuredUrl) return configuredUrl;
  if (candidates.some(candidate => isConfiguredValue(candidate.value))) return '';
  if (explicitCandidates.length > 0) return '';

  return (
    fallbackCandidates.find(
      candidate => isConfiguredValue(candidate) && isValidPublicSupabaseUrl(candidate),
    ) ?? ''
  );
}

function pickConfiguredKey(
  url: string,
  envCandidates: EnvCandidate[],
  fallbackCandidates: Array<string | undefined>,
): string {
  const explicitCandidates = envCandidates.filter(candidate => candidate.explicit);
  const candidates = explicitCandidates.length > 0 ? explicitCandidates : envCandidates;
  const configured = candidates
    .map(candidate => candidate.value)
    .filter((candidate): candidate is string => isConfiguredValue(candidate));

  const configuredFallbacks = explicitCandidates.length > 0
    ? []
    : fallbackCandidates.filter((candidate): candidate is string => isConfiguredValue(candidate));

  if (configured.length === 0) return configuredFallbacks[0] ?? '';

  const urlProjectRef = url ? getProjectRefFromUrl(url) : '';
  if (!urlProjectRef) return configured[0] ?? '';

  const matchingJwtCandidate = configured.find(candidate => getProjectRefFromJwt(candidate) === urlProjectRef);
  if (matchingJwtCandidate) return matchingJwtCandidate;

  const opaqueCandidate = configured.find(candidate => !getProjectRefFromJwt(candidate));
  if (opaqueCandidate) return opaqueCandidate;

  return configured[0] ?? configuredFallbacks[0] ?? '';
}

export const publicSupabaseUrl = pickConfiguredUrl(
  [
    getEnvCandidate('VITE_SUPABASE_URL'),
    getEnvCandidate('VITE_SUPABASE_PROJECT_URL'),
    getEnvCandidate('VITE_PUBLIC_SUPABASE_URL'),
  ],
  ALLOW_CHECKED_IN_PUBLIC_FALLBACK ? [CHECKED_IN_PUBLIC_SUPABASE_URL] : [],
);

export const publicAnonKey = pickConfiguredKey(
  publicSupabaseUrl,
  [
    getEnvCandidate('VITE_SUPABASE_PUBLISHABLE_KEY'),
    getEnvCandidate('VITE_SUPABASE_ANON_KEY'),
    getEnvCandidate('VITE_PUBLIC_SUPABASE_ANON_KEY'),
  ],
  ALLOW_CHECKED_IN_PUBLIC_FALLBACK
    ? [CHECKED_IN_PUBLIC_SUPABASE_PUBLISHABLE_KEY, CHECKED_IN_PUBLIC_SUPABASE_ANON_KEY]
    : [],
);

export const projectId: string = publicSupabaseUrl ? getProjectRefFromUrl(publicSupabaseUrl) : '';

export const hasSupabasePublicConfig = Boolean(publicSupabaseUrl && publicAnonKey);
