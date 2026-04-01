import {
  DEFAULT_CORRIDOR_ID,
  getCorridorOpportunityById,
  type CorridorOpportunity,
} from '../config/wasel-movement-network';

const MEMBERSHIP_KEY = 'wasel-movement-membership';

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
}

const DEFAULT_SNAPSHOT: MovementMembershipSnapshot = {
  plusActive: false,
  commuterPassRouteId: null,
  movementCredits: 120,
  streakDays: 3,
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

function isBrowser() {
  return typeof window !== 'undefined';
}

function readSnapshot(): MovementMembershipSnapshot {
  if (!isBrowser()) return DEFAULT_SNAPSHOT;

  try {
    const raw = window.localStorage.getItem(MEMBERSHIP_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_SNAPSHOT;
    }

    return {
      plusActive: Boolean(parsed.plusActive),
      commuterPassRouteId: typeof parsed.commuterPassRouteId === 'string' ? parsed.commuterPassRouteId : null,
      movementCredits: Number(parsed.movementCredits ?? DEFAULT_SNAPSHOT.movementCredits) || DEFAULT_SNAPSHOT.movementCredits,
      streakDays: Number(parsed.streakDays ?? DEFAULT_SNAPSHOT.streakDays) || DEFAULT_SNAPSHOT.streakDays,
      dailyRouteId: typeof parsed.dailyRouteId === 'string' ? parsed.dailyRouteId : DEFAULT_SNAPSHOT.dailyRouteId,
      loyaltyTier: resolveTier(Number(parsed.movementCredits ?? DEFAULT_SNAPSHOT.movementCredits) || DEFAULT_SNAPSHOT.movementCredits),
      lastActivityDate: typeof parsed.lastActivityDate === 'string' ? parsed.lastActivityDate : null,
    };
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function writeSnapshot(snapshot: MovementMembershipSnapshot) {
  if (!isBrowser()) return snapshot;
  window.localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(snapshot));
  return snapshot;
}

function resolveTier(credits: number): LoyaltyTier {
  if (credits >= 900) return 'infrastructure';
  if (credits >= 600) return 'network';
  if (credits >= 300) return 'dense';
  return 'starter';
}

function updateStreak(previousDate: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (!previousDate) return { streakDays: 1, lastActivityDate: today };
  if (previousDate === today) return { streakDays: null, lastActivityDate: today };

  const diffDays = Math.round(
    (new Date(today).getTime() - new Date(previousDate).getTime()) / 86_400_000,
  );

  if (diffDays === 1) {
    return { streakDays: 'increment', lastActivityDate: today } as const;
  }

  return { streakDays: 1, lastActivityDate: today };
}

export function getMovementMembershipSnapshot() {
  const snapshot = readSnapshot();
  const corridor = snapshot.dailyRouteId
    ? getCorridorOpportunityById(snapshot.dailyRouteId)
    : getCorridorOpportunityById(DEFAULT_CORRIDOR_ID);

  return {
    ...snapshot,
    loyaltyTier: resolveTier(snapshot.movementCredits),
    dailyRoute: corridor,
    commuterPassRoute: snapshot.commuterPassRouteId
      ? getCorridorOpportunityById(snapshot.commuterPassRouteId)
      : null,
  };
}

export function activateWaselPlus() {
  const current = readSnapshot();
  const next = {
    ...current,
    plusActive: true,
    loyaltyTier: resolveTier(current.movementCredits),
  };
  return writeSnapshot(next);
}

export function startCommuterPass(routeId: string) {
  const current = readSnapshot();
  const streak = updateStreak(current.lastActivityDate);
  const credits = current.movementCredits + DEFAULT_POINTS.pass_started;
  const next: MovementMembershipSnapshot = {
    ...current,
    plusActive: true,
    commuterPassRouteId: routeId,
    dailyRouteId: routeId,
    movementCredits: credits,
    streakDays:
      streak.streakDays === 'increment'
        ? current.streakDays + 1
        : streak.streakDays ?? current.streakDays,
    loyaltyTier: resolveTier(credits),
    lastActivityDate: streak.lastActivityDate,
  };
  return writeSnapshot(next);
}

export function recordMovementActivity(
  activity: MovementActivityType,
  routeId?: string | null,
  points?: number,
) {
  const current = readSnapshot();
  const streak = updateStreak(current.lastActivityDate);
  const credits = current.movementCredits + Math.max(0, points ?? DEFAULT_POINTS[activity]);
  const next: MovementMembershipSnapshot = {
    ...current,
    movementCredits: credits,
    dailyRouteId: routeId ?? current.dailyRouteId ?? DEFAULT_CORRIDOR_ID,
    streakDays:
      streak.streakDays === 'increment'
        ? current.streakDays + 1
        : streak.streakDays ?? current.streakDays,
    loyaltyTier: resolveTier(credits),
    lastActivityDate: streak.lastActivityDate,
  };
  return writeSnapshot(next);
}

export function getMembershipCorridor(routeId?: string | null): CorridorOpportunity | null {
  if (!routeId) return getCorridorOpportunityById(DEFAULT_CORRIDOR_ID);
  return getCorridorOpportunityById(routeId);
}
