/**
 * Feature Flags System — Wasel | واصل
 * Carpooling-first platform (BlaBlaCar model for MENA).
 * Controls rollout phases across Jordan, Egypt, and future MENA regions.
 *
 * ⚠️ DEPRECATED (Uber-era) flags removed:
 *   ENABLE_VOICE_ASSISTANT, ENABLE_AR_NAVIGATION, ENABLE_DRIVER_GUARANTEE
 *   These were on-demand ride-hailing features, incompatible with carpooling.
 */

export type FeatureFlag =
  // ── Carpooling core ──────────────────────────────────────────────────────────
  | 'ENABLE_PUBLIC_SIGNUP'
  | 'ENABLE_ADVANCE_BOOKING'       // Core carpooling — book 24h+ ahead
  | 'ENABLE_RECURRING_RIDES'       // School runs, corporate carpools
  | 'ENABLE_BOOKING_REQUESTS'      // Driver approves/rejects booking requests
  // ── Raje3 package delivery ───────────────────────────────────────────────────
  | 'ENABLE_PACKAGE_DELIVERY'      // Raje3 — rides on existing trips only
  | 'ENABLE_PACKAGE_INSURANCE'     // JOD 0.50 basic / JOD 2.00 premium
  | 'ENABLE_QR_VERIFICATION'       // QR scan at pickup and delivery
  // ── Cultural features ────────────────────────────────────────────────────────
  | 'ENABLE_GENDER_PREFERENCES'    // Women-only, men-only, family-only rides
  | 'ENABLE_PRAYER_STOPS'          // Auto-inject prayer stops on long routes
  | 'ENABLE_RAMADAN_MODE'          // Ramadan-specific UX and discounts
  | 'ENABLE_HIJAB_PRIVACY'         // Hide profile photos option
  // ── Payments ────────────────────────────────────────────────────────────────
  | 'ENABLE_PAYMENT'               // Online payment (Stripe)
  | 'ENABLE_CASH_ON_ARRIVAL'       // COA with JOD 20 deposit
  | 'ENABLE_WALLET'                // In-app wallet
  | 'ENABLE_BNPL'                  // Buy-now-pay-later (Tamara/Tabby)
  // ── Growth & engagement ──────────────────────────────────────────────────────
  | 'ENABLE_REFERRALS'
  | 'ENABLE_LOYALTY_PROGRAM'
  | 'ENABLE_STUDENT_DISCOUNT'
  | 'ENABLE_SOCIAL_FEATURES'
  // ── Multi-country ────────────────────────────────────────────────────────────
  | 'ENABLE_EGYPT_ROUTES'          // Egypt launch (beta)
  | 'ENABLE_SAUDI_ROUTES'          // Saudi (coming soon)
  | 'ENABLE_UAE_ROUTES'            // UAE (coming soon)
  // ── Platform controls ────────────────────────────────────────────────────────
  | 'ENABLE_CAMPUS_MODE'
  | 'MAX_DAILY_SIGNUPS';

export type LaunchPhase = 'week0' | 'week1' | 'week2' | 'week3' | 'week4' | 'production';

interface FeatureFlagConfig {
  enabled: boolean;
  value?: any;
  description: string;
  rolloutDate?: string;
}

type FeatureFlagMap = {
  [K in FeatureFlag]: FeatureFlagConfig;
};

// ─── Week 0-1: Soft Launch (Jordan only, 50 travelers, invite-only) ───────────

