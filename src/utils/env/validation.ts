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
  const isLocalE2E = !isProd && isTruthy(envSource.VITE_E2E_LOCAL_AUTH);

  if (isLocalE2E) {
    return issues;
  }

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
