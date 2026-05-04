type EnvSource = Record<string, string | undefined>;

export interface RuntimeConfigIssue {
  key: string;
  message: string;
  severity: 'warning' | 'error';
}

function readEnvSource(): EnvSource {
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
  const apiUrl = envSource.VITE_API_URL?.trim() || '';
  const supabaseUrl = envSource.VITE_SUPABASE_URL?.trim() || '';
  const supabasePublicKey =
    envSource.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    envSource.VITE_SUPABASE_ANON_KEY?.trim() ||
    '';
  const appUrl = envSource.VITE_APP_URL?.trim() || '';
  const sentryDsn = envSource.VITE_SENTRY_DSN?.trim() || '';
  const mode = envSource.MODE || envSource.VITE_MODE || envSource.NODE_ENV || 'development';
  const isProd = mode === 'production';
  const hasApiTransport = Boolean(apiUrl) || (Boolean(supabaseUrl) && Boolean(supabasePublicKey));

  if (!appUrl) {
    issues.push({
      key: 'VITE_APP_URL',
      message: 'VITE_APP_URL should be set so auth callbacks and support links resolve correctly.',
      severity: 'error',
    });
  } else if (!isAbsoluteHttpUrl(appUrl)) {
    issues.push({
      key: 'VITE_APP_URL',
      message: 'VITE_APP_URL must be an absolute http(s) URL.',
      severity: 'error',
    });
  }

  if (!hasApiTransport) {
    issues.push({
      key: 'VITE_API_URL',
      message:
        'Set VITE_API_URL or provide both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY so ride and package flows have a backend transport.',
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
  const appUrl = getEnv('VITE_APP_URL', 'http://localhost:3000');
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
  const allowDirectSupabaseFallback = getBooleanEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', !isProd);

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

export function getAuthCallbackUrl(origin?: string): string {
  const { appUrl, authCallbackPath } = getConfig();
  const base = (origin || appUrl || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${authCallbackPath}`;
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