const WEEK0_FLAGS: FeatureFlagMap = {
  ENABLE_PUBLIC_SIGNUP:    { enabled: false, description: 'Invite-only during soft launch' },
  ENABLE_ADVANCE_BOOKING:  { enabled: true,  description: 'Core carpooling — book trips 24h+ ahead' },
  ENABLE_RECURRING_RIDES:  { enabled: false, description: 'School runs / corporate — Week 2+' },
  ENABLE_BOOKING_REQUESTS: { enabled: true,  description: 'Driver accepts/rejects passenger requests' },

  ENABLE_PACKAGE_DELIVERY: { enabled: false, description: 'Raje3 launches Week 3' },
  ENABLE_PACKAGE_INSURANCE:{ enabled: false, description: 'Insurance launches with Raje3' },
  ENABLE_QR_VERIFICATION:  { enabled: false, description: 'QR launches with Raje3' },

  ENABLE_GENDER_PREFERENCES:{ enabled: true, description: 'Women-only, family-only rides — Jordan priority' },
  ENABLE_PRAYER_STOPS:     { enabled: true,  description: 'Prayer stops on routes > 2 hours' },
  ENABLE_RAMADAN_MODE:     { enabled: true,  description: 'Ramadan 2026: March 1-30' },
  ENABLE_HIJAB_PRIVACY:    { enabled: true,  description: 'Hide profile photo option' },

  ENABLE_PAYMENT:          { enabled: true,  value: 'test_mode', description: 'Stripe test mode' },
  ENABLE_CASH_ON_ARRIVAL:  { enabled: true,  description: 'Cash on arrival with JOD 20 deposit' },
  ENABLE_WALLET:           { enabled: false, description: 'Wallet launches Week 2' },
  ENABLE_BNPL:             { enabled: false, description: 'BNPL (Tamara/Tabby) — production only' },

  ENABLE_REFERRALS:        { enabled: false, description: 'Referral program — Week 2' },
  ENABLE_LOYALTY_PROGRAM:  { enabled: false, description: 'Loyalty rewards — Week 3' },
  ENABLE_STUDENT_DISCOUNT: { enabled: false, description: 'Student 20% discount — Week 2 (campus mode)' },
  ENABLE_SOCIAL_FEATURES:  { enabled: false, description: 'Social features — Week 3' },

  ENABLE_EGYPT_ROUTES:     { enabled: false, description: 'Egypt beta — after Jordan soft launch' },
  ENABLE_SAUDI_ROUTES:     { enabled: false, description: 'Saudi — coming soon' },
  ENABLE_UAE_ROUTES:       { enabled: false, description: 'UAE — coming soon' },

  ENABLE_CAMPUS_MODE:      { enabled: false, description: 'University of Jordan targeting — Week 2' },
  MAX_DAILY_SIGNUPS:       { enabled: true,  value: 50, description: 'Invite-only cap' },
};

// ─── Week 2: Limited Public Launch ───────────────────────────────────────────

const WEEK2_FLAGS: FeatureFlagMap = {
  ...WEEK0_FLAGS,
  ENABLE_PUBLIC_SIGNUP:    { enabled: true, description: 'Public signups open' },
  ENABLE_RECURRING_RIDES:  { enabled: true, description: 'School runs / corporate carpools active' },
  ENABLE_WALLET:           { enabled: true, description: 'In-app wallet live' },
  ENABLE_REFERRALS: {
    enabled: true,
    value: { referrer_credit_jod: 3, referee_credit_jod: 5 },
    description: 'Viral growth: JOD 3 referrer / JOD 5 referee',
  },
  ENABLE_STUDENT_DISCOUNT: {
    enabled: true,
    value: 0.20,
    description: '20% student discount with .edu email or student ID',
  },
  ENABLE_CAMPUS_MODE:      { enabled: true, description: 'Yarmouk / Jordan University targeting' },
  MAX_DAILY_SIGNUPS:       { enabled: true, value: 200, description: 'Increased cap' },
};

// ─── Week 3-4: Scale + Raje3 Launch ──────────────────────────────────────────

const WEEK3_FLAGS: FeatureFlagMap = {
  ...WEEK2_FLAGS,
  ENABLE_PACKAGE_DELIVERY: { enabled: true, description: 'Raje3 live — packages on existing trips' },
  ENABLE_PACKAGE_INSURANCE:{ enabled: true, description: 'JOD 0.50 basic / JOD 2.00 premium insurance' },
  ENABLE_QR_VERIFICATION:  { enabled: true, description: 'QR pickup & delivery verification' },
  ENABLE_SOCIAL_FEATURES:  { enabled: true, description: 'Ride sharing social layer' },
  ENABLE_LOYALTY_PROGRAM: {
    enabled: true,
    value: {
      bronze: { trips: 5,  discount: 0.05 },
      silver: { trips: 10, discount: 0.10 },
      gold:   { trips: 20, discount: 0.15 },
    },
    description: 'Tiered loyalty: Bronze/Silver/Gold',
  },
  ENABLE_EGYPT_ROUTES:     { enabled: true, description: 'Egypt beta — Cairo, Alexandria, Sharm routes' },
  MAX_DAILY_SIGNUPS:       { enabled: false, description: 'No signup cap' },
};

// ─── Production: Full Platform ────────────────────────────────────────────────

