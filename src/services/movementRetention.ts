import type { WaselUser } from '../contexts/LocalAuth';
import {
  enqueueDirectAutomationJob,
  getDirectRouteReminders,
  markDirectRouteReminderDelivered,
  upsertDirectRouteReminder,
} from './directSupabase';
import { isEdgeFunctionAvailable } from './core';
import { notificationsAPI } from './notifications.js';
import { getDemandAlerts } from './demandCapture';
import { getGrowthEventFeed } from './growthEngine';
import type { MovementPriceQuote } from './movementPricing';
import { buildRouteIntelligenceSnapshot, type LiveCorridorSignal } from './routeDemandIntelligence';
import { getRideBookings } from './rideLifecycle';
import { routeMatchesLocationPair } from '../utils/jordanLocations';

const REMINDER_KEY = 'wasel-route-reminders';

export type ReminderFrequency = 'weekdays' | 'daily' | 'weekly';

export interface RouteReminder {
  id: string;
  backendId?: string;
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
  syncedAt?: string;
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

function readReminders(): RouteReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REMINDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as RouteReminder[] : [];
  } catch {
    return [];
  }
}

function writeReminders(reminders: RouteReminder[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders.slice(0, 30)));
}

function sortReminders(reminders: RouteReminder[]) {
  return [...reminders].sort((left, right) => new Date(left.nextReminderAt).getTime() - new Date(right.nextReminderAt).getTime());
}

function upsertReminders(reminders: RouteReminder[]) {
  const merged = [...readReminders()];
  for (const reminder of reminders) {
    const index = merged.findIndex((item) =>
      item.id === reminder.id ||
      (item.backendId && reminder.backendId && item.backendId === reminder.backendId) ||
      item.corridorId === reminder.corridorId,
    );
    if (index >= 0) {
      merged[index] = { ...merged[index], ...reminder };
    } else {
      merged.unshift(reminder);
    }
  }
  writeReminders(sortReminders(merged));
  return getRouteReminders();
}

function makeReminderId(corridorId: string) {
  return `route-reminder-${corridorId}`;
}

function toLocalDate(date = new Date()) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

function parseTimeParts(time: string) {
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  return {
    hours: Number.isFinite(hours) ? hours : 7,
    minutes: Number.isFinite(minutes) ? minutes : 30,
  };
}

function nextReminderDate(frequency: ReminderFrequency, preferredTime: string, fromDate = new Date()) {
  const next = toLocalDate(fromDate);
  const { hours, minutes } = parseTimeParts(preferredTime);
  next.setHours(hours, minutes, 0, 0);

  if (next.getTime() <= fromDate.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 6);
  }

  if (frequency === 'weekdays') {
    while (next.getDay() === 5 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

function inferReminderTime(hours: number[]) {
  if (hours.length === 0) return '07:30';
  const averageHour = Math.round(hours.reduce((sum, hour) => sum + hour, 0) / hours.length);
  if (averageHour <= 10) return '07:30';
  if (averageHour <= 15) return '12:30';
  return '17:30';
}

function buildReason(signal: LiveCorridorSignal, weeklyFrequency: number) {
  if (weeklyFrequency >= 5) {
    return `You repeatedly move on ${signal.label}, so Wasel should treat it like a default corridor.`;
  }
  if (signal.activeDemandAlerts > signal.activeSupply) {
    return `Demand alerts are stacking up on ${signal.label}, making this a strong recurring reminder lane.`;
  }
  return `${signal.label} keeps showing strong live demand and credit-adjusted pricing, so it is ready for a recurring nudge.`;
}

function findSignal(from: string, to: string) {
  const snapshot = buildRouteIntelligenceSnapshot();
  return snapshot.allSignals.find((item) => routeMatchesLocationPair(item.from, item.to, from, to)) ?? null;
}

function mapRemoteReminder(row: Record<string, unknown>): RouteReminder {
  return {
    id: String(row.reminder_id ?? row.id ?? ''),
    backendId: String(row.reminder_id ?? row.id ?? ''),
    corridorId: String(row.corridor_id ?? ''),
    label: String(row.label ?? ''),
    from: String(row.origin_location ?? ''),
    to: String(row.destination_location ?? ''),
    frequency: row.frequency === 'weekdays' || row.frequency === 'weekly' ? row.frequency : 'daily',
    preferredTime: String(row.preferred_time ?? '07:30'),
    nextReminderAt: String(row.next_reminder_at ?? new Date().toISOString()),
    enabled: row.enabled !== false,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    lastSentAt: String(row.last_sent_at ?? '').trim() || undefined,
    syncedAt: new Date().toISOString(),
  };
}

export function getRouteReminders() {
  return sortReminders(readReminders());
}

export async function hydrateRouteReminders(userId?: string) {
  if (!userId) return getRouteReminders();
  try {
    const remote = await getDirectRouteReminders(userId);
    const mapped = remote.map((row) => mapRemoteReminder(row as unknown as Record<string, unknown>));
    return upsertReminders(mapped);
  } catch {
    return getRouteReminders();
  }
}

export function getRouteReminderForCorridor(corridorId: string) {
  return readReminders().find((reminder) => reminder.corridorId === corridorId) ?? null;
}

export function getRecurringRouteSuggestions(limit = 4) {
  const snapshot = buildRouteIntelligenceSnapshot();
  const events = getGrowthEventFeed();
  const bookings = getRideBookings();
  const alerts = getDemandAlerts();
  const usageMap = new Map<string, { count: number; hours: number[] }>();

  const addUsage = (signal: LiveCorridorSignal | undefined | null, timestamp?: string) => {
    if (!signal) return;
    const current = usageMap.get(signal.id) ?? { count: 0, hours: [] };
    current.count += 1;
    if (timestamp) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) {
        current.hours.push(date.getHours());
      }
    }
    usageMap.set(signal.id, current);
  };

  for (const event of events) {
    addUsage(
      snapshot.allSignals.find((item) => routeMatchesLocationPair(item.from, item.to, event.from, event.to)),
      event.createdAt,
    );
  }

  for (const booking of bookings) {
    addUsage(
      snapshot.allSignals.find((item) => routeMatchesLocationPair(item.from, item.to, booking.from, booking.to)),
      booking.createdAt,
    );
  }

  for (const alert of alerts) {
    addUsage(
      snapshot.allSignals.find((item) => routeMatchesLocationPair(item.from, item.to, alert.from, alert.to)),
      alert.createdAt,
    );
  }

  const suggestions = snapshot.allSignals
    .map((signal) => {
      const usage = usageMap.get(signal.id);
      const weeklyFrequency = usage?.count ?? 0;
      const confidenceScore = Math.min(
        98,
        Math.round((signal.forecastDemandScore * 0.58) + (signal.routeOwnershipScore * 0.18) + (weeklyFrequency * 5.4)),
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
        recommendedFrequency: weeklyFrequency >= 3 ? 'weekdays' : weeklyFrequency >= 1 ? 'weekly' : 'daily',
        liveSignal: signal,
        priceQuote: signal.priceQuote,
      } satisfies RecurringRouteSuggestion;
    })
    .filter((suggestion) => suggestion.confidenceScore >= 58)
    .sort((left, right) => right.confidenceScore - left.confidenceScore);

  return suggestions.slice(0, limit);
}

