export interface FeatureFlagDefinition {
  key: string;
  description: string;
  envKey: string;
  defaultValue: boolean;
  category: 'operational' | 'experimental' | 'integration' | 'ui';
}

export const FEATURE_FLAGS: readonly FeatureFlagDefinition[] = [
  {
    key: 'twoFactorAuth',
    description: 'Enable two-factor authentication for all users',
    envKey: 'VITE_ENABLE_TWO_FACTOR_AUTH',
    defaultValue: false,
    category: 'operational',
  },
  {
    key: 'enforceTwoFactorAuth',
    description: 'Require two-factor authentication (cannot be disabled by users)',
    envKey: 'VITE_ENFORCE_TWO_FACTOR_AUTH',
    defaultValue: false,
    category: 'operational',
  },
  {
    key: 'emailNotifications',
    description: 'Enable email notifications',
    envKey: 'VITE_ENABLE_EMAIL_NOTIFICATIONS',
    defaultValue: true,
    category: 'integration',
  },
  {
    key: 'smsNotifications',
    description: 'Enable SMS notifications',
    envKey: 'VITE_ENABLE_SMS_NOTIFICATIONS',
    defaultValue: true,
    category: 'integration',
  },
  {
    key: 'whatsAppNotifications',
    description: 'Enable WhatsApp notifications',
    envKey: 'VITE_ENABLE_WHATSAPP_NOTIFICATIONS',
    defaultValue: true,
    category: 'integration',
  },
  {
    key: 'demoData',
    description: 'Enable demo data mode',
    envKey: 'VITE_ENABLE_DEMO_DATA',
    defaultValue: false,
    category: 'operational',
  },
  {
    key: 'syntheticTrips',
    description: 'Enable synthetic trip generation',
    envKey: 'VITE_ENABLE_SYNTHETIC_TRIPS',
    defaultValue: false,
    category: 'experimental',
  },
  {
    key: 'directSupabaseFallback',
    description: 'Allow direct Supabase queries when edge functions are unavailable',
    envKey: 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK',
    defaultValue: false,
    category: 'operational',
  },
  {
    key: 'captchaAuth',
    description: 'Enable CAPTCHA during authentication',
    envKey: 'VITE_AUTH_CAPTCHA_PROVIDER',
    defaultValue: false,
    category: 'operational',
  },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number]['key'];

function readFlag(definition: FeatureFlagDefinition): boolean {
  const raw = import.meta.env?.[definition.envKey];
  if (typeof raw !== 'string') {
    return definition.defaultValue;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return definition.defaultValue;
  }

  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const flag = FEATURE_FLAGS.find(entry => entry.key === key);
  if (!flag) {
    throw new Error(`Unknown feature flag: ${key}`);
  }
  return readFlag(flag);
}

export function getFeatureFlag(key: FeatureFlagKey): boolean {
  return isFeatureEnabled(key);
}

export function getEnabledFeatureFlags(): FeatureFlagKey[] {
  return FEATURE_FLAGS.filter(flag => readFlag(flag)).map(flag => flag.key);
}

export function getFeatureFlagDescription(key: FeatureFlagKey): string {
  const flag = FEATURE_FLAGS.find(entry => entry.key === key);
  if (!flag) {
    throw new Error(`Unknown feature flag: ${key}`);
  }
  return flag.description;
}
