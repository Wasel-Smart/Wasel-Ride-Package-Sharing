import {
  type EnvSource,
  type RuntimeConfigIssue,
  getSupabaseProjectRefFromJwt,
  getSupabaseProjectRefFromUrl,
  isAbsoluteHttpUrl,
  isTruthy,
  readEnvSource,
  resolveApiUrl,
  resolveAppUrl,
  resolveSupabasePublicKey,
  resolveSupabaseUrl,
  trimConfiguredValue,
} from './resolvers';
import { validateObservabilityConfig } from '../observability-config';

const issue = (
  key: string,
  message: string,
  severity: RuntimeConfigIssue['severity'],
): RuntimeConfigIssue => ({ key, message, severity });

function appUrlIssues(appUrl: string | undefined, isProd: boolean, isBuildTime: boolean) {
  if (!appUrl) {
    return [issue(
      'VITE_APP_URL',
      'VITE_APP_URL should be set so auth callbacks and support links resolve correctly.',
      isBuildTime ? 'warning' : 'error',
    )];
  }
  if (!isAbsoluteHttpUrl(appUrl)) {
    return [issue(
      'VITE_APP_URL',
      'VITE_APP_URL must be an absolute http(s) URL.',
      isBuildTime ? 'warning' : 'error',
    )];
  }
  if (isProd && !isBuildTime && !appUrl.startsWith('https://')) {
    return [issue('VITE_APP_URL', 'Protected environments must use an HTTPS VITE_APP_URL', 'error')];
  }
  return [];
}

function requiredSupabaseIssues(supabaseUrl: string | undefined, publicKey: string | undefined) {
  const issues: RuntimeConfigIssue[] = [];
  if (!supabaseUrl) {
    issues.push(issue('VITE_SUPABASE_URL', 'VITE_SUPABASE_URL is not configured', 'error'));
  }
  if (!publicKey) {
    issues.push(issue(
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is not configured',
      'error',
    ));
  }
  return issues;
}

function apiIssues(apiUrl: string | undefined, hasApiTransport: boolean) {
  const issues: RuntimeConfigIssue[] = [];
  if (!hasApiTransport) {
    issues.push(issue(
      'VITE_API_URL',
      'Protected environments must define VITE_API_URL or VITE_EDGE_FUNCTION_NAME',
      'error',
    ));
  }
  if (apiUrl && !isAbsoluteHttpUrl(apiUrl)) {
    issues.push(issue('VITE_API_URL', 'VITE_API_URL must be an absolute http(s) URL when provided.', 'error'));
  }
  return issues;
}

function supabaseUrlIssues(supabaseUrl: string | undefined, isProd: boolean, isBuildTime: boolean) {
  if (!supabaseUrl) { return []; }
  if (!isAbsoluteHttpUrl(supabaseUrl)) {
    return [issue('VITE_SUPABASE_URL', 'VITE_SUPABASE_URL must be an absolute http(s) URL when provided.', 'error')];
  }
  if (isProd && !isBuildTime && !supabaseUrl.startsWith('https://')) {
    return [issue('VITE_SUPABASE_URL', 'Protected environments must use an HTTPS Supabase URL', 'error')];
  }
  return [];
}

function supabaseProjectIssues(supabaseUrl: string | undefined, publicKey: string | undefined) {
  if (!supabaseUrl || !publicKey) { return []; }
  const urlProjectRef = getSupabaseProjectRefFromUrl(supabaseUrl);
  const keyProjectRef = getSupabaseProjectRefFromJwt(publicKey);
  if (!urlProjectRef || !keyProjectRef || urlProjectRef === keyProjectRef) { return []; }
  return [issue(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    `Configured Supabase public key belongs to project ${keyProjectRef}, but VITE_SUPABASE_URL points to ${urlProjectRef}.`,
    'error',
  )];
}

function environmentFeatureIssues(envSource: EnvSource, isProd: boolean, sentryDsn: string | undefined) {
  const issues: RuntimeConfigIssue[] = [];
  if (isProd && isTruthy(envSource.VITE_ALLOW_DIRECT_SUPABASE_FALLBACK)) {
    issues.push(issue(
      'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK',
      'Production should fail closed. Disable direct Supabase fallback before shipping.',
      'error',
    ));
  }
  if (isProd && !sentryDsn) {
    issues.push(issue('VITE_SENTRY_DSN', 'Production should set VITE_SENTRY_DSN so failures are traceable.', 'warning'));
  }
  return issues;
}

function twoFactorIssues(envSource: EnvSource, hasApiTransport: boolean) {
  if (!isTruthy(envSource.VITE_ENABLE_TWO_FACTOR_AUTH) || hasApiTransport) { return []; }
  return [issue(
    'VITE_ENABLE_TWO_FACTOR_AUTH',
    'Two-factor auth requires a backend transport. Configure the API path before enabling it.',
    'error',
  )];
}

function notificationIssues(envSource: EnvSource) {
  const optionalNotificationSettings = [
    ['VITE_ENABLE_EMAIL_NOTIFICATIONS', 'VITE_SUPPORT_EMAIL', 'Email notifications are enabled but no support email is configured.'],
    ['VITE_ENABLE_SMS_NOTIFICATIONS', 'VITE_SUPPORT_SMS_NUMBER', 'SMS notifications are enabled but no support SMS number is configured.'],
    ['VITE_ENABLE_WHATSAPP_NOTIFICATIONS', 'VITE_SUPPORT_WHATSAPP_NUMBER', 'WhatsApp notifications are enabled but no support WhatsApp number is configured.'],
  ] as const;

  return optionalNotificationSettings.flatMap(([enabledKey, valueKey, message]) =>
    isTruthy(envSource[enabledKey]) && !envSource[valueKey]?.trim()
      ? [issue(valueKey, message, 'warning')]
      : [],
  );
}

export function getRuntimeConfigIssues(
  envSource: EnvSource = readEnvSource(),
): RuntimeConfigIssue[] {
  const apiUrl = resolveApiUrl(envSource);
  const supabaseUrl = resolveSupabaseUrl(envSource);
  const publicKey = resolveSupabasePublicKey(envSource);
  const appUrl = resolveAppUrl(envSource);
  const sentryDsn = trimConfiguredValue(envSource.VITE_SENTRY_DSN);
  const mode = envSource.MODE || envSource.VITE_MODE || envSource.NODE_ENV || 'development';
  const isProd = mode === 'production';
  const isBuildTime = typeof window === 'undefined';
  if (!isProd && isTruthy(envSource.VITE_E2E_LOCAL_AUTH)) { return []; }

  const hasApiTransport = Boolean(apiUrl) || Boolean(supabaseUrl && publicKey);
  const obsIssues = validateObservabilityConfig(envSource, isProd);
  return [
    ...appUrlIssues(appUrl, isProd, isBuildTime),
    ...requiredSupabaseIssues(supabaseUrl, publicKey),
    ...apiIssues(apiUrl, hasApiTransport),
    ...supabaseUrlIssues(supabaseUrl, isProd, isBuildTime),
    ...supabaseProjectIssues(supabaseUrl, publicKey),
    ...environmentFeatureIssues(envSource, isProd, sentryDsn),
    ...notificationIssues(envSource),
    ...twoFactorIssues(envSource, hasApiTransport),
    ...obsIssues.map(i => ({ key: i.key, message: i.message, severity: i.severity })),
  ];
}

export function validateRuntimeConfiguration(envSource: EnvSource = readEnvSource()) {
  const issues = getRuntimeConfigIssues(envSource);
  return {
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  };
}
