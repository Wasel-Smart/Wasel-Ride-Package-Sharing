/**
 * movementMembership.ts
 *
 * Architecture:
 *  - Supabase `user_membership` table is the PRIMARY store.
 *  - An in-memory module-level cache provides instant synchronous reads within
 *    the current session (used by rendering paths that cannot be async).
 *  - localStorage is NOT used. Membership state (tier, credits, plus status)
 *    is in the FORBIDDEN category for browser persistence: it affects billing,
 *    access control, and analytics. Stale browser data is a compliance risk.
 *  - Writes go to Supabase first. The in-memory cache is updated after success.
 *    On failure, an optimistic local update is applied with `isStale: true` so
 *    the UI stays responsive while the user fixes connectivity.
 *  - Call clearMembershipCache() on sign-out.
 */

import { supabase } from '../utils/supabase/client';
import {
  DEFAULT_CORRIDOR_ID,
  getCorridorOpportunityById,
  type CorridorOpportunity,
} from '../config/wasel-movement-network';
import { logger } from '../utils/monitoring';

// ── Types ────────────────────────────────────────────────────────────────────

export type MovementActivityType =
  | 'ride_booked'
  | 'route_published'
  | 'package_created'
  | 'pass_started'
  | 'referral_unlocked';

export type LoyaltyTier = 'starter' | 'dense' | 'network' | 'infrastructure';

