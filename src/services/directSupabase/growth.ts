// ─── Growth events & demand alerts ───────────────────────────────────────────

import { getDb, toNumber } from './helpers';
import { buildUserContext } from './userContext.ts';
import type { RawDemandAlert, RawGrowthEvent } from './types';
import { normalizeJordanLocation } from '../../utils/jordanLocations';

export async function recordDirectGrowthEvent(input: {
  userId?: string;
  eventName: string;
  funnelStage: string;
  serviceType: 'ride' | 'bus' | 'package' | 'referral' | 'wallet';
  from?: string;
  to?: string;
  valueJod?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  const context = input.userId ? await buildUserContext(input.userId).catch(() => null) : null;
  const from = input.from ? normalizeJordanLocation(input.from, input.from) : null;
  const to = input.to ? normalizeJordanLocation(input.to, input.to) : null;
  const { data, error } = await db
    .from('growth_events')
    .insert({
      user_id: context?.user.id ?? null,
      event_name: input.eventName,
      funnel_stage: input.funnelStage,
      service_type: input.serviceType,
      route_from: from,
      route_to: to,
      monetary_value_jod: input.valueJod ?? 0,
      metadata: input.metadata ?? null,
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return (data as RawGrowthEvent | null) ?? null;
}

export async function createDirectDemandAlert(input: {
  from: string;
  to: string;
  date: string;
  service: 'ride' | 'bus' | 'package';
  seatsOrSlots: number;
  userId?: string;
}) {
  const db = getDb();
  const context = input.userId ? await buildUserContext(input.userId).catch(() => null) : null;
  const from = normalizeJordanLocation(input.from, input.from);
  const to = normalizeJordanLocation(input.to, input.to);
  const { data, error } = await db
    .from('demand_alerts')
    .insert({
      user_id: context?.user.id ?? null,
      origin_city: from,
      destination_city: to,
      service_type: input.service,
      requested_date: input.date,
      seats_or_slots: input.seatsOrSlots,
      status: 'active',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as RawDemandAlert;
}

export async function getDirectDemandAlerts(userId?: string) {
  const db = getDb();
  let query = db.from('demand_alerts').select('*').order('created_at', { ascending: false }).limit(100);
  if (userId) {
    const context = await buildUserContext(userId).catch(() => null);
    if (context?.user.id) query = query.eq('user_id', context.user.id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? (data as RawDemandAlert[]) : [];
}

export async function getDirectGrowthAnalytics(userId?: string) {
  const db = getDb();
  const context = userId ? await buildUserContext(userId).catch(() => null) : null;

  let eventsQuery = db.from('growth_events').select('*').order('created_at', { ascending: false }).limit(500);
  if (context?.user.id) eventsQuery = eventsQuery.eq('user_id', context.user.id);
  const { data: events } = await eventsQuery;

  let demandQuery = db.from('demand_alerts').select('*').order('created_at', { ascending: false }).limit(200);
  if (context?.user.id) demandQuery = demandQuery.eq('user_id', context.user.id);
  const { data: alerts } = await demandQuery;

  const rows = Array.isArray(events) ? (events as RawGrowthEvent[]) : [];
  const alertRows = Array.isArray(alerts) ? (alerts as RawDemandAlert[]) : [];

  const funnel = {
    searched: rows.filter((r) => r.funnel_stage === 'searched').length,
    selected: rows.filter((r) => r.funnel_stage === 'selected').length,
    booked: rows.filter((r) => r.funnel_stage === 'booked').length,
    completed: rows.filter((r) => r.funnel_stage === 'completed').length,
  };
  const serviceMix = {
    rides: rows.filter((r) => r.service_type === 'ride').length,
    buses: rows.filter((r) => r.service_type === 'bus').length,
    packages: rows.filter((r) => r.service_type === 'package').length,
    referrals: rows.filter((r) => r.service_type === 'referral').length,
  };
  const revenueJod = rows.reduce((sum, r) => sum + toNumber(r.monetary_value_jod, 0), 0);

  const corridorMap = new Map<string, { corridor: string; demand: number; conversions: number }>();
  for (const row of rows) {
    const corridor = [row.route_from, row.route_to].filter(Boolean).join(' to ');
    if (!corridor) continue;
    const current = corridorMap.get(corridor) ?? { corridor, demand: 0, conversions: 0 };
    current.conversions += row.funnel_stage === 'booked' ? 1 : 0;
    corridorMap.set(corridor, current);
  }
  for (const row of alertRows) {
    const corridor = `${String(row.origin_city ?? '')} to ${String(row.destination_city ?? '')}`.trim();
    if (!corridor || corridor === 'to') continue;
    const current = corridorMap.get(corridor) ?? { corridor, demand: 0, conversions: 0 };
    current.demand += 1;
    corridorMap.set(corridor, current);
  }

  return {
    funnel,
    serviceMix,
    revenueJod,
    activeDemand: alertRows.filter((r) => String(r.status ?? 'active') === 'active').length,
    topCorridors: Array.from(corridorMap.values())
      .sort((a, b) => b.demand + b.conversions - (a.demand + a.conversions))
      .slice(0, 6),
  };
}