export function upsertRouteReminder(args: {
  userId?: string;
  corridorId: string;
  label: string;
  from: string;
  to: string;
  preferredTime: string;
  frequency: ReminderFrequency;
}) {
  const nextReminderAt = nextReminderDate(args.frequency, args.preferredTime).toISOString();
  const nextReminder: RouteReminder = {
    id: makeReminderId(args.corridorId),
    corridorId: args.corridorId,
    label: args.label,
    from: args.from,
    to: args.to,
    preferredTime: args.preferredTime,
    frequency: args.frequency,
    nextReminderAt,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  upsertReminders([nextReminder]);

  if (args.userId) {
    void upsertDirectRouteReminder(args.userId, {
      corridorId: args.corridorId,
      label: args.label,
      from: args.from,
      to: args.to,
      preferredTime: args.preferredTime,
      frequency: args.frequency,
      nextReminderAt,
      enabled: true,
    })
      .then((remote) => {
        upsertReminders([mapRemoteReminder(remote as unknown as Record<string, unknown>)]);
        const reminderId = String(remote.reminder_id ?? '');
        return enqueueDirectAutomationJob({
          userId: args.userId,
          jobType: 'retention_nudge',
          corridorId: args.corridorId,
          from: args.from,
          to: args.to,
          payload: {
            reminderId,
            label: args.label,
            frequency: args.frequency,
            preferredTime: args.preferredTime,
          },
        }).catch(() => {});
      })
      .catch(() => {});
  }

  return nextReminder;
}

export function createReminderFromSuggestion(suggestion: RecurringRouteSuggestion, userId?: string) {
  return upsertRouteReminder({
    userId,
    corridorId: suggestion.corridorId,
    label: suggestion.label,
    from: suggestion.from,
    to: suggestion.to,
    preferredTime: suggestion.recommendedTime,
    frequency: suggestion.recommendedFrequency,
  });
}

export function formatRouteReminderSchedule(reminder: RouteReminder) {
  const label = reminder.frequency === 'weekdays'
    ? 'Weekdays'
    : reminder.frequency === 'weekly'
      ? 'Weekly'
      : 'Daily';
  return `${label} at ${reminder.preferredTime}`;
}

export async function syncRouteReminders(user?: Pick<WaselUser, 'id' | 'email' | 'phone'> | null) {
  if (user?.id && isEdgeFunctionAvailable()) {
    return [];
  }

  let reminders = readReminders();
  const now = new Date();
  const dueReminders = reminders.filter(
    (reminder) => reminder.enabled && new Date(reminder.nextReminderAt).getTime() <= now.getTime(),
  );
  if (dueReminders.length === 0) {
    return [];
  }

  const delivered: string[] = [];

  for (const reminder of dueReminders) {
    const signal = findSignal(reminder.from, reminder.to);
    const nextReminderAt = nextReminderDate(reminder.frequency, reminder.preferredTime, now).toISOString();
    reminders = reminders.map((item) => (
      item.id === reminder.id
        ? { ...item, lastSentAt: now.toISOString(), nextReminderAt }
        : item
    ));
    writeReminders(reminders);

    await notificationsAPI.createNotification({
      title: `Route reminder: ${reminder.label}`,
      message: signal
        ? `${signal.nextWaveWindow}. Live demand ${signal.forecastDemandScore}/100 and your current price is ${signal.priceQuote.finalPriceJod} JOD.`
        : 'Your recurring route is ready to check again.',
      type: 'trip_updates',
      priority: 'medium',
      action_url: `/app/find-ride?from=${encodeURIComponent(reminder.from)}&to=${encodeURIComponent(reminder.to)}&search=1`,
      channels: ['in_app', 'push', 'email', 'sms'],
      contact: {
        email: user?.email,
        phone: user?.phone,
      },
    }).catch(() => {});

    if (reminder.backendId) {
      void markDirectRouteReminderDelivered(reminder.backendId, {
        nextReminderAt,
        lastSentAt: now.toISOString(),
      }).catch(() => {});
    }

    delivered.push(reminder.id);
  }

  return delivered;
}
