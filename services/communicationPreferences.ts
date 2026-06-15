import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import {
  getDirectCommunicationPreferences,
  getDirectCommunicationDeliveries,
  queueDirectCommunicationDeliveries,
  upsertDirectCommunicationPreferences,
} from './directSupabase';
import { getConfig } from '../utils/env';
import {
  buildTraceHeaders,
  communicationPreferenceUpdateSchema,
  withDataIntegrity,
} from './dataIntegrity';
import {
  COMMUNICATIONS_CONTRACT_VERSION,
  communicationDeliveryHistorySchema,
  communicationPreferencesSchema,
  type CommunicationDeliveryRecordContract,
} from '../contracts/communications';
import { parseContract } from '../contracts/validation';
import {
  allowAuthenticatedLocalPersistence,
  allowDirectSupabaseFallback,
  requireDirectSupabaseFallback,
} from './runtimePolicy';

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
  whatsapp: true,
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
  return parseContract(
    communicationPreferencesSchema,
    {
      ...defaultCommunicationPreferences,
      ...value,
      preferredLanguage: value?.preferredLanguage === 'ar' ? 'ar' : 'en',
    },
    'communication.preferences',
    COMMUNICATIONS_CONTRACT_VERSION,
  );
}

function storageKeyFor(userId: string | null | undefined) {
  return `${PREFERENCES_KEY}:${userId || 'guest'}`;
}

function readStoredPreferences(userId?: string | null): CommunicationPreferences {
  if (!allowAuthenticatedLocalPersistence(userId)) {
    return defaultCommunicationPreferences;
  }

  if (typeof window === 'undefined') {return defaultCommunicationPreferences;}

  try {
    const raw = window.localStorage.getItem(storageKeyFor(userId));
    return raw
      ? normalizePreferences(JSON.parse(raw) as Partial<CommunicationPreferences>)
      : defaultCommunicationPreferences;
  } catch {
    return defaultCommunicationPreferences;
  }
}

function writeStoredPreferences(userId: string | null | undefined, prefs: CommunicationPreferences): void {
  if (!allowAuthenticatedLocalPersistence(userId)) {return;}
  if (typeof window === 'undefined') {return;}
  window.localStorage.setItem(
    storageKeyFor(userId),
    JSON.stringify(normalizePreferences(prefs)),
  );
}

type QueuedDeliveryRecord = DeliveryQueueRequest & {
  id: string;
  userId?: string;
  queuedAt: string;
};

function readOutbox(): QueuedDeliveryRecord[] {
  if (typeof window === 'undefined') {return [];}
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as QueuedDeliveryRecord[] : [];
  } catch {
    return [];
  }
}

function writeOutbox(records: QueuedDeliveryRecord[]): void {
  if (typeof window === 'undefined') {return;}
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(records.slice(0, 200)));
}

function normalizeQueuedDeliveryRecord(
  record: QueuedDeliveryRecord,
): CommunicationDeliveryRecordContract {
  return parseContract(
    communicationDeliveryHistorySchema.element,
    {
      id: record.id,
      userId: record.userId,
      notificationId: record.notificationId ?? null,
      channel: record.channel,
      status: 'queued',
      destination: record.destination,
      subject: record.subject ?? null,
      body: record.body,
      metadata: record.metadata ?? null,
      providerName: 'local_outbox',
      queuedAt: record.queuedAt,
      createdAt: record.queuedAt,
    },
    'communication.delivery.local',
    COMMUNICATIONS_CONTRACT_VERSION,
  );
}

function normalizeCommunicationDeliveryHistory(
  records: CommunicationDeliveryRecordContract[],
) {
  return parseContract(
    communicationDeliveryHistorySchema,
    records,
    'communication.delivery.history',
    COMMUNICATIONS_CONTRACT_VERSION,
  );
}

