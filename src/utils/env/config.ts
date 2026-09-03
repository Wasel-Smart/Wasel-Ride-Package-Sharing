import { readEnvSource, resolveAppUrl } from './resolvers';

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
  const enforceTwoFactorAuth = getBooleanEnv('VITE_ENFORCE_TWO_FACTOR_AUTH', false);
  const enableEmailNotifications = getBooleanEnv('VITE_ENABLE_EMAIL_NOTIFICATIONS', true);
  const enableSmsNotifications = getBooleanEnv('VITE_ENABLE_SMS_NOTIFICATIONS', true);
  const enableWhatsAppNotifications = getBooleanEnv('VITE_ENABLE_WHATSAPP_NOTIFICATIONS', true);
  const allowDirectSupabaseFallback = getBooleanEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', false);

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
    enforceTwoFactorAuth,
    enableEmailNotifications,
    enableSmsNotifications,
    enableWhatsAppNotifications,
    allowDirectSupabaseFallback,
    isProd,
    isDev: !isProd,
  };
}
