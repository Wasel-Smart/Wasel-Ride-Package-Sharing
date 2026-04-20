type EnvSource = Record<string, string | undefined>;

export type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

const PLACEHOLDER_MARKERS = [
  'your-project.supabase.co',
  'your-anon-key-here',
  'your-publishable-key',
  'your_publishable_key',
  'pk_test_or_pk_live_key',
  'your-supabase-url',
  'your_supabase_url',
  'replace_with',
  'example.com',
];

function readEnvSource(): EnvSource {
  const importMetaEnv =
    typeof import.meta !== 'undefined' && typeof import.meta.env === 'object'
      ? (import.meta.env as EnvSource)
      : {};

  const processEnv =
    typeof process !== 'undefined' && typeof process.env === 'object'
      ? (process.env as EnvSource)
      : {};

  // Prefer runtime process env so tests and server-side overrides can supersede
  // checked-in or build-time import.meta.env values deterministically.
  return { ...importMetaEnv, ...processEnv };
}

function isMeaningfulValue(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  const lower = normalized.toLowerCase();
  return !PLACEHOLDER_MARKERS.some(marker => lower.includes(marker));
}

function normalizeEnvironment(value: string | undefined): AppEnvironment {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  switch (normalized) {
    case 'prod':
    case 'production':
      return 'production';
    case 'stage':
    case 'staging':
      return 'staging';
    case 'test':
      return 'test';
    default:
      return 'development';
  }
}

export function getEnv(key: string, fallback = ''): string {
  const value = readEnvSource()[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function hasEnv(key: string): boolean {
  return isMeaningfulValue(readEnvSource()[key]);
}

function getBooleanEnv(key: string, fallback: boolean): boolean {
  const value = getEnv(key);
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function resolveEnvironment(): AppEnvironment {
  return normalizeEnvironment(
    getEnv('VITE_APP_ENV') ||
      getEnv('MODE') ||
      getEnv('VITE_MODE') ||
      getEnv('NODE_ENV', 'development'),
  );
}

function flagAllowedInEnvironment(
  key: string,
  fallback: boolean,
  environment: AppEnvironment,
  allowedEnvironments: AppEnvironment[],
): boolean {
  const enabled = getBooleanEnv(key, fallback);
  return enabled && allowedEnvironments.includes(environment);
}

function resolveAppUrl(environment: AppEnvironment): string {
  const configuredAppUrl = getEnv(
    'VITE_APP_URL',
    environment === 'production' || environment === 'staging' ? '' : 'http://localhost:3000',
  ).trim();
  const runtimeOrigin =
    typeof window !== 'undefined' && typeof window.location?.origin === 'string'
      ? window.location.origin.trim()
      : '';

  if (runtimeOrigin && isLocalDevelopmentOrigin(runtimeOrigin)) {
    if (!configuredAppUrl || isLocalDevelopmentOrigin(configuredAppUrl)) {
      return runtimeOrigin;
    }
  }

  return configuredAppUrl || 'http://localhost:3000';
}

let _configCache: ReturnType<typeof buildConfig> | null = null;

function buildConfig() {
  const environment = resolveEnvironment();
  const appUrl = resolveAppUrl(environment);
  const stripePublishableKey = hasEnv('VITE_STRIPE_PUBLISHABLE_KEY')
    ? getEnv('VITE_STRIPE_PUBLISHABLE_KEY').trim()
    : '';
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
  const businessAddressAr = getEnv(
    'VITE_BUSINESS_ADDRESS_AR',
    '\u0639\u0645\u0627\u0646\u060C \u0627\u0644\u0623\u0631\u062F\u0646',
  ).trim();
  const founderName = getEnv('VITE_FOUNDER_NAME', 'Wasel founder').trim();
  const authCallbackPath = getEnv('VITE_AUTH_CALLBACK_PATH', '/app/auth/callback');
  const isProd = environment === 'production';
  const isStaging = environment === 'staging';
  const isTest = environment === 'test';
  const enableDemoAccount = flagAllowedInEnvironment('VITE_ENABLE_DEMO_DATA', false, environment, [
    'development',
    'test',
  ]);
  const enableSyntheticTrips = flagAllowedInEnvironment(
    'VITE_ENABLE_SYNTHETIC_TRIPS',
    false,
    environment,
    ['development', 'test'],
  );
  const enablePersistedTestAuth = flagAllowedInEnvironment(
    'VITE_ENABLE_PERSISTED_TEST_AUTH',
    false,
    environment,
    ['test'],
  );
  const enableTwoFactorAuth = getBooleanEnv('VITE_ENABLE_TWO_FACTOR_AUTH', false);
  const enableEmailNotifications = getBooleanEnv('VITE_ENABLE_EMAIL_NOTIFICATIONS', true);
  const enableSmsNotifications = getBooleanEnv('VITE_ENABLE_SMS_NOTIFICATIONS', true);
  const enableWhatsAppNotifications = getBooleanEnv('VITE_ENABLE_WHATSAPP_NOTIFICATIONS', true);
  const allowDirectSupabaseFallback = flagAllowedInEnvironment(
    'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK',
    isTest,
    environment,
    ['development', 'test'],
  );
  const allowLocalPersistenceFallback = flagAllowedInEnvironment(
    'VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK',
    isTest,
    environment,
    ['development', 'test'],
  );

  return {
    appName: getEnv('VITE_APP_NAME', 'Wasel'),
    appUrl,
    environment,
    stripePublishableKey,
    stripeEnabled: stripePublishableKey.length > 0,
    supportWhatsAppNumber,
    supportEmail,
    supportPhoneNumber,
    supportSmsNumber,
    businessAddress,
    businessAddressAr,
    founderName,
    authCallbackPath: authCallbackPath.startsWith('/') ? authCallbackPath : `/${authCallbackPath}`,
    enableDemoAccount,
    enableSyntheticTrips,
    enablePersistedTestAuth,
    enableTwoFactorAuth,
    enableEmailNotifications,
    enableSmsNotifications,
    enableWhatsAppNotifications,
    allowDirectSupabaseFallback,
    allowLocalPersistenceFallback,
    isProd,
    isStaging,
    isTest,
    isDev: environment === 'development',
  };
}

export function getConfig() {
  // Skip cache in test environments so vi.stubEnv changes are reflected immediately
  const isTestEnv =
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

  if (isTestEnv) {
    return buildConfig();
  }

  if (!_configCache) {
    _configCache = buildConfig();
  }
  return _configCache;
}

/** Call in tests to reset the config cache between test runs. */
export function resetConfigCache(): void {
  _configCache = null;
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
  if (subject) {search.set('subject', subject);}
  if (body) {search.set('body', body);}
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