function normalizeDirectDeliveryRecord(
  row: Record<string, unknown>,
): CommunicationDeliveryRecordContract {
  const payload =
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};

  return parseContract(
    communicationDeliveryHistorySchema.element,
    {
      id: String(row.delivery_id ?? row.id ?? ''),
      userId:
        typeof row.user_id === 'string' && row.user_id
          ? row.user_id
          : undefined,
      notificationId:
        typeof row.notification_id === 'string'
          ? row.notification_id
          : row.notification_id === null
            ? null
            : undefined,
      channel:
        row.channel === 'in_app' ||
        row.channel === 'push' ||
        row.channel === 'email' ||
        row.channel === 'sms' ||
        row.channel === 'whatsapp'
          ? row.channel
          : 'email',
      status: String(row.delivery_status ?? 'queued'),
      destination: String(row.destination ?? ''),
      subject:
        typeof row.subject === 'string' ? row.subject : row.subject === null ? null : undefined,
      body: String(payload.body ?? ''),
      metadata:
        payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
          ? (payload.metadata as Record<string, unknown>)
          : null,
      providerName:
        typeof row.provider_name === 'string'
          ? row.provider_name
          : row.provider_name === null
            ? null
            : undefined,
      queuedAt: String(row.queued_at ?? row.created_at ?? new Date().toISOString()),
      createdAt:
        typeof row.created_at === 'string' ? row.created_at : undefined,
    },
    'communication.delivery.direct',
    COMMUNICATIONS_CONTRACT_VERSION,
  );
}

