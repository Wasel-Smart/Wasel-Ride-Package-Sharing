import {
  DEFAULT_CORRIDOR_ID,
  getCorridorOpportunityById,
  type CorridorOpportunity,
} from '../config/wasel-movement-network';
import { getAuthDetails } from './core';
import { walletApi, type WalletData } from './walletApi';

export type MovementActivityType =
  | 'ride_booked'
  | 'route_published'
  | 'package_created'
  | 'pass_started'
  | 'referral_unlocked';

export type LoyaltyTier = 'starter' | 'dense' | 'network' | 'infrastructure';

export interface MovementMembershipSnapshot {
  plusActive: boolean;
  plusStartedAt: string | null;
  plusRenewalDate: string | null;
  plusPriceJod: number;
  commuterPassRouteId: string | null;
  commuterPassStartedAt: string | null;
  commuterPassRenewalDate: string | null;
  movementCredits: number;
  streakDays: number;
  dailyRouteId: string | null;
  loyaltyTier: LoyaltyTier;
  lastActivityDate: string | null;
}

const DEFAULT_SNAPSHOT: MovementMembershipSnapshot = {
  plusActive: false,
  plusStartedAt: null,
  plusRenewalDate: null,
  plusPriceJod: 9.99,
  commuterPassRouteId: null,
  commuterPassStartedAt: null,
  commuterPassRenewalDate: null,
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

let cachedSnapshot: MovementMembershipSnapshot = { ...DEFAULT_SNAPSHOT };

function resolveTier(credits: number): LoyaltyTier {
  if (credits >= 900) {return 'infrastructure';}
  if (credits >= 600) {return 'network';}
  if (credits >= 300) {return 'dense';}
  return 'starter';
}

function updateStreak(previousDate: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (!previousDate) {return { streakDays: 1, lastActivityDate: today };}
  if (previousDate === today) {return { streakDays: null, lastActivityDate: today };}

  const diffDays = Math.round(
    (new Date(today).getTime() - new Date(previousDate).getTime()) / 86_400_000,
  );

  if (diffDays === 1) {
    return { streakDays: 'increment', lastActivityDate: today } as const;
  }

  return { streakDays: 1, lastActivityDate: today };
}

function snapshotFromWallet(wallet: WalletData | null | undefined): MovementMembershipSnapshot {
  const subscription = wallet?.subscription ?? null;
  const isCommuterPass = subscription?.type === 'commuter-pass';
  return {
    plusActive: Boolean(subscription),
    plusStartedAt: subscription ? subscription.renewalDate ?? new Date().toISOString() : null,
    plusRenewalDate: subscription?.renewalDate ?? null,
    plusPriceJod: subscription?.price ?? DEFAULT_SNAPSHOT.plusPriceJod,
    commuterPassRouteId: isCommuterPass ? subscription?.corridorId ?? null : null,
    commuterPassStartedAt: isCommuterPass ? new Date().toISOString() : null,
    commuterPassRenewalDate: isCommuterPass ? subscription?.renewalDate ?? null : null,
    movementCredits: cachedSnapshot.movementCredits,
    streakDays: cachedSnapshot.streakDays,
    dailyRouteId: subscription?.corridorId ?? cachedSnapshot.dailyRouteId ?? DEFAULT_CORRIDOR_ID,
    loyaltyTier: resolveTier(cachedSnapshot.movementCredits),
    lastActivityDate: cachedSnapshot.lastActivityDate,
  };
}

function hydrateCachedSnapshot(wallet: WalletData | null | undefined) {
  cachedSnapshot = snapshotFromWallet(wallet);
}

export function getMovementMembershipSnapshot() {
  const snapshot = { ...cachedSnapshot, loyaltyTier: resolveTier(cachedSnapshot.movementCredits) };
  const corridor = snapshot.dailyRouteId
    ? getCorridorOpportunityById(snapshot.dailyRouteId)
    : getCorridorOpportunityById(DEFAULT_CORRIDOR_ID);

  return {
    ...snapshot,
    dailyRoute: corridor,
    commuterPassRoute: snapshot.commuterPassRouteId
      ? getCorridorOpportunityById(snapshot.commuterPassRouteId)
      : null,
    activeSubscription:
      snapshot.commuterPassRouteId && getCorridorOpportunityById(snapshot.commuterPassRouteId)
        ? {
            id: `commuter-pass-${snapshot.commuterPassRouteId}`,
            type: 'commuter-pass' as const,
            planName: `${getCorridorOpportunityById(snapshot.commuterPassRouteId)?.label ?? 'Corridor'} Pass`,
            priceJod: corridor?.subscriptionPriceJod ?? snapshot.plusPriceJod,
            renewalDate: snapshot.commuterPassRenewalDate,
            corridorId: snapshot.commuterPassRouteId,
            corridorLabel: getCorridorOpportunityById(snapshot.commuterPassRouteId)?.label ?? null,
            benefits: [
              'Priority seat access on your daily corridor',
              'Corridor-specific commuter discount',
              'Pinned pickup point and route recall',
            ],
          }
        : snapshot.plusActive
          ? {
              id: 'wasel-plus',
              type: 'plus' as const,
              planName: 'Wasel Plus',
              priceJod: snapshot.plusPriceJod,
              renewalDate: snapshot.plusRenewalDate,
              corridorId: null,
              corridorLabel: corridor?.label ?? null,
              benefits: [
                'Plus discount on shared movement',
                'Priority booking in dense route windows',
                'Faster conversion into corridor passes',
              ],
            }
          : null,
  };
}

export async function refreshMovementMembership() {
  try {
    const { userId } = await getAuthDetails();
    const wallet = await walletApi.getWallet(userId);
    hydrateCachedSnapshot(wallet);
  } catch {
    cachedSnapshot = { ...cachedSnapshot };
  }
  return getMovementMembershipSnapshot();
}

export async function activateWaselPlus(priceJod = DEFAULT_SNAPSHOT.plusPriceJod) {
  const { userId } = await getAuthDetails();
  await walletApi.subscribe(userId, 'Wasel Plus', priceJod, null);
  return refreshMovementMembership();
}

export async function startCommuterPass(routeId: string) {
  const corridor = getCorridorOpportunityById(routeId);
  const { userId } = await getAuthDetails();
  await walletApi.subscribe(
    userId,
    `${corridor?.label ?? 'Corridor'} Pass`,
    corridor?.subscriptionPriceJod ?? DEFAULT_SNAPSHOT.plusPriceJod,
    routeId,
  );
  const streak = updateStreak(cachedSnapshot.lastActivityDate);
  const credits = cachedSnapshot.movementCredits + DEFAULT_POINTS.pass_started;
  cachedSnapshot = {
    ...cachedSnapshot,
    movementCredits: credits,
    streakDays:
      streak.streakDays === 'increment'
        ? cachedSnapshot.streakDays + 1
        : streak.streakDays ?? cachedSnapshot.streakDays,
    loyaltyTier: resolveTier(credits),
    lastActivityDate: streak.lastActivityDate,
  };
  return refreshMovementMembership();
}

export function recordMovementActivity(
  activity: MovementActivityType,
  routeId?: string | null,
  points?: number,
) {
  const streak = updateStreak(cachedSnapshot.lastActivityDate);
  const credits = cachedSnapshot.movementCredits + Math.max(0, points ?? DEFAULT_POINTS[activity]);
  cachedSnapshot = {
    ...cachedSnapshot,
    movementCredits: credits,
    dailyRouteId: routeId ?? cachedSnapshot.dailyRouteId ?? DEFAULT_CORRIDOR_ID,
    streakDays:
      streak.streakDays === 'increment'
        ? cachedSnapshot.streakDays + 1
        : streak.streakDays ?? cachedSnapshot.streakDays,
    loyaltyTier: resolveTier(credits),
    lastActivityDate: streak.lastActivityDate,
  };
  return getMovementMembershipSnapshot();
}

export function hydrateMovementMembershipFromWallet(wallet: WalletData | null | undefined) {
  hydrateCachedSnapshot(wallet);
  return getMovementMembershipSnapshot();
}

export function getMembershipCorridor(routeId?: string | null): CorridorOpportunity | null {
  if (!routeId) {return getCorridorOpportunityById(DEFAULT_CORRIDOR_ID);}
  return getCorridorOpportunityById(routeId);
}

export function __resetMovementMembershipForTests() {
  cachedSnapshot = { ...DEFAULT_SNAPSHOT };
}
