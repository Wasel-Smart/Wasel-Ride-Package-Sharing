export type BusinessEventName =
  | 'ride_created'
  | 'ride_requested'
  | 'ride_matching'
  | 'ride_driver_assigned'
  | 'ride_driver_arriving'
  | 'ride_in_progress'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'ride_failed'
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_refunded'
  | 'payment_webhook_received'
  | 'package_created'
  | 'package_picked_up'
  | 'package_delivered'
  | 'package_failed'
  | 'user_registered'
  | 'user_verified'
  | 'driver_onboarded'
  | 'wallet_topup'
  | 'wallet_withdrawal'
  | 'wallet_transfer'
  | 'bus_ticket_booked'
  | 'bus_ticket_cancelled';

export interface EventCount {
  event_name: string;
  count: number;
}

type StoredBusinessEvent = {
  event_name: BusinessEventName;
  user_id: string | null;
  session_id: string;
  created_at: string;
  properties: Record<string, unknown>;
};

const BUSINESS_EVENT_STORAGE_KEY = 'wasel-business-events';
const inMemoryEvents: StoredBusinessEvent[] = [];
let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) {
    return sessionId;
  }

  if (typeof sessionStorage !== 'undefined') {
    const existing = sessionStorage.getItem('wasel_session_id');
    if (existing) {
      sessionId = existing;
      return existing;
    }

    const next = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('wasel_session_id', next);
    sessionId = next;
    return next;
  }

  sessionId = `srv_${Date.now()}`;
  return sessionId;
}

function readPersistedEvents(): StoredBusinessEvent[] {
  if (typeof window === 'undefined') {
    return inMemoryEvents;
  }

  try {
    const raw = window.localStorage.getItem(BUSINESS_EVENT_STORAGE_KEY);
    if (!raw) {
      return inMemoryEvents;
    }

    const parsed = JSON.parse(raw) as StoredBusinessEvent[];
    return Array.isArray(parsed) ? parsed : inMemoryEvents;
  } catch {
    return inMemoryEvents;
  }
}

function persistEvents(events: StoredBusinessEvent[]): void {
  inMemoryEvents.splice(0, inMemoryEvents.length, ...events.slice(-500));

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(BUSINESS_EVENT_STORAGE_KEY, JSON.stringify(inMemoryEvents));
  } catch {
    // Analytics persistence is non-critical.
  }
}

export async function trackBusinessEvent(
  eventName: BusinessEventName,
  userId?: string | null,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const events = readPersistedEvents();
  events.push({
    event_name: eventName,
    user_id: userId ?? null,
    session_id: getSessionId(),
    created_at: new Date().toISOString(),
    properties: {
      ...properties,
      _ts: Date.now(),
      _version: '1.0',
    },
  });
  persistEvents(events);
}

export async function getEventCounts(days = 7): Promise<EventCount[]> {
  const since = Date.now() - days * 86_400_000;
  const counts = readPersistedEvents()
    .filter((event) => new Date(event.created_at).getTime() >= since)
    .reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.event_name] = (accumulator[event.event_name] ?? 0) + 1;
      return accumulator;
    }, {});

  return Object.entries(counts)
    .map(([event_name, count]) => ({ event_name, count }))
    .sort((left, right) => right.count - left.count);
}
