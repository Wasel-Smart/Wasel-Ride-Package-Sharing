type EnvSource = Record<string, string | undefined>;

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
  const businessAddress = getEnv('VITE_BUSINESS_ADDRESS', 'Amman, Jordan').trim();
  const businessAddressAr = getEnv('VITE_BUSINESS_ADDRESS_AR', 'عمان، الأردن').trim();
  const founderName = getEnv('VITE_FOUNDER_NAME', 'Wasel founder').trim();
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
    supportWhatsAppNumber,
    supportEmail,
    supportPhoneNumber,
    supportSmsNumber,
    businessAddress,
    businessAddressAr,
    founderName,
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

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getAuthRedirectCandidates(origin?: string): string[] {
  const candidates = new Set<string>();
  const currentOrigin = typeof origin === 'string' ? origin.trim() : '';
  const configOrigin = getConfig().appUrl.trim();

  if (currentOrigin) {
    candidates.add(getAuthCallbackUrl(currentOrigin));
  }

  if (configOrigin) {
    candidates.add(getAuthCallbackUrl(configOrigin));
  }

  if (currentOrigin && isLocalDevelopmentOrigin(currentOrigin)) {
    try {
      const url = new URL(currentOrigin);
      const host = url.hostname;
      const protocol = url.protocol || 'http:';
      candidates.add(getAuthCallbackUrl(`${protocol}//${host}:3000`));
      candidates.add(getAuthCallbackUrl(`${protocol}//${host}:5173`));
    } catch {
      // Ignore malformed local origins and continue with known candidates.
    }
  }

  return Array.from(candidates);
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