export interface MovementMembershipSnapshot {
  plusActive: boolean;
  commuterPassRouteId: string | null;
  movementCredits: number;
  streakDays: number;
  dailyRouteId: string | null;
  loyaltyTier: LoyaltyTier;
  lastActivityDate: string | null;
  isStale?: boolean; // true when returned from cache due to Supabase unavailability
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SNAPSHOT: MovementMembershipSnapshot = {
  plusActive: false,
  commuterPassRouteId: null,
  movementCredits: 0,
  streakDays: 0,
  dailyRouteId: DEFAULT_CORRIDOR_ID,
  loyaltyTier: 'starter',
  lastActivityDate: null,
};

const DEFAULT_POINTS: Record<MovementActivityType, number> = {
  ride_booked: 24,
  route_published: 34,
  package_created: 18,
  pass_started: 45,
  referral_unlocked: 30,
};

// ── In-memory cache (session-scoped, cleared on sign-out) ─────────────────────

let membershipCache: MovementMembershipSnapshot | null = null;

function readCache(): MovementMembershipSnapshot | null {
  return membershipCache;
}

function writeCache(snapshot: MovementMembershipSnapshot): void {
  membershipCache = snapshot;
}

/** Clear the in-memory cache. Call on sign-out. */
export function clearMembershipCache(): void {
  membershipCache = null;
}

// ── Tier logic ────────────────────────────────────────────────────────────────

function resolveTier(credits: number): LoyaltyTier {
  if (credits >= 900) return 'infrastructure';
  if (credits >= 600) return 'network';
  if (credits >= 300) return 'dense';
  return 'starter';
}

// ── Streak logic ──────────────────────────────────────────────────────────────

function computeStreak(previousDate: string | null, currentStreak: number): { streakDays: number; lastActivityDate: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (!previousDate) return { streakDays: 1, lastActivityDate: today };
  if (previousDate === today) return { streakDays: currentStreak, lastActivityDate: today };

  const diffDays = Math.round(
    (new Date(today).getTime() - new Date(previousDate).getTime()) / 86_400_000,
  );

  if (diffDays === 1) {
    return { streakDays: currentStreak + 1, lastActivityDate: today };
  }

  return { streakDays: 1, lastActivityDate: today };
}

// ── Supabase row normalizer ────────────────────────────────────────────────────

function rowToSnapshot(row: Record<string, unknown>): MovementMembershipSnapshot {
  const credits = Number(row.movement_credits ?? 0);
  return {
    plusActive: Boolean(row.plus_active),
    commuterPassRouteId: String(row.commuter_pass_route_id ?? '').trim() || null,
    movementCredits: credits,
    streakDays: Number(row.streak_days ?? 0),
    dailyRouteId: String(row.daily_route_id ?? DEFAULT_CORRIDOR_ID).trim() || DEFAULT_CORRIDOR_ID,
    loyaltyTier: resolveTier(credits),
    lastActivityDate: String(row.last_activity_date ?? '').trim() || null,
  };
}

// ── Core read ─────────────────────────────────────────────────────────────────

/**
 * Load the membership snapshot for a user.
 * Supabase is authoritative. In-memory cache is returned with `isStale=true` on failure.
 */
export async function loadMembershipSnapshot(userId: string): Promise<MovementMembershipSnapshot> {
  try {
    const { data, error } = await supabase
      .from('user_membership')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    if (!data) {
      // First time — create the record
      const defaultRow = {
        user_id: userId,
        plus_active: false,
        commuter_pass_route_id: null,
        movement_credits: 0,
        streak_days: 0,
        daily_route_id: DEFAULT_CORRIDOR_ID,
        loyalty_tier: 'starter',
        last_activity_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: created } = await supabase
        .from('user_membership')
        .insert(defaultRow)
        .select()
        .single();
      const snapshot = created
        ? rowToSnapshot(created as Record<string, unknown>)
        : DEFAULT_SNAPSHOT;
      writeCache(snapshot);
      return snapshot;
    }

    const snapshot = rowToSnapshot(data as Record<string, unknown>);
    writeCache(snapshot);
    return snapshot;
  } catch (err) {
    logger.error('[movementMembership] loadMembershipSnapshot failed', { userId, err });
    const cached = readCache();
    return cached ? { ...cached, isStale: true } : { ...DEFAULT_SNAPSHOT, isStale: true };
  }
}

/**
 * Synchronous read from in-memory cache — for use in rendering paths that cannot be async.
 * Always call loadMembershipSnapshot() on mount to ensure freshness.
 */
export function getMovementMembershipSnapshot(_userId?: string): MovementMembershipSnapshot & {
  dailyRoute: CorridorOpportunity | null;
  commuterPassRoute: CorridorOpportunity | null;
} {
  const snapshot = readCache() ?? DEFAULT_SNAPSHOT;
  return {
    ...snapshot,
    loyaltyTier: resolveTier(snapshot.movementCredits),
    dailyRoute: snapshot.dailyRouteId
      ? getCorridorOpportunityById(snapshot.dailyRouteId)
      : getCorridorOpportunityById(DEFAULT_CORRIDOR_ID),
    commuterPassRoute: snapshot.commuterPassRouteId
      ? getCorridorOpportunityById(snapshot.commuterPassRouteId)
      : null,
  };
}

// ── Core writes ───────────────────────────────────────────────────────────────

/**
 * Record a movement activity and award credits.
 * Supabase is updated atomically. In-memory cache is refreshed after success.
 */
export async function recordMovementActivity(
  userId: string,
  activity: MovementActivityType,
  routeId?: string | null,
  customPoints?: number,
): Promise<MovementMembershipSnapshot> {
  const current = await loadMembershipSnapshot(userId);
  const points = Math.max(0, customPoints ?? DEFAULT_POINTS[activity]);
  const newCredits = current.movementCredits + points;
  const { streakDays, lastActivityDate } = computeStreak(current.lastActivityDate, current.streakDays);

  try {
    const { data, error } = await supabase
      .from('user_membership')
      .upsert({
        user_id: userId,
        movement_credits: newCredits,
        streak_days: streakDays,
        last_activity_date: lastActivityDate,
        loyalty_tier: resolveTier(newCredits),
        daily_route_id: routeId ?? current.dailyRouteId ?? DEFAULT_CORRIDOR_ID,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    const next = rowToSnapshot(data as Record<string, unknown>);
    writeCache(next);
    return next;
  } catch (err) {
    logger.error('[movementMembership] recordMovementActivity failed', { userId, activity, err });
    // Optimistic in-memory update so UI doesn't feel broken
    const optimistic: MovementMembershipSnapshot = {
      ...current,
      movementCredits: newCredits,
      streakDays,
      lastActivityDate,
      loyaltyTier: resolveTier(newCredits),
      isStale: true,
    };
    writeCache(optimistic);
    return optimistic;
  }
}

/**
 * Activate Wasel Plus for a user.
 */
export async function activateWaselPlus(userId: string): Promise<MovementMembershipSnapshot> {
  try {
    const { data, error } = await supabase
      .from('user_membership')
      .upsert({
        user_id: userId,
        plus_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    const next = rowToSnapshot(data as Record<string, unknown>);
    writeCache(next);
    return next;
  } catch (err) {
    logger.error('[movementMembership] activateWaselPlus failed', { userId, err });
    const cached = readCache();
    const optimistic = { ...(cached ?? DEFAULT_SNAPSHOT), plusActive: true, isStale: true };
    writeCache(optimistic);
    return optimistic;
  }
}

export async function setWaselPlusActive(
  userId: string,
  plusActive: boolean,
): Promise<MovementMembershipSnapshot> {
  if (plusActive) {
    return activateWaselPlus(userId);
  }

  const current = await loadMembershipSnapshot(userId);

  try {
    const { data, error } = await supabase
      .from('user_membership')
      .upsert(
        {
          user_id: userId,
          plus_active: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();

    if (error) throw error;

    const next = rowToSnapshot(data as Record<string, unknown>);
    writeCache(next);
    return next;
  } catch (err) {
    logger.error('[movementMembership] setWaselPlusActive failed', { userId, plusActive, err });
    const optimistic = { ...current, plusActive: false, isStale: true };
    writeCache(optimistic);
    return optimistic;
  }
}

/**
 * Start a commuter pass on a specific route.
 */
export async function startCommuterPass(userId: string, routeId: string): Promise<MovementMembershipSnapshot> {
  const current = await loadMembershipSnapshot(userId);
  const newCredits = current.movementCredits + DEFAULT_POINTS.pass_started;
  const { streakDays, lastActivityDate } = computeStreak(current.lastActivityDate, current.streakDays);

  try {
    const { data, error } = await supabase
      .from('user_membership')
      .upsert({
        user_id: userId,
        plus_active: true,
        commuter_pass_route_id: routeId,
        daily_route_id: routeId,
        movement_credits: newCredits,
        streak_days: streakDays,
        last_activity_date: lastActivityDate,
        loyalty_tier: resolveTier(newCredits),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    const next = rowToSnapshot(data as Record<string, unknown>);
    writeCache(next);
    return next;
  } catch (err) {
    logger.error('[movementMembership] startCommuterPass failed', { userId, routeId, err });
    const optimistic: MovementMembershipSnapshot = {
      ...current,
      plusActive: true,
      commuterPassRouteId: routeId,
      dailyRouteId: routeId,
      movementCredits: newCredits,
      streakDays,
      lastActivityDate,
      loyaltyTier: resolveTier(newCredits),
      isStale: true,
    };
    writeCache(optimistic);
    return optimistic;
  }
}

export function getMembershipCorridor(routeId?: string | null): CorridorOpportunity | null {
  if (!routeId) return getCorridorOpportunityById(DEFAULT_CORRIDOR_ID);
  return getCorridorOpportunityById(routeId);
}
