/**
 * demandCapture.ts
 *
 * Architecture:
 *  - Supabase `demand_alerts` table is the PRIMARY store.
 *  - A small in-memory cache (max 100 alerts) provides instant UI reads post-hydration.
 *  - localStorage is NOT used. Cache lives in module scope and resets on page load.
 *  - createDemandAlert writes to Supabase first. If Supabase fails, the alert is not created
 *    (we surface the error rather than silently creating a phantom alert).
 *
 * This design ensures alerts are durable across devices and browser clears.
 */

import { createDirectDemandAlert, getDirectDemandAlerts } from './directSupabase';
import { trackGrowthEvent } from './growthEngine';
import { logger } from '../utils/monitoring';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DemandService = 'ride' | 'bus' | 'package';
export type DemandStatus = 'active' | 'matched' | 'expired';

export interface DemandAlert {
  id: string;
  from: string;
  to: string;
  date: string;
  service: DemandService;
  seatsOrSlots: number;
  status: DemandStatus;
  createdAt: string;
  syncedAt?: string;
  backendId?: string;
}

// ── In-memory cache ───────────────────────────────────────────────────────────

const CACHE_MAX = 100;
const alertCache: DemandAlert[] = [];

function upsertCache(incoming: DemandAlert[]): void {
  const byId = new Map(alertCache.map(a => [a.id, a]));
  for (const alert of incoming) {
    byId.set(alert.id, alert);
  }
  alertCache.splice(0, alertCache.length, ...Array.from(byId.values()).slice(0, CACHE_MAX));
}

// ── Normalizer ────────────────────────────────────────────────────────────────

function normalizeRemote(raw: Record<string, unknown>): DemandAlert {
  return {
    id: String(raw.id ?? `demand-${Date.now()}`),
    backendId: String(raw.id ?? ''),
    from: String(raw.origin_city ?? raw.from ?? ''),
    to: String(raw.destination_city ?? raw.to ?? ''),
    date: String(raw.requested_date ?? raw.date ?? '').slice(0, 10),
    service:
      raw.service_type === 'bus' || raw.service_type === 'package'
        ? raw.service_type
        : 'ride',
    seatsOrSlots: Math.max(1, Number(raw.seats_or_slots ?? 1)),
    status:
      raw.status === 'matched' || raw.status === 'expired'
        ? raw.status
        : 'active',
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    syncedAt: new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Hydrate the in-memory cache from Supabase.
 * Should be called on app mount and after auth state changes.
 */
export async function hydrateDemandAlerts(userId?: string): Promise<DemandAlert[]> {
  try {
    const remote = await getDirectDemandAlerts(userId);
    const normalized = remote.map(item => normalizeRemote(item as Record<string, unknown>));
    upsertCache(normalized);
    return getDemandAlerts();
  } catch (err) {
    logger.warning('[demandCapture] hydrateDemandAlerts failed', { userId, err });
    return getDemandAlerts();
  }
}

/**
 * Get demand alerts from the in-memory cache.
 * Always call hydrateDemandAlerts() first for authoritative data.
 */
export function getDemandAlerts(): DemandAlert[] {
  return [...alertCache].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Create a demand alert.
 * Primary path: write to Supabase.
 * Throws on Supabase failure — do not silently create phantom alerts.
 */
export async function createDemandAlert(input: {
  from: string;
  to: string;
  date: string;
  service: DemandService;
  seatsOrSlots?: number;
  userId?: string;
}): Promise<DemandAlert> {
  // Idempotency: check in-memory cache first
  const existing = alertCache.find(
    item =>
      item.from === input.from &&
      item.to === input.to &&
      item.date === input.date &&
      item.service === input.service &&
      item.status === 'active',
  );
  if (existing) return existing;

  const seatsOrSlots = Math.max(1, input.seatsOrSlots ?? 1);

  // Write to Supabase (primary store)
  let remote: Record<string, unknown>;
  try {
    remote = await createDirectDemandAlert({
      from: input.from,
      to: input.to,
      date: input.date,
      service: input.service,
      seatsOrSlots,
      userId: input.userId,
    });
  } catch (err) {
    logger.error('[demandCapture] createDemandAlert Supabase write failed', { input, err });
    throw new Error('Could not save demand alert. Please check your connection and try again.');
  }

  const alert = normalizeRemote({
    ...remote,
    origin_city: input.from,
    destination_city: input.to,
    requested_date: input.date,
    service_type: input.service,
    seats_or_slots: seatsOrSlots,
  });

  upsertCache([alert]);

  void trackGrowthEvent({
    userId: input.userId,
    eventName: 'demand_alert_created',
    funnelStage: 'searched',
    serviceType: input.service,
    from: alert.from,
    to: alert.to,
    metadata: { date: alert.date, seatsOrSlots: alert.seatsOrSlots },
  }).catch(() => {});

  return alert;
}

/**
 * Aggregate stats from the in-memory cache.
 */
export function getDemandStats() {
  const active = alertCache.filter(item => item.status === 'active');
  return {
    active: active.length,
    rides: active.filter(item => item.service === 'ride').length,
    buses: active.filter(item => item.service === 'bus').length,
    packages: active.filter(item => item.service === 'package').length,
  };
}

/**
 * Clear the in-memory cache (call on sign-out).
 */
export function clearDemandAlertsCache(): void {
  alertCache.splice(0);
}
