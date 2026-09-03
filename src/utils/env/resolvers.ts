import { getEdgeFunctionName } from '../edgeFunctionConfig';

export interface RuntimeConfigIssue {
  key: string;
  message: string;
  severity: 'warning' | 'error';
}

export type EnvSource = Record<string, string | undefined>;
export type AuthCallbackParams = Record<string, string | null | undefined>;

export const DEFAULT_AUTH_RETURN_TO = '/app/find-ride';

export function readEnvSource(): EnvSource {
  const importMetaEnv =
    typeof import.meta !== 'undefined' && typeof import.meta.env === 'object'
      ? (import.meta.env as EnvSource)
      : {};

  const processEnv =
    typeof process !== 'undefined' && typeof process.env === 'object'
      ? (process.env as EnvSource)
      : {};

  return { ...processEnv, ...importMetaEnv };
}

export function isTruthy(value: string | undefined): boolean {
  return typeof value === 'string' && value.toLowerCase() === 'true';
}

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
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

export function trimConfiguredValue(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getFirstConfiguredValue(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = trimConfiguredValue(candidate);
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

function getBrowserOrigin(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const origin = window.location?.origin ?? '';
  return isAbsoluteHttpUrl(origin) ? origin : '';
}

function isLocalHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveAppUrl(envSource: EnvSource = readEnvSource()): string {
  const configuredAppUrl = getFirstConfiguredValue(
    envSource.VITE_APP_URL,
    envSource.VITE_PRODUCTION_APP_URL, // Keep for backward compatibility, but VITE_APP_URL is preferred
  );
  const browserOrigin = getBrowserOrigin();

  if (!browserOrigin) {
    return configuredAppUrl;
  }

  if (!configuredAppUrl || !isAbsoluteHttpUrl(configuredAppUrl)) {
    return browserOrigin;
  }

  if (isLocalHttpUrl(configuredAppUrl) && !isLocalHttpUrl(browserOrigin)) {
    return browserOrigin;
  }

  if (configuredAppUrl.startsWith('http://') && browserOrigin.startsWith('https://')) {
    return browserOrigin;
  }

  return configuredAppUrl;
}

export function resolveSupabaseUrl(envSource: EnvSource = readEnvSource()): string {
  return getFirstConfiguredValue(
    envSource.VITE_SUPABASE_URL,
    envSource.VITE_SUPABASE_PROJECT_URL,
    envSource.VITE_PUBLIC_SUPABASE_URL,
  );
}

export function resolveSupabasePublicKey(envSource: EnvSource = readEnvSource()): string {
  return getFirstConfiguredValue(
    envSource.VITE_SUPABASE_PUBLISHABLE_KEY,
    envSource.VITE_SUPABASE_ANON_KEY,
    envSource.VITE_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function resolveEdgeFunctionName(envSource: EnvSource = readEnvSource()): string {
  return getFirstConfiguredValue(envSource.VITE_EDGE_FUNCTION_NAME) || getEdgeFunctionName();
}

export function resolveFunctionsBaseUrl(envSource: EnvSource = readEnvSource()): string {
  const configuredBaseUrl = getFirstConfiguredValue(envSource.VITE_EDGE_FUNCTIONS_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const supabaseUrl = resolveSupabaseUrl(envSource);
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '';
}

export function resolveApiUrl(envSource: EnvSource = readEnvSource()): string {
  const configuredApiUrl = getFirstConfiguredValue(envSource.VITE_API_URL);
  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  const functionsBaseUrl = resolveFunctionsBaseUrl(envSource);
  if (!functionsBaseUrl) {
    return '';
  }

  return `${functionsBaseUrl}/${resolveEdgeFunctionName(envSource)}`;
}

export function getSupabaseProjectRefFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/\.supabase\.co$/, '');
  } catch {
    return null;
  }
}

export function getSupabaseProjectRefFromJwt(value: string | undefined): string | null {
  if (!value) {return null;}

  const parts = value.split('.');
  if (parts.length < 2) {return null;}

  const decoded = decodeBase64Url(parts[1] ?? '');
  if (!decoded) {return null;}

  try {
    const payload = JSON.parse(decoded) as { ref?: string };
    return typeof payload.ref === 'string' && payload.ref.length > 0 ? payload.ref : null;
  } catch {
    return null;
  }
}