function normalizeDirectPreferences(row: Record<string, unknown> | null | undefined): CommunicationPreferences {
  return normalizePreferences({
    inApp: row?.in_app_enabled !== false,
    push: row?.push_enabled !== false,
    email: row?.email_enabled !== false,
    sms: row?.sms_enabled !== false,
    whatsapp: row?.whatsapp_enabled !== false,
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
  if (normalized.includes('promo') || normalized.includes('offer')) {return 'promotions';}
  if (normalized.includes('message') || normalized.includes('chat')) {return 'messages';}
  if (normalized.includes('booking') || normalized.includes('request')) {return 'booking_requests';}
  if (normalized.includes('prayer')) {return 'prayer_reminders';}
  if (normalized.includes('support') || normalized.includes('security') || normalized.includes('wallet')) {return 'critical_alerts';}
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
    whatsapp: Boolean(config.enableWhatsAppNotifications && contact?.phone),
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

  if (!topicEnabled) {return [];}

  const requestedChannels = args.explicitChannels && args.explicitChannels.length > 0
    ? args.explicitChannels
    : (['in_app', 'push', 'whatsapp', 'sms', 'email'] as CommunicationChannel[]);

  return requestedChannels.filter((channel) => {
    const forceChannel = Boolean(args.explicitChannels?.includes(channel));
    if (channel === 'in_app') {return args.capabilities.inApp && (forceChannel || args.preferences.inApp);}
    if (channel === 'push') {return args.capabilities.push && (forceChannel || args.preferences.push);}
    if (channel === 'email') {return args.capabilities.email && (forceChannel || args.preferences.email);}
    if (channel === 'sms') {return args.capabilities.sms && (forceChannel || args.preferences.sms);}
    if (channel === 'whatsapp') {return args.capabilities.whatsapp && (forceChannel || args.preferences.whatsapp);}
    return false;
  });
}

export async function getCommunicationPreferences(userId?: string | null): Promise<CommunicationPreferences> {
  const localPrefs = readStoredPreferences(userId);
  if (!userId) {return localPrefs;}

  if (!canUseEdgeApi()) {
    requireDirectSupabaseFallback('Communication preference lookup');
    const direct = await getDirectCommunicationPreferences(userId);
    if (!direct) {return localPrefs;}
    const normalized = normalizeDirectPreferences(
      direct as Record<string, unknown> | null,
    );
    writeStoredPreferences(userId, normalized);
    return normalized;
  }

  try {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/communications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {throw new Error('Failed to load communication preferences');}
    const data = await response.json();
    const normalized = normalizePreferences(
      (data?.preferences ?? data) as Partial<CommunicationPreferences>,
    );
    writeStoredPreferences(userId, normalized);
    return normalized;
  } catch (error) {
    if (!allowDirectSupabaseFallback()) {
      if (allowAuthenticatedLocalPersistence(userId)) {
        return localPrefs;
      }
      throw error;
    }

    const direct = await getDirectCommunicationPreferences(userId);
    if (!direct) {return localPrefs;}
    const normalized = normalizeDirectPreferences(
      direct as Record<string, unknown> | null,
    );
    writeStoredPreferences(userId, normalized);
    return normalized;
  }
}

export async function updateCommunicationPreferences(
  userId: string | null | undefined,
  updates: Partial<CommunicationPreferences>,
): Promise<CommunicationPreferences> {
  const validatedUpdates = communicationPreferenceUpdateSchema.parse(updates);
  const merged = normalizePreferences({
    ...readStoredPreferences(userId),
    ...validatedUpdates,
  });

  if (!userId) {
    writeStoredPreferences(userId, merged);
    return merged;
  }

  if (!canUseEdgeApi()) {
    requireDirectSupabaseFallback('Communication preference update');
    const direct = await upsertDirectCommunicationPreferences(
      userId,
      toDirectPreferenceUpdate(validatedUpdates),
    );
    const normalized = normalizeDirectPreferences(
      direct as Record<string, unknown> | null,
    );
    writeStoredPreferences(userId, normalized);
    return normalized;
  }

  try {
    const confirmed = await withDataIntegrity({
      operation: 'communication.preferences.update',
      schema: communicationPreferenceUpdateSchema,
      payload: validatedUpdates,
      execute: async ({ requestId }) => {
        const { token } = await getAuthDetails();
        const response = await fetchWithRetry(`${API_URL}/communications/preferences`, {
          method: 'PATCH',
          headers: buildTraceHeaders(requestId, {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify(merged),
        });
        if (!response.ok) {throw new Error('Failed to update communication preferences');}
        const payload = await response.json().catch(() => ({ preferences: merged }));
        return normalizePreferences(
          (payload?.preferences ?? payload ?? merged) as Partial<CommunicationPreferences>,
        );
      },
    });
    writeStoredPreferences(userId, confirmed);
    return confirmed;
  } catch (error) {
    if (!allowDirectSupabaseFallback()) {
      if (allowAuthenticatedLocalPersistence(userId)) {
        writeStoredPreferences(userId, merged);
        return merged;
      }
      throw error;
    }

    const direct = await upsertDirectCommunicationPreferences(
      userId,
      toDirectPreferenceUpdate(validatedUpdates),
    );
    const normalized = normalizeDirectPreferences(
      direct as Record<string, unknown> | null,
    );
    writeStoredPreferences(userId, normalized);
    return normalized;
  }
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

  if (allowAuthenticatedLocalPersistence(args.userId)) {
    writeOutbox([...localRecords, ...readOutbox()]);
  }

  if (!args.userId) {
    return { queued: localRecords.length, source: 'local' as const };
  }

  if (!canUseEdgeApi()) {
    requireDirectSupabaseFallback('Communication delivery queueing');
    await queueDirectCommunicationDeliveries(args.userId, args.requests.map((request) => ({
      ...request,
      notification_id: args.notificationId ?? null,
    })));
    return { queued: localRecords.length, source: 'server' as const };
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
    if (!response.ok) {throw new Error('Failed to queue communication deliveries');}
    return { queued: localRecords.length, source: 'server' as const };
  } catch (error) {
    if (!allowDirectSupabaseFallback()) {
      if (allowAuthenticatedLocalPersistence(args.userId)) {
        return { queued: localRecords.length, source: 'local' as const };
      }
      throw error;
    }

    await queueDirectCommunicationDeliveries(args.userId, args.requests.map((request) => ({
      ...request,
      notification_id: args.notificationId ?? null,
    })));
    return { queued: localRecords.length, source: 'server' as const };
  }
}

export async function getCommunicationDeliveryHistory(userId?: string | null) {
  if (!userId) {
    return normalizeCommunicationDeliveryHistory(
      readOutbox().map(normalizeQueuedDeliveryRecord),
    );
  }

  try {
    return normalizeCommunicationDeliveryHistory(
      (await getDirectCommunicationDeliveries(userId)).map((record) =>
        normalizeDirectDeliveryRecord(record as Record<string, unknown>),
      ),
    );
  } catch (error) {
    if (!allowAuthenticatedLocalPersistence(userId)) {
      throw error;
    }

    return normalizeCommunicationDeliveryHistory(
      readOutbox()
        .filter((record) => record.userId === userId)
        .map(normalizeQueuedDeliveryRecord),
    );
  }
}