const PRODUCTION_FLAGS: FeatureFlagMap = {
  ...WEEK3_FLAGS,
  ENABLE_PAYMENT:          { enabled: true, value: 'live_mode', description: 'Stripe live mode' },
  ENABLE_BNPL:             { enabled: true, description: 'BNPL via Tamara/Tabby for JOD 10+ bookings' },
  ENABLE_SAUDI_ROUTES:     { enabled: true, description: 'Saudi Arabia carpooling live' },
  ENABLE_UAE_ROUTES:       { enabled: true, description: 'UAE carpooling live' },
};

// ─── Phase config map ─────────────────────────────────────────────────────────

const PHASE_CONFIGS: Record<LaunchPhase, FeatureFlagMap> = {
  week0: WEEK0_FLAGS,
  week1: WEEK0_FLAGS,
  week2: WEEK2_FLAGS,
  week3: WEEK3_FLAGS,
  week4: WEEK3_FLAGS,
  production: PRODUCTION_FLAGS,
};

// ─── Phase detection ──────────────────────────────────────────────────────────

export function getCurrentPhase(): LaunchPhase {
  try {
    const override = localStorage.getItem('admin_phase_override') as LaunchPhase | null;
    if (override && PHASE_CONFIGS[override]) return override;
  } catch { /* ignore */ }

  const envPhase = (import.meta.env.VITE_LAUNCH_PHASE ?? '') as string;
  if (envPhase && envPhase in PHASE_CONFIGS) return envPhase as LaunchPhase;

  // Auto-detect from launch date
  const LAUNCH_DATE = new Date('2026-03-01');
  const now = new Date();
  const days = Math.floor((now.getTime() - LAUNCH_DATE.getTime()) / 86_400_000);

  if (days < 0)  return 'week0';
  if (days < 7)  return 'week1';
  if (days < 14) return 'week2';
  if (days < 21) return 'week3';
  if (days < 30) return 'week4';
  return 'production';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return PHASE_CONFIGS[getCurrentPhase()][flag]?.enabled ?? false;
}

export function getFeatureValue<T = any>(flag: FeatureFlag): T | undefined {
  return PHASE_CONFIGS[getCurrentPhase()][flag]?.value as T;
}

export function getAllFeatureFlags(): FeatureFlagMap {
  return PHASE_CONFIGS[getCurrentPhase()];
}

export function setAdminPhaseOverride(phase: LaunchPhase | null): void {
  try {
    if (phase === null) localStorage.removeItem('admin_phase_override');
    else localStorage.setItem('admin_phase_override', phase);
  } catch { /* ignore */ }
}

export function getLaunchProgress(): number {
  const map: Record<LaunchPhase, number> = {
    week0: 0, week1: 20, week2: 40, week3: 60, week4: 80, production: 100,
  };
  return map[getCurrentPhase()];
}

export function getDaysRemainingInPhase(): number {
  const LAUNCH_DATE = new Date('2026-03-01');
  const now = new Date();
  const days = Math.floor((now.getTime() - LAUNCH_DATE.getTime()) / 86_400_000);

  const phaseBoundaries: Record<LaunchPhase, number> = {
    week0: 0, week1: 7, week2: 14, week3: 21, week4: 30, production: Infinity,
  };

  const phase = getCurrentPhase();
  const phaseEnd = phaseBoundaries[phase];
  if (phaseEnd === Infinity) return 0; // production has no end
  return Math.max(0, phaseEnd - days);
}

/** React hook for feature flags */
export function useFeatureFlag(flag: FeatureFlag) {
  return {
    enabled: isFeatureEnabled(flag),
    value: getFeatureValue(flag),
    phase: getCurrentPhase(),
  };
}

/** Check if user can sign up */
export async function canUserSignUp(): Promise<{ allowed: boolean; reason?: string }> {
  if (!isFeatureEnabled('ENABLE_PUBLIC_SIGNUP')) {
    return { allowed: false, reason: 'Public signups not yet enabled. Join our waitlist! | انضم لقائمة الانتظار' };
  }

  const maxDaily = getFeatureValue<number>('MAX_DAILY_SIGNUPS');
  if (!maxDaily) return { allowed: true };

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

    if (!supabaseUrl || !anonKey) return { allowed: true };

    const response = await fetch(`${supabaseUrl}/functions/v1/make-server-0b1f4071/signups/today-count`, {
      headers: { Authorization: `Bearer ${anonKey}` },
    });
    const { count } = await response.json() as { count: number };

    if (count >= maxDaily) {
      return { allowed: false, reason: `Daily signup limit reached (${maxDaily}). Try again tomorrow!` };
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // Fail open
  }
}