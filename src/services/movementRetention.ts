/**
 * movementRetention.ts
 *
 * Architecture:
 *  - Supabase `route_reminders` table is the PRIMARY store.
 *  - In-memory cache provides instant reads after the first hydration.
 *  - localStorage is NOT used for reminders (cross-device sync requirement).
 *  - Writes go to Supabase first. Failures are surfaced, not swallowed.
 */

import { unsafeSupabase } from '../utils/supabase/client';
import { logger } from '../utils/monitoring';
import { notificationsAPI } from './notifications';
import { getDemandAlerts } from './demandCapture';
import { getGrowthEventFeed } from './growthEngine';
import type { MovementPriceQuote } from './movementPricing';
import { buildRouteIntelligenceSnapshot, type LiveCorridorSignal } from './routeDemandIntelligence';
import { getRideBookings } from './rideLifecycle';
import type { WaselUser } from '../contexts/LocalAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReminderFrequency = 'weekdays' | 'daily' | 'weekly';

export interface RouteReminder {
  id: string;
  corridorId: string;
  label: string;
  from: string;
  to: string;
  frequency: ReminderFrequency;
  preferredTime: string;
  nextReminderAt: string;
  enabled: boolean;
  createdAt: string;
  lastSentAt?: string;
  userId?: string;
}

export interface RecurringRouteSuggestion {
  corridorId: string;
  label: string;
  from: string;
  to: string;
  confidenceScore: number;
  weeklyFrequency: number;
  reason: string;
  recommendedTime: string;
  recommendedFrequency: ReminderFrequency;
  liveSignal: LiveCorridorSignal;
  priceQuote: MovementPriceQuote;
}

// ── In-memory cache ───────────────────────────────────────────────────────────

const reminderCache: RouteReminder[] = [];

function upsertReminderCache(reminders: RouteReminder[]): void {
  const byId = new Map(reminderCache.map(r => [r.id, r]));
  for (const r of reminders) byId.set(r.id, r);
  reminderCache.splice(0, reminderCache.length, ...Array.from(byId.values()).slice(0, 30));
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseTimeParts(time: string) {
  const [hours = 7, minutes = 30] = time.split(':').map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 7,
    minutes: Number.isFinite(minutes) ? minutes : 30,
  };
}

function nextReminderDate(frequency: ReminderFrequency, preferredTime: string, fromDate = new Date()) {
  const next = new Date(fromDate);
  const { hours, minutes } = parseTimeParts(preferredTime);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= fromDate.getTime()) next.setDate(next.getDate() + 1);
  if (frequency === 'weekly') next.setDate(next.getDate() + 6);
  if (frequency === 'weekdays') {
    while (next.getDay() === 5 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  }
  return next;
}

function inferReminderTime(hours: number[]): string {
  if (!hours.length) return '07:30';
  const avg = Math.round(hours.reduce((s, h) => s + h, 0) / hours.length);
  if (avg <= 10) return '07:30';
  if (avg <= 15) return '12:30';
  return '17:30';
}

function buildReason(signal: LiveCorridorSignal, weeklyFrequency: number): string {
  if (weeklyFrequency >= 5) return `You repeatedly move on ${signal.label}, so Wasel treats it as your default corridor.`;
  if (signal.activeDemandAlerts > signal.activeSupply) return `Demand alerts are stacking up on ${signal.label} — a strong signal for a recurring nudge.`;
  return `${signal.label} shows strong live demand and credit-adjusted pricing.`;
}

// ── Row normalizer ────────────────────────────────────────────────────────────

