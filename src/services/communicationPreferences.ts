import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import {
  getDirectCommunicationPreferences,
  getDirectCommunicationDeliveries,
  queueDirectCommunicationDeliveries,
  upsertDirectCommunicationPreferences,
} from './directSupabase';
import { getConfig } from '../utils/env';

export type CommunicationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';
export type NotificationTopic =
  | 'trip_updates'
  | 'booking_requests'
  | 'messages'
  | 'promotions'
  | 'prayer_reminders'
  | 'critical_alerts';

export type CommunicationPreferences = {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  tripUpdates: boolean;
  bookingRequests: boolean;
  messages: boolean;
  promotions: boolean;
  prayerReminders: boolean;
  criticalAlerts: boolean;
  preferredLanguage: 'en' | 'ar';
};

export type CommunicationCapabilitySnapshot = {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
};

export type DeliveryQueueRequest = {
  channel: Exclude<CommunicationChannel, 'in_app' | 'push'>;
  destination: string;
  subject?: string;
  body: string;
  notificationId?: string;
  metadata?: Record<string, unknown>;
};

const PREFERENCES_KEY = 'wasel.communication.preferences';
const OUTBOX_KEY = 'wasel.communication.outbox';

export const defaultCommunicationPreferences: CommunicationPreferences = {
  inApp: true,
  push: true,
  email: true,
  sms: true,
  whatsapp: false,
  tripUpdates: true,
  bookingRequests: true,
  messages: true,
  promotions: false,
  prayerReminders: true,
  criticalAlerts: true,
  preferredLanguage: 'en',
};

function canUseEdgeApi(): boolean {
  return Boolean(API_URL);
}

function normalizePreferences(value: Partial<CommunicationPreferences> | null | undefined): CommunicationPreferences {
  return {
    ...defaultCommunicationPreferences,
    ...value,
    preferredLanguage: value?.preferredLanguage === 'ar' ? 'ar' : 'en',
  };
}

function storageKeyFor(userId: string | null | undefined) {
  return `${PREFERENCES_KEY}:${userId || 'guest'}`;
}

function readStoredPreferences(userId?: string | null): CommunicationPreferences {
  if (typeof window === 'undefined') return defaultCommunicationPreferences;

  try {
    const raw = window.localStorage.getItem(storageKeyFor(userId));
    return raw ? normalizePreferences(JSON.parse(raw) as Partial<CommunicationPreferences>) : defaultCommunicationPreferences;
  } catch {
    return defaultCommunicationPreferences;
  }
}

function writeStoredPreferences(userId: string | null | undefined, prefs: CommunicationPreferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(prefs));
}

type QueuedDeliveryRecord = DeliveryQueueRequest & {
  id: string;
  userId?: string;
  queuedAt: string;
};

function readOutbox(): QueuedDeliveryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as QueuedDeliveryRecord[] : [];
  } catch {
    return [];
  }
}

function writeOutbox(records: QueuedDeliveryRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(records.slice(0, 200)));
}

function normalizeDirectPreferences(row: Record<string, unknown> | null | undefined): CommunicationPreferences {
  return normalizePreferences({
    inApp: row?.in_app_enabled !== false,
    push: row?.push_enabled !== false,
    email: row?.email_enabled !== false,
    sms: row?.sms_enabled !== false,
    whatsapp: row?.whatsapp_enabled === true,
    tripUpdates: row?.trip_updates_enabled !== false,
    bookingRequests: row?.booking_requests_enabled !== false,
    messages: row?.messages_enabled !== false,
    promotions: row?.promotions_enabled === true,
    prayerReminders: row?.prayer_reminders_enabled !== false,
    criticalAlerts: row?.critical_alerts_enabled !== false,
    preferredLanguage: row?.preferred_language === 'ar' ? 'ar' : 'en',
  });
}

function toDirectPreferenceUpdate(prefs: Partial<CommunicationPreferences>) {
  return {
    in_app_enabled: prefs.inApp,
    push_enabled: prefs.push,
    email_enabled: prefs.email,
    sms_enabled: prefs.sms,
    whatsapp_enabled: prefs.whatsapp,
    trip_updates_enabled: prefs.tripUpdates,
    booking_requests_enabled: prefs.bookingRequests,
    messages_enabled: prefs.messages,
    promotions_enabled: prefs.promotions,
    prayer_reminders_enabled: prefs.prayerReminders,
    critical_alerts_enabled: prefs.criticalAlerts,
    preferred_language: prefs.preferredLanguage,
  };
}

export function resolveNotificationTopic(type: string): NotificationTopic {
  const normalized = type.toLowerCase();
  if (normalized.includes('promo') || normalized.includes('offer')) return 'promotions';
  if (normalized.includes('message') || normalized.includes('chat')) return 'messages';
  if (normalized.includes('booking') || normalized.includes('request')) return 'booking_requests';
  if (normalized.includes('prayer')) return 'prayer_reminders';
  if (normalized.includes('support') || normalized.includes('security') || normalized.includes('wallet')) return 'critical_alerts';
  return 'trip_updates';
}

export function getCommunicationCapabilities(contact?: { email?: string | null; phone?: string | null }): CommunicationCapabilitySnapshot {
  const config = getConfig();
  const NotificationApi =
    (typeof window !== 'undefined'
      ? ((window as unknown) as { Notification?: typeof Notification }).Notification
      : undefined)
    ?? ((globalThis as unknown) as { Notification?: typeof Notification }).Notification;

  return {
    inApp: true,
    push: typeof NotificationApi !== 'undefined',
    email: Boolean(config.enableEmailNotifications && contact?.email),
    sms: Boolean(config.enableSmsNotifications && contact?.phone),
    whatsapp: Boolean(config.enableWhatsAppNotifications && contact?.phone && config.supportWhatsAppNumber),
  };
}

