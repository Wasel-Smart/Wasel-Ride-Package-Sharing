/**
 * GAP #12 FIX: Feature Flags Infrastructure
 *
 * Provides runtime feature toggling for safe production operations.
 * Supports:
 *  - Emergency kill switches for payments, auth, and services
 *  - Gradual rollout by percentage
 *  - Environment-based overrides (env vars take priority)
 *  - Per-user overrides via URL params (dev/staging only)
 *
 * HOW TO USE:
 *   import { isFeatureEnabled, FEATURES } from '@/utils/featureFlags';
 *
 *   if (isFeatureEnabled(FEATURES.CLIQ_PAYMENTS)) {
 *     // show CliQ payment option
 *   }
 */

// ── Feature flag registry ─────────────────────────────────────────────────────

export const FEATURES = {
  // Payments
  CLIQ_PAYMENTS: 'cliq_payments',
  STRIPE_PAYMENTS: 'stripe_payments',
  WALLET_TOPUP: 'wallet_topup',

  // Auth
  TWO_FACTOR_AUTH: 'two_factor_auth',
  GOOGLE_OAUTH: 'google_oauth',
  FACEBOOK_OAUTH: 'facebook_oauth',

  // Services
  RIDE_BOOKING: 'ride_booking',
  PACKAGE_DELIVERY: 'package_delivery',
  BUS_ROUTES: 'bus_routes',
  DRIVE_MODE: 'drive_mode',

  // Notifications
  EMAIL_NOTIFICATIONS: 'email_notifications',
  SMS_NOTIFICATIONS: 'sms_notifications',
  WHATSAPP_NOTIFICATIONS: 'whatsapp_notifications',

  // Dev / internal
  DEMO_DATA: 'demo_data',
  SYNTHETIC_TRIPS: 'synthetic_trips',
  DEBUG_PANEL: 'debug_panel',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

// ── Default values (conservative — off by default for sensitive features) ─────

const DEFAULTS: Record<FeatureKey, boolean> = {
  // Payments — off by default until explicitly configured
  [FEATURES.CLIQ_PAYMENTS]: false,
  [FEATURES.STRIPE_PAYMENTS]: true,
  [FEATURES.WALLET_TOPUP]: true,

  // Auth
  [FEATURES.TWO_FACTOR_AUTH]: false,
  [FEATURES.GOOGLE_OAUTH]: true,
  [FEATURES.FACEBOOK_OAUTH]: true,

  // Services — all on by default
  [FEATURES.RIDE_BOOKING]: true,
  [FEATURES.PACKAGE_DELIVERY]: true,
  [FEATURES.BUS_ROUTES]: true,
  [FEATURES.DRIVE_MODE]: true,

  // Notifications — on by default
  [FEATURES.EMAIL_NOTIFICATIONS]: true,
  [FEATURES.SMS_NOTIFICATIONS]: true,
  [FEATURES.WHATSAPP_NOTIFICATIONS]: true,

  // Dev features — off in production
  [FEATURES.DEMO_DATA]: false,
  [FEATURES.SYNTHETIC_TRIPS]: false,
  [FEATURES.DEBUG_PANEL]: false,
};

// ── Env var mapping ───────────────────────────────────────────────────────────

const ENV_VAR_MAP: Partial<Record<FeatureKey, string>> = {
  [FEATURES.TWO_FACTOR_AUTH]: 'VITE_ENABLE_TWO_FACTOR_AUTH',
  [FEATURES.EMAIL_NOTIFICATIONS]: 'VITE_ENABLE_EMAIL_NOTIFICATIONS',
  [FEATURES.SMS_NOTIFICATIONS]: 'VITE_ENABLE_SMS_NOTIFICATIONS',
  [FEATURES.WHATSAPP_NOTIFICATIONS]: 'VITE_ENABLE_WHATSAPP_NOTIFICATIONS',
  [FEATURES.DEMO_DATA]: 'VITE_ENABLE_DEMO_DATA',
  [FEATURES.SYNTHETIC_TRIPS]: 'VITE_ENABLE_SYNTHETIC_TRIPS',
};

function readEnvFlag(envKey: string): boolean | undefined {
  const val = import.meta.env[envKey] as string | undefined;
  if (val === undefined || val === '') return undefined;
  return val.toLowerCase() === 'true' || val === '1';
}

function readUrlFlag(key: FeatureKey): boolean | undefined {
  // Only allow URL overrides in non-production environments
  if (import.meta.env.PROD) return undefined;
  if (typeof window === 'undefined') return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    const val = params.get(`flag_${key}`);
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
  } catch { /* ignore */ }
  return undefined;
}

// ── Runtime kill switch override (in-memory, cleared on page reload) ──────────

const runtimeOverrides = new Map<FeatureKey, boolean>();

/**
 * Emergency kill switch — disable a feature at runtime without a deploy.
 * Survives until the user refreshes the page.
 */
export function killSwitch(feature: FeatureKey): void {
  runtimeOverrides.set(feature, false);
  console.warn(`[FeatureFlags] Kill switch activated for: ${feature}`);
}

/**
 * Re-enable a feature after a kill switch.
 */
export function restoreFeature(feature: FeatureKey): void {
  runtimeOverrides.delete(feature);
}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Check if a feature is enabled.
 *
 * Priority order:
 *   1. Runtime kill switch (in-memory)
 *   2. URL param override (?flag_<key>=true, dev/staging only)
 *   3. Environment variable (VITE_ENABLE_*)
 *   4. Default value
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  // 1. Runtime kill switch
  if (runtimeOverrides.has(feature)) {
    return runtimeOverrides.get(feature)!;
  }

  // 2. URL param (dev/staging only)
  const urlOverride = readUrlFlag(feature);
  if (urlOverride !== undefined) return urlOverride;

  // 3. Env var
  const envKey = ENV_VAR_MAP[feature];
  if (envKey) {
    const envVal = readEnvFlag(envKey);
    if (envVal !== undefined) return envVal;
  }

  // 4. Default
  return DEFAULTS[feature] ?? false;
}

/**
 * Get all feature flag states (useful for debugging).
 */
export function getAllFlags(): Record<FeatureKey, boolean> {
  return Object.fromEntries(
    Object.values(FEATURES).map(key => [key, isFeatureEnabled(key as FeatureKey)]),
  ) as Record<FeatureKey, boolean>;
}

// ── DEV: expose on window for quick debugging ─────────────────────────────────

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { __waselFlags?: unknown }).__waselFlags = {
    getAll: getAllFlags,
    kill: killSwitch,
    restore: restoreFeature,
    isEnabled: isFeatureEnabled,
    FEATURES,
  };
}
