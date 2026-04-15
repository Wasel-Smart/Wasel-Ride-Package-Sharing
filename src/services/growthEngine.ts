import {
  createDirectPricingSnapshot,
  enqueueDirectAutomationJob,
  getDirectGrowthAnalytics,
  getDirectReferralSnapshot,
  recordDirectGrowthEvent,
  redeemDirectReferralCode,
} from './directSupabase';
import {
  buildJordanCorridorKey,
  getJordanRouteScope,
  normalizeJordanLocation,
} from '../utils/jordanLocations';
import { getAutomationJobRunAfter } from '../utils/automationScheduling';
import {
  GROWTH_CONTRACT_VERSION,
  growthDashboardSchema,
  growthEventFeedSchema,
  growthEventRecordSchema,
  referralSnapshotSchema,
} from '../contracts/growth';
import { parseContract } from '../contracts/validation';
import { allowLocalPersistenceFallback } from './runtimePolicy';

export interface ReferralSnapshot {
  code: string;
  invited: number;
  converted: number;
  pendingCredit: number;
  earnedCredit: number;
  shareUrl: string;
}

export interface GrowthDashboard {
  funnel: {
    searched: number;
    selected: number;
    booked: number;
    completed: number;
  };
  serviceMix: {
    rides: number;
    buses: number;
    packages: number;
    referrals: number;
  };
  revenueJod: number;
  activeDemand: number;
  topCorridors: Array<{
    corridor: string;
    demand: number;
    conversions: number;
  }>;
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

const LOCAL_REFERRAL_KEY = 'wasel-referral-snapshot';
const LOCAL_GROWTH_EVENTS_KEY = 'wasel-growth-events';
const LOCAL_DEMAND_KEY = 'wasel-demand-alerts';

function buildFallbackCode(userId?: string, name?: string) {
  const seed = (name || userId || 'wasel').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  return `WASEL-${seed || 'MOVE'}`;
}

function readLocalSnapshots(): Record<string, ReferralSnapshot> {
  if (!allowLocalPersistenceFallback()) return {};
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_REFERRAL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, ReferralSnapshot>>(
      (acc, [key, value]) => {
        try {
          acc[key] = parseContract(
            referralSnapshotSchema,
            value,
            'growth.referral.local',
            GROWTH_CONTRACT_VERSION,
          );
        } catch {
          // Ignore corrupted local snapshots and keep the valid set.
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeLocalSnapshots(snapshots: Record<string, ReferralSnapshot>) {
  if (!allowLocalPersistenceFallback()) return;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_REFERRAL_KEY, JSON.stringify(snapshots));
}

function readLocalGrowthEvents(): GrowthEventRecord[] {
  if (!allowLocalPersistenceFallback()) return [];
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_GROWTH_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parseContract(
      growthEventFeedSchema,
      Array.isArray(parsed) ? parsed : [],
      'growth.events.local',
      GROWTH_CONTRACT_VERSION,
    );
  } catch {
    return [];
  }
}

function writeLocalGrowthEvents(events: GrowthEventRecord[]) {
  if (!allowLocalPersistenceFallback()) return;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    LOCAL_GROWTH_EVENTS_KEY,
    JSON.stringify(
      parseContract(
        growthEventFeedSchema,
        events.slice(0, 300),
        'growth.events.local',
        GROWTH_CONTRACT_VERSION,
      ),
    ),
  );
}

export function getGrowthEventFeed(): GrowthEventRecord[] {
  if (!allowLocalPersistenceFallback()) {
    return [];
  }

  return readLocalGrowthEvents()
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function readLocalDemandAlerts(): Array<{
  from: string;
  to: string;
  status: string;
  service: 'ride' | 'bus' | 'package';
}> {
  if (!allowLocalPersistenceFallback()) return [];
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_DEMAND_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeRouteInput(from?: string, to?: string) {
  const normalizedFrom = from ? normalizeJordanLocation(from, from) : undefined;
  const normalizedTo = to ? normalizeJordanLocation(to, to) : undefined;
  return {
    from: normalizedFrom,
    to: normalizedTo,
    corridorKey: normalizedFrom && normalizedTo ? buildJordanCorridorKey(normalizedFrom, normalizedTo) : undefined,
    routeScope: normalizedFrom && normalizedTo ? getJordanRouteScope(normalizedFrom, normalizedTo) : undefined,
  };
}

function mapAutomationJobType(input: {
  eventName: string;
  funnelStage: string;
  serviceType: 'ride' | 'bus' | 'package' | 'referral' | 'wallet';
}) {
  if (input.eventName.includes('support') || input.funnelStage === 'cancelled') return 'support_follow_up';
  if (input.funnelStage === 'searched') return 'demand_recovery';
  if (input.funnelStage === 'selected') return 'corridor_conversion';
  if (input.funnelStage === 'booked' || input.funnelStage === 'completed') return 'pricing_refresh';
  return 'revenue_observe';
}

export async function trackGrowthEvent(input: {
  userId?: string;
  eventName: string;
  funnelStage: string;
  serviceType: 'ride' | 'bus' | 'package' | 'referral' | 'wallet';
  from?: string;
  to?: string;
  valueJod?: number;
  metadata?: Record<string, unknown>;
}) {
  const route = normalizeRouteInput(input.from, input.to);
  const localRecord = parseContract(
    growthEventRecordSchema,
    {
      eventName: input.eventName,
      funnelStage: input.funnelStage,
      serviceType: input.serviceType,
      from: route.from,
      to: route.to,
      valueJod: input.valueJod,
      createdAt: new Date().toISOString(),
    },
    'growth.event',
    GROWTH_CONTRACT_VERSION,
  );

  if (allowLocalPersistenceFallback()) {
    writeLocalGrowthEvents([localRecord, ...readLocalGrowthEvents()]);
  }

  try {
    await recordDirectGrowthEvent({
      ...input,
      from: route.from,
      to: route.to,
      metadata: {
        ...input.metadata,
        corridorKey: route.corridorKey,
        routeScope: route.routeScope,
      },
    });

    if (input.userId && route.from && route.to) {
      const jobType = mapAutomationJobType(input);
      await enqueueDirectAutomationJob({
        userId: input.userId,
        jobType,
        from: route.from,
        to: route.to,
        payload: {
          eventName: input.eventName,
          funnelStage: input.funnelStage,
          serviceType: input.serviceType,
          valueJod: input.valueJod ?? null,
          corridorKey: route.corridorKey,
          pricePressure: typeof input.metadata?.pricePressure === 'string' ? input.metadata.pricePressure : null,
          priceQuote: (input.metadata?.priceQuote as Record<string, unknown> | undefined) ?? null,
        },
        runAfter: getAutomationJobRunAfter(jobType),
      }).catch(() => {});
    }

    const priceQuote = input.metadata?.priceQuote as Record<string, unknown> | undefined;
    const basePrice = Number(priceQuote?.basePriceJod ?? input.valueJod ?? 0);
    const finalPrice = Number(priceQuote?.finalPriceJod ?? input.valueJod ?? 0);
    if (route.from && route.to && Number.isFinite(basePrice) && Number.isFinite(finalPrice) && finalPrice > 0) {
      await createDirectPricingSnapshot({
        userId: input.userId,
        corridorId: typeof input.metadata?.corridorId === 'string' ? input.metadata.corridorId : null,
        from: route.from,
        to: route.to,
        basePriceJod: basePrice,
        finalPriceJod: finalPrice,
        demandScore: Number(priceQuote?.forecastDemandScore ?? input.metadata?.demandScore ?? 0) || undefined,
        pricePressure: typeof input.metadata?.pricePressure === 'string' ? input.metadata.pricePressure : undefined,
        sourceContext: input.eventName,
        metadata: {
          eventName: input.eventName,
          funnelStage: input.funnelStage,
          serviceType: input.serviceType,
        },
      }).catch(() => {});
    }
  } catch {
    // Protected environments fail closed by skipping local analytics fallback.
  }
}

export async function getReferralSnapshot(user?: { id?: string; name?: string } | null): Promise<ReferralSnapshot | null> {
  if (!user?.id) return null;

  const shareUrlBase =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://wasel14.online';

  try {
    const remote = await getDirectReferralSnapshot(user.id);
    const snapshot = parseContract(
      referralSnapshotSchema,
      {
      ...remote,
      shareUrl: `${shareUrlBase}/app/auth?ref=${encodeURIComponent(remote.code)}`,
      },
      'growth.referral.snapshot',
      GROWTH_CONTRACT_VERSION,
    );
    const snapshots = readLocalSnapshots();
    snapshots[user.id] = snapshot;
    writeLocalSnapshots(snapshots);
    return snapshot;
  } catch {
    if (!allowLocalPersistenceFallback()) {
      return null;
    }

    const snapshots = readLocalSnapshots();
    const existing = snapshots[user.id];
    if (existing) return existing;

    const fallbackCode = buildFallbackCode(user.id, user.name);
    const fallback = parseContract(
      referralSnapshotSchema,
      {
        code: fallbackCode,
        invited: 0,
        converted: 0,
        pendingCredit: 0,
        earnedCredit: 0,
        shareUrl: `${shareUrlBase}/app/auth?ref=${encodeURIComponent(fallbackCode)}`,
      },
      'growth.referral.synthetic',
      GROWTH_CONTRACT_VERSION,
    );
    snapshots[user.id] = fallback;
    writeLocalSnapshots(snapshots);
    return fallback;
  }
}

export async function applyReferralCode(user: { id?: string; name?: string } | null | undefined, code: string) {
  if (!user?.id) {
    throw new Error('Sign in to redeem a referral code.');
  }

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('Enter a referral code first.');
  }

  try {
    await redeemDirectReferralCode(user.id, normalizedCode);
  } finally {
    await trackGrowthEvent({
      userId: user.id,
      eventName: 'referral_attempted',
      funnelStage: 'redeemed',
      serviceType: 'referral',
      metadata: { code: normalizedCode },
    }).catch(() => {});
  }

  return getReferralSnapshot(user);
}

export async function getGrowthDashboard(userId?: string): Promise<GrowthDashboard> {
  try {
    return parseContract(
      growthDashboardSchema,
      await getDirectGrowthAnalytics(userId),
      'growth.dashboard',
      GROWTH_CONTRACT_VERSION,
    );
  } catch (error) {
    if (!allowLocalPersistenceFallback()) {
      throw error;
    }

    const events = readLocalGrowthEvents();
    const alerts = readLocalDemandAlerts();
    const corridorMap = new Map<string, { corridor: string; demand: number; conversions: number }>();

    for (const event of events) {
      const corridor = [event.from, event.to].filter(Boolean).join(' to ');
      if (corridor) {
        const current = corridorMap.get(corridor) ?? { corridor, demand: 0, conversions: 0 };
        current.conversions += event.funnelStage === 'booked' ? 1 : 0;
        corridorMap.set(corridor, current);
      }
    }

    for (const alert of alerts) {
      const corridor = `${alert.from} to ${alert.to}`;
      const current = corridorMap.get(corridor) ?? { corridor, demand: 0, conversions: 0 };
      current.demand += 1;
      corridorMap.set(corridor, current);
    }

    return parseContract(
      growthDashboardSchema,
      {
      funnel: {
        searched: events.filter((event) => event.funnelStage === 'searched').length,
        selected: events.filter((event) => event.funnelStage === 'selected').length,
        booked: events.filter((event) => event.funnelStage === 'booked').length,
        completed: events.filter((event) => event.funnelStage === 'completed').length,
      },
      serviceMix: {
        rides: events.filter((event) => event.serviceType === 'ride').length,
        buses: events.filter((event) => event.serviceType === 'bus').length,
        packages: events.filter((event) => event.serviceType === 'package').length,
        referrals: events.filter((event) => event.serviceType === 'referral').length,
      },
      revenueJod: events.reduce((sum, event) => sum + Number(event.valueJod ?? 0), 0),
      activeDemand: alerts.filter((alert) => alert.status === 'active').length,
      topCorridors: Array.from(corridorMap.values()).sort((a, b) => (b.demand + b.conversions) - (a.demand + a.conversions)).slice(0, 6),
      },
      'growth.dashboard.local',
      GROWTH_CONTRACT_VERSION,
    );
  }
}

export function getCorridorDemandLeaders(limit = 3) {
  if (!allowLocalPersistenceFallback()) {
    return [];
  }

  const alerts = readLocalDemandAlerts();
  const corridorMap = new Map<string, { corridor: string; active: number; serviceLabel: string }>();

  for (const alert of alerts.filter((item) => item.status === 'active')) {
    const key = `${alert.from} to ${alert.to}`;
    const existing = corridorMap.get(key);
    corridorMap.set(key, {
      corridor: key,
      active: (existing?.active ?? 0) + 1,
      serviceLabel:
        alert.service === 'bus'
          ? 'Bus demand'
          : alert.service === 'package'
            ? 'Package demand'
            : 'Ride demand',
    });
  }

  return Array.from(corridorMap.values())
    .sort((left, right) => right.active - left.active)
    .slice(0, limit);
}
