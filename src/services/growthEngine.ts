/**
 * growthEngine.ts
 *
 * Architecture:
 *  - Supabase `growth_events` table is the PRIMARY store.
 *  - A small in-memory queue (max 50 events) provides a write buffer for offline scenarios.
 *  - localStorage is NOT used for growth events (PII + analytics integrity requirement).
 *  - Referral snapshots are fetched from Supabase on demand with a short TTL memory cache.
 *
 * Security: No sensitive data is held in localStorage. The memory cache is cleared on sign-out.
 */

import {
  getDirectGrowthAnalytics,
  getDirectReferralSnapshot,
  recordDirectGrowthEvent,
  redeemDirectReferralCode,
} from './directSupabase';
import { logger } from '../utils/monitoring';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReferralSnapshot {
  code: string;
  invited: number;
  converted: number;
  pendingCredit: number;
  earnedCredit: number;
  shareUrl: string;
}

export interface GrowthDashboard {
  funnel: { searched: number; selected: number; booked: number; completed: number };
  serviceMix: { rides: number; buses: number; packages: number; referrals: number };
  revenueJod: number;
  activeDemand: number;
  topCorridors: Array<{ corridor: string; demand: number; conversions: number }>;
}

export interface GrowthEventRecord {
  eventName: string;
  funnelStage: string;
  serviceType: 'ride' | 'bus' | 'package' | 'referral' | 'wallet';
  from?: string;
  to?: string;
  valueJod?: number;
  createdAt: string;
}

type GrowthEventInput = {
  userId?: string;
  eventName: string;
  funnelStage: string;
  serviceType: 'ride' | 'bus' | 'package' | 'referral' | 'wallet';
  from?: string;
  to?: string;
  valueJod?: number;
  metadata?: Record<string, unknown>;
};

// ── In-memory write buffer (non-persisted, clears on navigation) ──────────────

const EVENT_BUFFER_MAX = 50;
const eventBuffer: GrowthEventRecord[] = [];

// ── In-memory referral cache (TTL = 2 minutes) ────────────────────────────────

const referralCache = new Map<string, { snapshot: ReferralSnapshot; expiresAt: number }>();
const REFERRAL_TTL_MS = 2 * 60 * 1000;

const EMPTY_DASHBOARD: GrowthDashboard = {
  funnel: { searched: 0, selected: 0, booked: 0, completed: 0 },
  serviceMix: { rides: 0, buses: 0, packages: 0, referrals: 0 },
  revenueJod: 0,
  activeDemand: 0,
  topCorridors: [],
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the in-memory event buffer — useful for route intelligence signals.
 * This is intentionally ephemeral and resets on page reload.
 */
export function getGrowthEventFeed(): GrowthEventRecord[] {
  return [...eventBuffer].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Track a growth event.
 * Primary: write to Supabase via recordDirectGrowthEvent.
 * Buffer: append to in-memory buffer for same-session route intelligence.
 * Never writes to localStorage.
 */
export async function trackGrowthEvent(input: GrowthEventInput): Promise<void> {
  const record: GrowthEventRecord = {
    eventName: input.eventName,
    funnelStage: input.funnelStage,
    serviceType: input.serviceType,
    from: input.from,
    to: input.to,
    valueJod: input.valueJod,
    createdAt: new Date().toISOString(),
  };

  // Append to in-memory buffer (bounded)
  eventBuffer.unshift(record);
  if (eventBuffer.length > EVENT_BUFFER_MAX) {
    eventBuffer.splice(EVENT_BUFFER_MAX);
  }

  // Persist to Supabase (fire-and-forget, never blocks UI)
  try {
    await recordDirectGrowthEvent(input);
  } catch (err) {
    // Non-fatal: in-memory buffer is still populated for current session
    logger.warning('[growthEngine] trackGrowthEvent Supabase write failed', {
      eventName: input.eventName,
      err,
    });
  }
}

/**
 * Get the referral snapshot for a user.
 * Uses a short in-memory cache to avoid redundant Supabase reads.
 */
export async function getReferralSnapshot(
  user?: { id?: string; name?: string } | null,
): Promise<ReferralSnapshot | null> {
  if (!user?.id) return null;

  const cached = referralCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

  const shareUrlBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://wasel14.online';

  try {
    const remote = await getDirectReferralSnapshot(user.id);
    const snapshot: ReferralSnapshot = {
      ...remote,
      shareUrl: `${shareUrlBase}/app/auth?ref=${encodeURIComponent(remote.code)}`,
    };
    referralCache.set(user.id, { snapshot, expiresAt: Date.now() + REFERRAL_TTL_MS });
    return snapshot;
  } catch (err) {
    logger.warning('[growthEngine] getReferralSnapshot failed', { userId: user.id, err });
    return null;
  }
}

/**
 * Redeem a referral code for a user.
 */
export async function applyReferralCode(
  user: { id?: string; name?: string } | null | undefined,
  code: string,
): Promise<ReferralSnapshot | null> {
  if (!user?.id) throw new Error('Sign in to redeem a referral code.');
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new Error('Enter a referral code first.');

  try {
    await redeemDirectReferralCode(user.id, normalizedCode);
  } finally {
    // Always track the attempt
    await trackGrowthEvent({
      userId: user.id,
      eventName: 'referral_attempted',
      funnelStage: 'redeemed',
      serviceType: 'referral',
      metadata: { code: normalizedCode },
    }).catch(() => {});
  }

  // Invalidate cache so next read fetches fresh data
  referralCache.delete(user.id);
  return getReferralSnapshot(user);
}

/**
 * Get the growth dashboard.
 * Fetches from Supabase. Returns empty dashboard on failure.
 */
export async function getGrowthDashboard(userId?: string): Promise<GrowthDashboard> {
  try {
    return await getDirectGrowthAnalytics(userId);
  } catch (err) {
    logger.warning('[growthEngine] getGrowthDashboard failed', { userId, err });
    return EMPTY_DASHBOARD;
  }
}

/**
 * Returns corridor demand leaders from the in-memory event buffer.
 * Only reflects current session — not historical data. For full analytics, use getGrowthDashboard().
 */
export function getCorridorDemandLeaders(limit = 3) {
  const corridorMap = new Map<string, { corridor: string; active: number; serviceLabel: string }>();

  for (const event of eventBuffer) {
    if (!event.from || !event.to) continue;
    const key = `${event.from} to ${event.to}`;
    const existing = corridorMap.get(key);
    corridorMap.set(key, {
      corridor: key,
      active: (existing?.active ?? 0) + 1,
      serviceLabel:
        event.serviceType === 'bus'
          ? 'Bus demand'
          : event.serviceType === 'package'
            ? 'Package demand'
            : 'Ride demand',
    });
  }

  return Array.from(corridorMap.values())
    .sort((a, b) => b.active - a.active)
    .slice(0, limit);
}

/**
 * Clear the in-memory caches (call on sign-out).
 */
export function clearGrowthEngineCache(): void {
  eventBuffer.splice(0);
  referralCache.clear();
}
