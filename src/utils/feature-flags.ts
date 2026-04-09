/**
 * Feature Flags & Configuration System
 * Centralized control for feature rollout, A/B testing, and gradual deployment
 */

/**
 * Feature flag types
 */
export type FeatureFlag =
  | 'payment_stripe'
  | 'payment_apple_pay'
  | 'payment_google_pay'
  | 'two_factor_auth'
  | 'whatsapp_notifications'
  | 'sms_notifications'
  | 'email_notifications'
  | 'push_notifications'
  | 'driver_ratings'
  | 'in_app_chat'
  | 'trip_insurance'
  | 'scheduled_rides'
  | 'corporate_accounts'
  | 'accessibility_features'
  | 'dark_mode'
  | 'beta_features';

/**
 * Feature flag configuration
 */
export const FEATURE_FLAGS: Record<FeatureFlag, {
  enabled: boolean;
  rolloutPercentage: number; // 0-100: percentage of users who see this feature
  minVersion?: string;
  environments: ('development' | 'staging' | 'production')[];
  description: string;
}> = {
  payment_stripe: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Stripe payment integration',
  },

  payment_apple_pay: {
    enabled: true,
    rolloutPercentage: 80,
    environments: ['staging', 'production'],
    description: 'Apple Pay payment method',
  },

  payment_google_pay: {
    enabled: true,
    rolloutPercentage: 80,
    environments: ['staging', 'production'],
    description: 'Google Pay payment method',
  },

  two_factor_auth: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Two-factor authentication for accounts',
  },

  whatsapp_notifications: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'WhatsApp notification delivery',
  },

  sms_notifications: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'SMS notification delivery',
  },

  email_notifications: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Email notification delivery',
  },

  push_notifications: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Web push notifications',
  },

  driver_ratings: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Driver rating system',
  },

  in_app_chat: {
    enabled: true,
    rolloutPercentage: 50,
    environments: ['staging', 'production'],
    description: 'In-app chat with drivers (BETA)',
  },

  trip_insurance: {
    enabled: false,
    rolloutPercentage: 0,
    environments: ['staging'],
    description: 'Trip insurance add-on (COMING SOON)',
  },

  scheduled_rides: {
    enabled: true,
    rolloutPercentage: 60,
    environments: ['staging', 'production'],
    description: 'Pre-book rides for future dates',
  },

  corporate_accounts: {
    enabled: false,
    rolloutPercentage: 0,
    environments: ['staging'],
    description: 'Corporate accounts and billing',
  },

  accessibility_features: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'WCAG compliance and accessibility features',
  },

  dark_mode: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Dark theme option',
  },

  beta_features: {
    enabled: import.meta.env.DEV,
    rolloutPercentage: import.meta.env.DEV ? 100 : 0,
    environments: ['development'],
    description: 'Enable all experimental/beta features',
  },
};

/**
 * Get current environment
 */
function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  if (import.meta.env.DEV) return 'development';
  if (window.location.hostname.includes('staging')) return 'staging';
  return 'production';
}

/**
 * Check if feature is enabled for current user
 */
export function isFeatureEnabled(flag: FeatureFlag, userId?: string): boolean {
  const config = FEATURE_FLAGS[flag];
  const environment = getCurrentEnvironment();

  // Check if feature is available in current environment
  if (!config.environments.includes(environment)) {
    return false;
  }

  // If feature is globally disabled
  if (!config.enabled) {
    return false;
  }

  // Check rollout percentage
  if (config.rolloutPercentage < 100) {
    // Deterministic rollout based on user ID
    if (!userId) {
      return Math.random() * 100 < config.rolloutPercentage;
    }

    // Use user ID for consistent rollout
    const hash = userId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 100) < config.rolloutPercentage;
  }

  return true;
}

/**
 * Get feature flag status for all features
 */
export function getFeatureFlagStatus(userId?: string): Record<FeatureFlag, boolean> {
  const status: Record<string, boolean> = {};

  for (const flag of Object.keys(FEATURE_FLAGS) as FeatureFlag[]) {
    status[flag] = isFeatureEnabled(flag, userId);
  }

  return status as Record<FeatureFlag, boolean>;
}

/**
 * Get feature rollout status
 */
export function getFeatureRolloutStatus(): Record<FeatureFlag, {
  enabled: boolean;
  rolloutPercentage: number;
  status: 'alpha' | 'beta' | 'stable' | 'deprecated';
}> {
  const status: Partial<Record<FeatureFlag, {
    enabled: boolean;
    rolloutPercentage: number;
    status: 'alpha' | 'beta' | 'stable' | 'deprecated';
  }>> = {};

  for (const [flag, config] of Object.entries(FEATURE_FLAGS) as [FeatureFlag, typeof FEATURE_FLAGS[FeatureFlag]][]) {
    const rolloutStatus: 'alpha' | 'beta' | 'stable' | 'deprecated' = config.rolloutPercentage === 0
      ? 'alpha'
      : config.rolloutPercentage < 100
        ? 'beta'
        : config.enabled
          ? 'stable'
          : 'deprecated';

    status[flag] = {
      enabled: config.enabled,
      rolloutPercentage: config.rolloutPercentage,
      status: rolloutStatus,
    };
  }

  return status as Record<FeatureFlag, {
    enabled: boolean;
    rolloutPercentage: number;
    status: 'alpha' | 'beta' | 'stable' | 'deprecated';
  }>;
}

/**
 * Update feature flag at runtime (for testing or admin)
 */
export function setFeatureFlagOverride(flag: FeatureFlag, enabled: boolean): void {
  if (import.meta.env.DEV) {
    // Store override in sessionStorage for testing
    sessionStorage.setItem(`ff:${flag}`, String(enabled));
  } else {
    console.warn('[Feature flags] Cannot override in production');
  }
}

/**
 * Get feature flag override (if set in dev)
 */
export function getFeatureFlagOverride(flag: FeatureFlag): boolean | null {
  if (!import.meta.env.DEV) return null;
  const override = sessionStorage.getItem(`ff:${flag}`);
  return override ? override === 'true' : null;
}

/**
 * Hook-friendly feature flag check
 */
export const useFeatureFlag = (flag: FeatureFlag, userId?: string): boolean => {
  return isFeatureEnabled(flag, userId);
};

/**
 * React component wrapper for feature gating
 */
export function FeatureGated({
  flag,
  userId,
  children,
  fallback,
}: {
  flag: FeatureFlag;
  userId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactElement | null {
  return isFeatureEnabled(flag, userId)
    ? (children as React.ReactElement)
    : (fallback as React.ReactElement | null) ?? null;
}
