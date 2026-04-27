import { createDirectDemandAlert, getDirectDemandAlerts } from './directSupabase';
import { trackGrowthEvent } from './growthEngine';
import {
  buildJordanCorridorKey,
  normalizeJordanLocation,
  routeMatchesLocationPair,
} from '../utils/jordanLocations';

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

const DEMAND_KEY = 'wasel-demand-alerts';

function readAlerts(): DemandAlert[] {
  if (typeof window === 'undefined') {return [];}
  try {
    const raw = window.localStorage.getItem(DEMAND_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: DemandAlert[]) {
  if (typeof window === 'undefined') {return;}
  window.localStorage.setItem(DEMAND_KEY, JSON.stringify(alerts.slice(0, 100)));
}

function syncAlerts(alerts: DemandAlert[]) {
  writeAlerts(alerts);
  return alerts;
}

function updateLocalAlert(id: string, updates: Partial<DemandAlert>) {
  const next = readAlerts().map((alert) => (alert.id === id ? { ...alert, ...updates } : alert));
  syncAlerts(next);
}

function normalizeAlertInput(input: {
  from: string;
  to: string;
  date: string;
  service: DemandService;
  seatsOrSlots?: number;
}) {
  return {
    from: normalizeJordanLocation(input.from, input.from || 'Amman'),
    to: normalizeJordanLocation(input.to, input.to || 'Aqaba'),
    date: input.date,
    service: input.service,
    seatsOrSlots: Math.max(1, input.seatsOrSlots ?? 1),
    corridorKey: buildJordanCorridorKey(input.from, input.to),
  };
}

export async function hydrateDemandAlerts(userId?: string): Promise<DemandAlert[]> {
  try {
    const remote = await getDirectDemandAlerts(userId);
    const merged = [...readAlerts()];

    for (const item of remote) {
      const normalized: DemandAlert = {
        id: String(item.id ?? `demand-${Date.now()}`),
        backendId: String(item.id ?? ''),
        from: String(item.origin_city ?? ''),
        to: String(item.destination_city ?? ''),
        date: String(item.requested_date ?? '').slice(0, 10),
        service: item.service_type === 'bus' || item.service_type === 'package' ? item.service_type : 'ride',
        seatsOrSlots: Number(item.seats_or_slots ?? 1) || 1,
        status: item.status === 'matched' || item.status === 'expired' ? item.status : 'active',
        createdAt: String(item.created_at ?? new Date().toISOString()),
        syncedAt: new Date().toISOString(),
      };

      const index = merged.findIndex((alert) =>
        alert.backendId === normalized.backendId ||
        (
          alert.from === normalized.from &&
          alert.to === normalized.to &&
          alert.date === normalized.date &&
          alert.service === normalized.service
        ),
      );

      if (index >= 0) {merged[index] = { ...merged[index], ...normalized };}
      else {merged.unshift(normalized);}
    }

    return syncAlerts(merged.slice(0, 100)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return getDemandAlerts();
  }
}

export function getDemandAlerts(): DemandAlert[] {
  return [...readAlerts()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createDemandAlert(input: {
  from: string;
  to: string;
  date: string;
  service: DemandService;
  seatsOrSlots?: number;
  userId?: string;
}): DemandAlert {
  const normalized = normalizeAlertInput(input);
  const alerts = readAlerts();
  const existing = alerts.find(
    (item) =>
      routeMatchesLocationPair(item.from, item.to, normalized.from, normalized.to, { allowReverse: false }) &&
      item.date === normalized.date &&
      item.service === normalized.service &&
      item.status === 'active',
  );
  if (existing) {return existing;}

  const alert: DemandAlert = {
    id: `demand-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    from: normalized.from,
    to: normalized.to,
    date: normalized.date,
    service: normalized.service,
    seatsOrSlots: normalized.seatsOrSlots,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  syncAlerts([alert, ...alerts]);
  void createDirectDemandAlert({
    from: alert.from,
    to: alert.to,
    date: alert.date,
    service: alert.service,
    seatsOrSlots: alert.seatsOrSlots,
    userId: input.userId,
  })
    .then((remote) => {
      updateLocalAlert(alert.id, {
        backendId: String(remote.id ?? ''),
        syncedAt: new Date().toISOString(),
      });
    })
    .catch(() => {});
  void trackGrowthEvent({
    userId: input.userId,
    eventName: 'demand_alert_created',
    funnelStage: 'searched',
    serviceType: normalized.service,
    from: alert.from,
    to: alert.to,
    metadata: {
      date: alert.date,
      seatsOrSlots: alert.seatsOrSlots,
      corridorKey: normalized.corridorKey,
    },
  });
  return alert;
}

export function getDemandStats() {
  const alerts = getDemandAlerts();
  return {
    active: alerts.filter((item) => item.status === 'active').length,
    rides: alerts.filter((item) => item.service === 'ride' && item.status === 'active').length,
    buses: alerts.filter((item) => item.service === 'bus' && item.status === 'active').length,
    packages: alerts.filter((item) => item.service === 'package' && item.status === 'active').length,
  };
}