function rowToReminder(row: Record<string, unknown>): RouteReminder {
  return {
    id: String(row.id ?? ''),
    corridorId: String(row.corridor_id ?? ''),
    label: String(row.label ?? ''),
    from: String(row.origin_city ?? ''),
    to: String(row.destination_city ?? ''),
    frequency: (row.frequency as ReminderFrequency) ?? 'weekly',
    preferredTime: String(row.preferred_time ?? '07:30'),
    nextReminderAt: String(row.next_reminder_at ?? new Date().toISOString()),
    enabled: Boolean(row.enabled ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    lastSentAt: String(row.last_sent_at ?? '').trim() || undefined,
    userId: String(row.user_id ?? '').trim() || undefined,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load reminders from Supabase into the in-memory cache.
 */
export async function hydrateRouteReminders(userId: string): Promise<RouteReminder[]> {
  try {
    const { data, error } = await unsafeSupabase
      .from('route_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('next_reminder_at', { ascending: true });

    if (error) throw error;
    const reminders = (data ?? []).map((row: Record<string, unknown>) => rowToReminder(row));
    upsertReminderCache(reminders);
    return getRouteReminders();
  } catch (err) {
    logger.warning('[movementRetention] hydrateRouteReminders failed', { userId, err });
    return getRouteReminders();
  }
}

/** Synchronous read from in-memory cache. */
export function getRouteReminders(): RouteReminder[] {
  return [...reminderCache].sort(
    (a, b) => new Date(a.nextReminderAt).getTime() - new Date(b.nextReminderAt).getTime(),
  );
}

/** Look up a reminder for a specific corridor. */
export function getRouteReminderForCorridor(corridorId: string): RouteReminder | null {
  return reminderCache.find(r => r.corridorId === corridorId) ?? null;
}

/**
 * Upsert a route reminder in Supabase.
 * Throws on Supabase failure.
 */
export async function upsertRouteReminder(
  userId: string,
  args: {
    corridorId: string;
    label: string;
    from: string;
    to: string;
    preferredTime: string;
    frequency: ReminderFrequency;
  },
): Promise<RouteReminder> {
  const nextReminderAt = nextReminderDate(args.frequency, args.preferredTime).toISOString();

  const payload = {
    user_id: userId,
    corridor_id: args.corridorId,
    label: args.label,
    origin_city: args.from,
    destination_city: args.to,
    frequency: args.frequency,
    preferred_time: args.preferredTime,
    next_reminder_at: nextReminderAt,
    enabled: true,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await unsafeSupabase
      .from('route_reminders')
      .upsert(payload, { onConflict: 'user_id,corridor_id' })
      .select()
      .single();

    if (error) throw error;
    const reminder = rowToReminder(data as Record<string, unknown>);
    upsertReminderCache([reminder]);
    return reminder;
  } catch (err) {
    logger.error('[movementRetention] upsertRouteReminder failed', { userId, args, err });
    throw new Error('Could not save reminder. Please check your connection and try again.');
  }
}

export async function createReminderFromSuggestion(
  userId: string,
  suggestion: RecurringRouteSuggestion,
): Promise<RouteReminder> {
  return upsertRouteReminder(userId, {
    corridorId: suggestion.corridorId,
    label: suggestion.label,
    from: suggestion.from,
    to: suggestion.to,
    preferredTime: suggestion.recommendedTime,
    frequency: suggestion.recommendedFrequency,
  });
}

export function formatRouteReminderSchedule(reminder: RouteReminder): string {
  const label =
    reminder.frequency === 'weekdays' ? 'Weekdays'
    : reminder.frequency === 'weekly' ? 'Weekly'
    : 'Daily';
  return `${label} at ${reminder.preferredTime}`;
}

/** Compute recurring route suggestions from signal + event data. */
export function getRecurringRouteSuggestions(limit = 4): RecurringRouteSuggestion[] {
  const snapshot = buildRouteIntelligenceSnapshot();
  const events = getGrowthEventFeed();
  const bookings = getRideBookings();
  const alerts = getDemandAlerts();
  const usageMap = new Map<string, { count: number; hours: number[] }>();

  const addUsage = (signal: LiveCorridorSignal | undefined, timestamp?: string) => {
    if (!signal) return;
    const current = usageMap.get(signal.id) ?? { count: 0, hours: [] };
    current.count += 1;
    if (timestamp) {
      const d = new Date(timestamp);
      if (!Number.isNaN(d.getTime())) current.hours.push(d.getHours());
    }
    usageMap.set(signal.id, current);
  };

  for (const event of events) {
    const signal = snapshot.allSignals.find(s => s.from === event.from && s.to === event.to)
      ?? snapshot.allSignals.find(s => s.from === event.to && s.to === event.from);
    addUsage(signal, event.createdAt);
  }
  for (const b of bookings) {
    const signal = snapshot.allSignals.find(s => s.from === b.from && s.to === b.to)
      ?? snapshot.allSignals.find(s => s.from === b.to && s.to === b.from);
    addUsage(signal, b.createdAt);
  }
  for (const a of alerts) {
    const signal = snapshot.allSignals.find(s => s.from === a.from && s.to === a.to)
      ?? snapshot.allSignals.find(s => s.from === a.to && s.to === a.from);
    addUsage(signal, a.createdAt);
  }

  return snapshot.allSignals
    .map(signal => {
      const usage = usageMap.get(signal.id);
      const weeklyFrequency = usage?.count ?? 0;
      const confidenceScore = Math.min(
        98,
        Math.round(signal.forecastDemandScore * 0.58 + signal.routeOwnershipScore * 0.18 + weeklyFrequency * 5.4),
      );
      return {
        corridorId: signal.id,
        label: signal.label,
        from: signal.from,
        to: signal.to,
        confidenceScore,
        weeklyFrequency,
        reason: buildReason(signal, weeklyFrequency),
        recommendedTime: inferReminderTime(usage?.hours ?? []),
        recommendedFrequency: (weeklyFrequency >= 3 ? 'weekdays' : weeklyFrequency >= 1 ? 'weekly' : 'daily') as ReminderFrequency,
        liveSignal: signal,
        priceQuote: signal.priceQuote,
      } satisfies RecurringRouteSuggestion;
    })
    .filter(s => s.confidenceScore >= 58)
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, limit);
}

/** Fire due reminders and return IDs of delivered ones. */
export async function syncRouteReminders(
  userId: string,
  user?: Pick<WaselUser, 'email' | 'phone'> | null,
): Promise<string[]> {
  const now = new Date();
  const due = reminderCache.filter(
    reminder =>
      reminder.userId === userId &&
      reminder.enabled &&
      new Date(reminder.nextReminderAt).getTime() <= now.getTime(),
  );
  if (!due.length) return [];

  const delivered: string[] = [];

  for (const reminder of due) {
    const signal = buildRouteIntelligenceSnapshot({ from: reminder.from, to: reminder.to }).selectedSignal;
    const nextReminderAt = nextReminderDate(reminder.frequency, reminder.preferredTime, now).toISOString();

    try {
      // Update Supabase
      const { error } = await unsafeSupabase
        .from('route_reminders')
        .update({
          last_sent_at: now.toISOString(),
          next_reminder_at: nextReminderAt,
          updated_at: now.toISOString(),
        })
        .eq('id', reminder.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update in-memory cache
      upsertReminderCache([{ ...reminder, lastSentAt: now.toISOString(), nextReminderAt }]);

      // Fire notification
      await notificationsAPI.createNotification({
        title: `Route reminder: ${reminder.label}`,
        message: signal
          ? `${signal.nextWaveWindow}. Live demand ${signal.forecastDemandScore}/100, price ${signal.priceQuote.finalPriceJod} JOD.`
          : `Your recurring route is ready to check again.`,
        type: 'trip_updates',
        priority: 'medium',
        action_url: `/app/find-ride?from=${encodeURIComponent(reminder.from)}&to=${encodeURIComponent(reminder.to)}&search=1`,
        channels: ['in_app', 'push', 'email', 'sms'],
        contact: { email: user?.email, phone: user?.phone },
      }).catch(() => {});

      delivered.push(reminder.id);
    } catch (err) {
      logger.warning('[movementRetention] syncRouteReminders reminder failed', { reminderId: reminder.id, err });
    }
  }

  return delivered;
}

/** Clear the cache on sign-out. */
export function clearRouteRemindersCache(): void {
  reminderCache.splice(0);
}
