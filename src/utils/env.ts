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

export function getConfig() {
  const appUrl = getEnv('VITE_APP_URL', 'http://localhost:3000');
  const supportWhatsAppNumber = getEnv('VITE_SUPPORT_WHATSAPP_NUMBER')
    .replace(/[^\d+]/g, '')
    .trim();
  const authCallbackPath = getEnv('VITE_AUTH_CALLBACK_PATH', '/app/auth/callback');
  const enableDemoAccount = getEnv('VITE_ENABLE_DEMO_DATA', 'false').toLowerCase() === 'true';
  const enableTwoFactorAuth = getEnv('VITE_ENABLE_TWO_FACTOR_AUTH', 'false').toLowerCase() === 'true';

  return {
    appName: getEnv('VITE_APP_NAME', 'Wasel'),
    appUrl,
    supportWhatsAppNumber,
    authCallbackPath: authCallbackPath.startsWith('/') ? authCallbackPath : `/${authCallbackPath}`,
    enableDemoAccount,
    enableTwoFactorAuth,
    isProd: getEnv('NODE_ENV') === 'production',
    isDev: getEnv('NODE_ENV', 'development') !== 'production',
  };
}

export function getAuthCallbackUrl(origin?: string): string {
  const { appUrl, authCallbackPath } = getConfig();
  const base = (origin || appUrl || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${authCallbackPath}`;
}

export function getWhatsAppSupportUrl(message = 'Hi Wasel'): string {
  const { supportWhatsAppNumber } = getConfig();
  if (!supportWhatsAppNumber) {
    return '';
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${supportWhatsAppNumber.replace(/^\+/, '')}?text=${encodedMessage}`;
}