export function buildDeliveryPlan(args: {
  type: string;
  preferences: CommunicationPreferences;
  capabilities: CommunicationCapabilitySnapshot;
  explicitChannels?: CommunicationChannel[];
}): CommunicationChannel[] {
  const topic = resolveNotificationTopic(args.type);
  const topicEnabled =
    topic === 'trip_updates' ? args.preferences.tripUpdates
      : topic === 'booking_requests' ? args.preferences.bookingRequests
      : topic === 'messages' ? args.preferences.messages
      : topic === 'promotions' ? args.preferences.promotions
      : topic === 'prayer_reminders' ? args.preferences.prayerReminders
      : args.preferences.criticalAlerts;

  if (!topicEnabled) return [];

  const requestedChannels = args.explicitChannels && args.explicitChannels.length > 0
    ? args.explicitChannels
    : (['in_app', 'push', 'email', 'sms'] as CommunicationChannel[]);

  return requestedChannels.filter((channel) => {
    if (channel === 'in_app') return args.preferences.inApp && args.capabilities.inApp;
    if (channel === 'push') return args.preferences.push && args.capabilities.push;
    if (channel === 'email') return args.preferences.email && args.capabilities.email;
    if (channel === 'sms') return args.preferences.sms && args.capabilities.sms;
    if (channel === 'whatsapp') return args.preferences.whatsapp && args.capabilities.whatsapp;
    return false;
  });
}

export async function getCommunicationPreferences(userId?: string | null): Promise<CommunicationPreferences> {
  const localPrefs = readStoredPreferences(userId);
  if (!userId) return localPrefs;

  if (!canUseEdgeApi()) {
    try {
      const direct = await getDirectCommunicationPreferences(userId);
      if (!direct) return localPrefs;
      const normalized = normalizeDirectPreferences(direct as Record<string, unknown> | null);
      writeStoredPreferences(userId, normalized);
      return normalized;
    } catch {
      return localPrefs;
    }
  }

  try {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/communications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to load communication preferences');
    const data = await response.json();
    const normalized = normalizePreferences(data?.preferences as Partial<CommunicationPreferences>);
    writeStoredPreferences(userId, normalized);
    return normalized;
  } catch {
    try {
      const direct = await getDirectCommunicationPreferences(userId);
      if (!direct) return localPrefs;
      const normalized = normalizeDirectPreferences(direct as Record<string, unknown> | null);
      writeStoredPreferences(userId, normalized);
      return normalized;
    } catch {
      return localPrefs;
    }
  }
}

export async function updateCommunicationPreferences(
  userId: string | null | undefined,
  updates: Partial<CommunicationPreferences>,
): Promise<CommunicationPreferences> {
  const merged = normalizePreferences({ ...readStoredPreferences(userId), ...updates });
  writeStoredPreferences(userId, merged);

  if (!userId) return merged;

  if (!canUseEdgeApi()) {
    try {
      await upsertDirectCommunicationPreferences(userId, toDirectPreferenceUpdate(updates));
    } catch {
      // local-first fallback
    }
    return merged;
  }

  try {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/communications/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(merged),
    });
    if (!response.ok) throw new Error('Failed to update communication preferences');
  } catch {
    try {
      await upsertDirectCommunicationPreferences(userId, toDirectPreferenceUpdate(updates));
    } catch {
      // keep local copy
    }
  }

  return merged;
}

export async function queueCommunicationDeliveries(args: {
  userId?: string | null;
  notificationId?: string;
  requests: DeliveryQueueRequest[];
}) {
  if (args.requests.length === 0) {
    return { queued: 0, source: 'none' as const };
  }

  const queuedAt = new Date().toISOString();
  const localRecords: QueuedDeliveryRecord[] = args.requests.map((request, index) => ({
    ...request,
    id: `delivery-${Date.now()}-${index}`,
    userId: args.userId ?? undefined,
    queuedAt,
  }));

  writeOutbox([...localRecords, ...readOutbox()]);

  if (!args.userId) {
    return { queued: localRecords.length, source: 'local' as const };
  }

  if (!canUseEdgeApi()) {
    try {
      await queueDirectCommunicationDeliveries(args.userId, args.requests.map((request) => ({
        ...request,
        notification_id: args.notificationId ?? null,
      })));
      return { queued: localRecords.length, source: 'server' as const };
    } catch {
      return { queued: localRecords.length, source: 'local' as const };
    }
  }

  try {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/communications/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        notificationId: args.notificationId ?? null,
        deliveries: args.requests,
      }),
    });
    if (!response.ok) throw new Error('Failed to queue communication deliveries');
    return { queued: localRecords.length, source: 'server' as const };
  } catch {
    try {
      await queueDirectCommunicationDeliveries(args.userId, args.requests.map((request) => ({
        ...request,
        notification_id: args.notificationId ?? null,
      })));
      return { queued: localRecords.length, source: 'server' as const };
    } catch {
      return { queued: localRecords.length, source: 'local' as const };
    }
  }
}

export async function getCommunicationDeliveryHistory(userId?: string | null) {
  if (!userId) {
    return readOutbox();
  }

  try {
    return await getDirectCommunicationDeliveries(userId);
  } catch {
    return readOutbox().filter((record) => record.userId === userId);
  }
}
