import {
  publicAnonKey as resolvedPublicSupabaseKey,
  publicSupabaseUrl as resolvedPublicSupabaseUrl,
} from './supabase/info';
import { getEdgeFunctionName } from './edgeFunctionConfig';

type EnvSource = Record<string, string | undefined>;
type AuthCallbackParams = Record<string, string | null | undefined>;

export const DEFAULT_AUTH_RETURN_TO = '/app/find-ride';

export interface RuntimeConfigIssue {
  key: string;
  message: string;
  severity: 'warning' | 'error';
}

function readProcessEnvSource(): EnvSource {
  const processEnv =
    typeof globalThis === 'object'
      ? (
          globalThis as {
            process?: { env?: EnvSource };
          }
        ).process?.env
      : undefined;

  return processEnv && typeof processEnv === 'object' ? processEnv : {};
}

function readEnvSource(): EnvSource {
  const importMetaEnv =
    typeof import.meta !== 'undefined' && typeof import.meta.env === 'object'
      ? (import.meta.env as EnvSource)
      : {};

  return { ...readProcessEnvSource(), ...importMetaEnv };
}

function isTruthy(value: string | undefined): boolean {
  return typeof value === 'string' && value.toLowerCase() === 'true';
}

function isAbsoluteHttpUrl(value: string): boolean {
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

function trimConfiguredValue(value: string | undefined): string {
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

function resolveAppUrl(envSource: EnvSource = readEnvSource()): string {
  const configuredAppUrl = getFirstConfiguredValue(
    envSource.VITE_APP_URL,
    envSource.VITE_PRODUCTION_APP_URL,
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

function resolveSupabaseUrl(envSource: EnvSource = readEnvSource()): string {
  return getFirstConfiguredValue(
    envSource.VITE_SUPABASE_URL,
    envSource.NEXT_PUBLIC_STORADGE_SUPABASE_URL,
    envSource.VITE_SUPABASE_PROJECT_URL,
    envSource.VITE_PUBLIC_SUPABASE_URL,
    resolvedPublicSupabaseUrl,
  );
}

function resolveSupabasePublicKey(envSource: EnvSource = readEnvSource()): string {
  return getFirstConfiguredValue(
    envSource.VITE_SUPABASE_PUBLISHABLE_KEY,
    envSource.NEXT_PUBLIC_STORADGE_SUPABASE_PUBLISHABLE_KEY,
    envSource.VITE_SUPABASE_ANON_KEY,
    envSource.VITE_PUBLIC_SUPABASE_ANON_KEY,
    resolvedPublicSupabaseKey,
  );
}

function resolveEdgeFunctionName(envSource: EnvSource = readEnvSource()): string {
  return getFirstConfiguredValue(envSource.VITE_EDGE_FUNCTION_NAME) || getEdgeFunctionName();
}

function resolveFunctionsBaseUrl(envSource: EnvSource = readEnvSource()): string {
  const configuredBaseUrl = getFirstConfiguredValue(envSource.VITE_EDGE_FUNCTIONS_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const supabaseUrl = resolveSupabaseUrl(envSource);
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '';
}

function resolveApiUrl(envSource: EnvSource = readEnvSource()): string {
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

function getSupabaseProjectRefFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/\.supabase\.co$/, '');
  } catch {
    return null;
  }
}

function getSupabaseProjectRefFromJwt(value: string | undefined): string | null {
  if (!value) return null;

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

export function getEnv(key: string, fallback = ''): string {
  const value = readEnvSource()[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function hasEnv(key: string): boolean {
  return getEnv(key).length > 0;
}

function getBooleanEnv(key: string, fallback: boolean): boolean {
  const value = getEnv(key);
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export function getRuntimeConfigIssues(
  envSource: EnvSource = readEnvSource(),
): RuntimeConfigIssue[] {
  const issues: RuntimeConfigIssue[] = [];
  const apiUrl = resolveApiUrl(envSource);
  const supabaseUrl = resolveSupabaseUrl(envSource);
  const supabasePublicKey = resolveSupabasePublicKey(envSource);
  const appUrl = resolveAppUrl(envSource);
  const sentryDsn = trimConfiguredValue(envSource.VITE_SENTRY_DSN);
  const mode = envSource.MODE || envSource.VITE_MODE || envSource.NODE_ENV || 'development';
  const isProd = mode === 'production';
  const isBuildTime = typeof window === 'undefined';
  const hasApiTransport = Boolean(apiUrl) || (Boolean(supabaseUrl) && Boolean(supabasePublicKey));

  if (!appUrl) {
    issues.push({
      key: 'VITE_APP_URL',
      message: 'VITE_APP_URL should be set so auth callbacks and support links resolve correctly.',
      severity: isBuildTime ? 'warning' : 'error',
    });
  } else if (!isAbsoluteHttpUrl(appUrl)) {
    issues.push({
      key: 'VITE_APP_URL',
      message: 'VITE_APP_URL must be an absolute http(s) URL.',
      severity: isBuildTime ? 'warning' : 'error',
    });
  } else if (isProd && !isBuildTime && !appUrl.startsWith('https://')) {
    issues.push({
      key: 'VITE_APP_URL',
      message: 'Protected environments must use an HTTPS VITE_APP_URL',
      severity: 'error',
    });
  }

  if (!supabaseUrl) {
    issues.push({
      key: 'VITE_SUPABASE_URL',
      message: 'VITE_SUPABASE_URL is not configured',
      severity: 'error',
    });
  }

  if (!supabasePublicKey) {
    issues.push({
      key: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      message: 'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is not configured',
      severity: 'error',
    });
  }

  if (!hasApiTransport) {
    issues.push({
      key: 'VITE_API_URL',
      message: 'Protected environments must define VITE_API_URL or VITE_EDGE_FUNCTION_NAME',
      severity: 'error',
    });
  }

  if (apiUrl && !isAbsoluteHttpUrl(apiUrl)) {
    issues.push({
      key: 'VITE_API_URL',
      message: 'VITE_API_URL must be an absolute http(s) URL when provided.',
      severity: 'error',
    });
  }

  if (supabaseUrl && !isAbsoluteHttpUrl(supabaseUrl)) {
    issues.push({
      key: 'VITE_SUPABASE_URL',
      message: 'VITE_SUPABASE_URL must be an absolute http(s) URL when provided.',
      severity: 'error',
    });
  } else if (isProd && !isBuildTime && supabaseUrl && !supabaseUrl.startsWith('https://')) {
    issues.push({
      key: 'VITE_SUPABASE_URL',
      message: 'Protected environments must use an HTTPS Supabase URL',
      severity: 'error',
    });
  }

  const supabaseUrlProjectRef = supabaseUrl ? getSupabaseProjectRefFromUrl(supabaseUrl) : null;
  const publicKeyProjectRef = getSupabaseProjectRefFromJwt(supabasePublicKey);
  if (
    supabaseUrlProjectRef &&
    publicKeyProjectRef &&
    supabaseUrlProjectRef !== publicKeyProjectRef
  ) {
    issues.push({
      key: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      message: `Configured Supabase public key belongs to project ${publicKeyProjectRef}, but VITE_SUPABASE_URL points to ${supabaseUrlProjectRef}.`,
      severity: 'error',
    });
  }

  if (isProd && isTruthy(envSource.VITE_ALLOW_DIRECT_SUPABASE_FALLBACK)) {
    issues.push({
      key: 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK',
      message: 'Production should fail closed. Disable direct Supabase fallback before shipping.',
      severity: 'error',
    });
  }

  if (isProd && !sentryDsn) {
    issues.push({
      key: 'VITE_SENTRY_DSN',
      message: 'Production should set VITE_SENTRY_DSN so failures are traceable.',
      severity: 'warning',
    });
  }

  if (
    isTruthy(envSource.VITE_ENABLE_EMAIL_NOTIFICATIONS) &&
    !envSource.VITE_SUPPORT_EMAIL?.trim()
  ) {
    issues.push({
      key: 'VITE_SUPPORT_EMAIL',
      message: 'Email notifications are enabled but no support email is configured.',
      severity: 'warning',
    });
  }

  if (
    isTruthy(envSource.VITE_ENABLE_SMS_NOTIFICATIONS) &&
    !envSource.VITE_SUPPORT_SMS_NUMBER?.trim()
  ) {
    issues.push({
      key: 'VITE_SUPPORT_SMS_NUMBER',
      message: 'SMS notifications are enabled but no support SMS number is configured.',
      severity: 'warning',
    });
  }

  if (
    isTruthy(envSource.VITE_ENABLE_WHATSAPP_NOTIFICATIONS) &&
    !envSource.VITE_SUPPORT_WHATSAPP_NUMBER?.trim()
  ) {
    issues.push({
      key: 'VITE_SUPPORT_WHATSAPP_NUMBER',
      message: 'WhatsApp notifications are enabled but no support WhatsApp number is configured.',
      severity: 'warning',
    });
  }

  if (isTruthy(envSource.VITE_ENABLE_TWO_FACTOR_AUTH) && !hasApiTransport) {
    issues.push({
      key: 'VITE_ENABLE_TWO_FACTOR_AUTH',
      message:
        'Two-factor auth requires a backend transport. Configure the API path before enabling it.',
      severity: 'error',
    });
  }

  return issues;
}

export function validateRuntimeConfiguration(envSource: EnvSource = readEnvSource()) {
  const issues = getRuntimeConfigIssues(envSource);
  return {
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  };
}

export function getConfig() {
  const appUrl = resolveAppUrl() || getEnv('VITE_PRODUCTION_APP_URL') || 'http://localhost:3000';
  const supportWhatsAppNumber = getEnv('VITE_SUPPORT_WHATSAPP_NUMBER')
    .replace(/[^\d+]/g, '')
    .trim();
  const supportEmail = getEnv('VITE_SUPPORT_EMAIL', 'support@wasel.jo').trim();
  const supportPhoneNumber = getEnv('VITE_SUPPORT_PHONE_NUMBER')
    .replace(/[^\d+]/g, '')
    .trim();
  const supportSmsNumber = getEnv('VITE_SUPPORT_SMS_NUMBER', supportPhoneNumber)
    .replace(/[^\d+]/g, '')
    .trim();
  const authCallbackPath = getEnv('VITE_AUTH_CALLBACK_PATH', '/app/auth/callback');
  const mode = getEnv('MODE') || getEnv('VITE_MODE') || getEnv('NODE_ENV', 'development');
  const isProd = mode === 'production';
  const enableDemoAccount = getBooleanEnv('VITE_ENABLE_DEMO_DATA', false);
  const enableTwoFactorAuth = getBooleanEnv('VITE_ENABLE_TWO_FACTOR_AUTH', false);
  const enableEmailNotifications = getBooleanEnv('VITE_ENABLE_EMAIL_NOTIFICATIONS', true);
  const enableSmsNotifications = getBooleanEnv('VITE_ENABLE_SMS_NOTIFICATIONS', true);
  const enableWhatsAppNotifications = getBooleanEnv('VITE_ENABLE_WHATSAPP_NOTIFICATIONS', true);
  const allowDirectSupabaseFallback =
    !isProd && getBooleanEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', true);

  return {
    appName: getEnv('VITE_APP_NAME', 'Wasel'),
    appUrl,
    allowedApiDomain: getEnv('VITE_ALLOWED_API_DOMAIN', 'wasel14.online').trim(),
    supportWhatsAppNumber,
    supportEmail,
    supportPhoneNumber,
    supportSmsNumber,
    authCallbackPath: authCallbackPath.startsWith('/') ? authCallbackPath : `/${authCallbackPath}`,
    enableDemoAccount,
    enableTwoFactorAuth,
    enableEmailNotifications,
    enableSmsNotifications,
    enableWhatsAppNotifications,
    allowDirectSupabaseFallback,
    isProd,
    isDev: !isProd,
  };
}

export function normalizeReturnToPath(
  returnTo: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  if (!returnTo) {
    return fallback;
  }

  return returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : fallback;
}

export function getAuthCallbackUrl(origin?: string, params?: AuthCallbackParams): string {
  const { appUrl, authCallbackPath } = getConfig();
  const base = (origin || appUrl || 'http://localhost:3000').replace(/\/$/, '');
  const url = new URL(`${base}${authCallbackPath}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (typeof value !== 'string' || value.length === 0) {
      return;
    }

    url.searchParams.set(key, key === 'returnTo' ? normalizeReturnToPath(value) : value);
  });

  return url.toString();
}

export function getWhatsAppSupportUrl(message = 'Hi Wasel'): string {
  const { supportWhatsAppNumber, enableWhatsAppNotifications } = getConfig();
  if (!supportWhatsAppNumber || !enableWhatsAppNotifications) {
    return '';
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${supportWhatsAppNumber.replace(/^\+/, '')}?text=${encodedMessage}`;
}

export function getSupportEmailUrl(subject = 'Wasel Support', body = ''): string {
  const { supportEmail, enableEmailNotifications } = getConfig();
  if (!supportEmail || !enableEmailNotifications) {
    return '';
  }

  const search = new URLSearchParams();
  if (subject) search.set('subject', subject);
  if (body) search.set('body', body);
  const suffix = search.toString();
  return `mailto:${supportEmail}${suffix ? `?${suffix}` : ''}`;
}

export function getSmsSupportUrl(message = 'Hi Wasel'): string {
  const { supportSmsNumber, enableSmsNotifications } = getConfig();
  if (!supportSmsNumber || !enableSmsNotifications) {
    return '';
  }
  return `sms:${supportSmsNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
}

export function getSupportPhoneUrl(): string {
  const { supportPhoneNumber } = getConfig();
  if (!supportPhoneNumber) {
    return '';
  }
  return `tel:${supportPhoneNumber}`;
}
