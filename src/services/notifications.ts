/**
 * notifications.ts
 *
 * Architecture:
 *  - Supabase `notifications` table is the PRIMARY store.
 *  - An in-memory cache provides instant reads for the current session
 *    and acts as a write buffer for unauthenticated users.
 *  - localStorage is NOT used. Notifications are real-time operational
 *    data (ride updates, payments, alerts) — browser-local persistence
 *    creates stale, cross-device inconsistency and is a compliance risk.
 *  - Call clearNotificationCache() on sign-out.
 */

import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import {
  buildDeliveryPlan,
  getCommunicationCapabilities,
  getCommunicationPreferences,
  queueCommunicationDeliveries,
  type CommunicationChannel,
  type DeliveryQueueRequest,
} from './communicationPreferences';
import {
  createDirectNotification,
  getDirectNotifications,
  markDirectNotificationAsRead,
} from './directSupabase';
import {
  readPendingSyncRecords,
  replacePendingSyncRecords,
  upsertPendingSyncRecord,
  type PendingSyncRecord,
} from './pendingSyncBuffer';

// ── Types ─────────────────────────────────────────────────────────────────────

type StoredNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  user_id: string;
  is_read?: boolean;
  read?: boolean;
  created_at: string;
  source?: 'local' | 'server';
};

type NotificationCreateInput = {
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  channels?: CommunicationChannel[];
  contact?: {
    email?: string | null;
    phone?: string | null;
  };
};

type NotificationCreateResult = {
  success: boolean;
  source: 'local' | 'server';
  deliveriesQueued?: number;
  deliverySource?: 'none' | 'local' | 'server';
  channels?: CommunicationChannel[];
};

type PendingNotificationOperation =
  | {
      kind: 'create';
      userId: string;
      draftId: string;
      data: NotificationCreateInput;
    }
  | {
      kind: 'mark_read';
      userId: string;
      notificationId: string;
    };

// ── In-memory state ───────────────────────────────────────────────────────────

// Session-scoped write buffer for unauthenticated / offline notifications.
// These are NOT persisted — cleared on sign-out or page reload.
const sessionNotifications: StoredNotification[] = [];

// Server notification cache: keyed by userId, with TTL.
type NotificationCacheEntry = {
  data: StoredNotification[];
  timestamp: number;
};
const notificationCache = new Map<string, NotificationCacheEntry>();
const NOTIFICATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const NOTIFICATION_SYNC_QUEUE = 'notifications';

/** Clear all in-memory notification state. Call on sign-out. */
export function clearNotificationCache(): void {
  sessionNotifications.splice(0);
  notificationCache.clear();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canUseEdgeApi(): boolean {
  return Boolean(API_URL);
}

function readSessionNotifications(): StoredNotification[] {
  return [...sessionNotifications];
}

function writeSessionNotifications(items: StoredNotification[]): void {
  sessionNotifications.splice(0, sessionNotifications.length, ...items.slice(0, 100));
}

function replaceSessionNotification(previousId: string, next: StoredNotification): void {
  writeSessionNotifications([
    next,
    ...sessionNotifications.filter(item => item.id !== previousId && item.id !== next.id),
  ]);
}

function normalizeNotification(item: StoredNotification): StoredNotification {
  return {
    ...item,
    read: typeof item.read === 'boolean' ? item.read : Boolean(item.is_read),
    is_read: typeof item.is_read === 'boolean' ? item.is_read : Boolean(item.read),
    priority: item.priority ?? 'medium',
  };
}

function sortNotifications(items: StoredNotification[]): StoredNotification[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function mergeNotifications(
  localNotifications: StoredNotification[],
  serverNotifications: StoredNotification[],
): StoredNotification[] {
  const merged = new Map<string, StoredNotification>();

  for (const item of [...serverNotifications, ...localNotifications]) {
    const normalized = normalizeNotification(item);
    const existing = merged.get(normalized.id);

    if (!existing) {
      merged.set(normalized.id, normalized);
      continue;
    }

    merged.set(normalized.id, {
      ...existing,
      ...normalized,
      read: existing.read || normalized.read,
      is_read: existing.is_read || normalized.is_read,
    });
  }

  return sortNotifications(Array.from(merged.values()));
}

function markSessionNotificationAsRead(notificationId: string): void {
  writeSessionNotifications(
    sessionNotifications.map(item =>
      item.id === notificationId ? { ...item, is_read: true, read: true } : item,
    ),
  );
}

function markCachedServerNotificationAsRead(userId: string, notificationId: string): void {
  const cached = notificationCache.get(userId);
  if (!cached) return;

  notificationCache.set(userId, {
    ...cached,
    data: cached.data.map(item =>
      item.id === notificationId ? { ...item, read: true, is_read: true } : item,
    ),
  });
}

async function flushPendingNotificationOperations(): Promise<void> {
  const records = readPendingSyncRecords<PendingNotificationOperation>(NOTIFICATION_SYNC_QUEUE);
  if (records.length === 0) return;

  const remaining: PendingSyncRecord<PendingNotificationOperation>[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;

    try {
      const payload = record.payload;

      if (payload.kind === 'create') {
        const created = await createDirectNotification({
          userId: payload.userId,
          title: payload.data.title,
          message: payload.data.message,
          type: payload.data.type,
          priority: payload.data.priority,
          action_url: payload.data.action_url,
        });
        const nextId = String(created?.id ?? payload.draftId);
        replaceSessionNotification(payload.draftId, {
          id: nextId,
          title: payload.data.title,
          message: payload.data.message,
          type: payload.data.type,
          priority: payload.data.priority ?? 'medium',
          action_url: payload.data.action_url,
          user_id: payload.userId,
          is_read: false,
          read: false,
          created_at: String(created?.created_at ?? new Date().toISOString()),
          source: 'server',
        });
        notificationCache.delete(payload.userId);

        for (let cursor = index + 1; cursor < records.length; cursor += 1) {
          const pending = records[cursor];
          if (!pending) continue;
          if (
            pending.payload.kind === 'mark_read' &&
            pending.payload.userId === payload.userId &&
            pending.payload.notificationId === payload.draftId
          ) {
            records[cursor] = {
              ...pending,
              payload: {
                ...pending.payload,
                notificationId: nextId,
              },
            };
          }
        }

        continue;
      }

      await markDirectNotificationAsRead(payload.notificationId, payload.userId);
      markSessionNotificationAsRead(payload.notificationId);
      markCachedServerNotificationAsRead(payload.userId, payload.notificationId);
    } catch (error) {
      remaining.push({
        ...record,
        attempts: record.attempts + 1,
        updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Notification sync failed',
      });
    }
  }

  replacePendingSyncRecords(NOTIFICATION_SYNC_QUEUE, remaining);
}

async function queueSecondaryDeliveries(args: {
  userId?: string | null;
  notificationId?: string;
  type: string;
  title: string;
  message: string;
  explicitChannels?: CommunicationChannel[];
  contact?: {
    email?: string | null;
    phone?: string | null;
  };
}): Promise<Pick<NotificationCreateResult, 'deliveriesQueued' | 'deliverySource' | 'channels'>> {
  const preferences = await getCommunicationPreferences(args.userId);
  const capabilities = getCommunicationCapabilities(args.contact);
  const channels = buildDeliveryPlan({
    type: args.type,
    preferences,
    capabilities,
    explicitChannels: args.explicitChannels,
  }).filter(
    (channel): channel is DeliveryQueueRequest['channel'] =>
      channel !== 'in_app' && channel !== 'push',
  );

  if (channels.length === 0) {
    return { deliveriesQueued: 0, deliverySource: 'none', channels: [] };
  }

  const requests: DeliveryQueueRequest[] = [];

  for (const channel of channels) {
    if (channel === 'email' && args.contact?.email) {
      requests.push({
        channel,
        destination: args.contact.email,
        subject: args.title,
        body: args.message,
        notificationId: args.notificationId,
        metadata: { type: args.type },
      });
      continue;
    }

    if ((channel === 'sms' || channel === 'whatsapp') && args.contact?.phone) {
      requests.push({
        channel,
        destination: args.contact.phone,
        subject: args.title,
        body: args.message,
        notificationId: args.notificationId,
        metadata: { type: args.type },
      });
    }
  }

  if (requests.length === 0) {
    return { deliveriesQueued: 0, deliverySource: 'none', channels: [] };
  }

  const result = await queueCommunicationDeliveries({
    userId: args.userId,
    notificationId: args.notificationId,
    requests,
  });

  return {
    deliveriesQueued: result.queued,
    deliverySource: result.source,
    channels,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const notificationsAPI = {
  async getNotifications() {
    const sessionItems = readSessionNotifications();
    let token: string | null = null;
    let userId: string | null = null;

    try {
      const auth = await getAuthDetails();
      token = auth.token;
      userId = auth.userId;
    } catch {
      return { notifications: sortNotifications(sessionItems.map(normalizeNotification)) };
    }

    if (!token || !userId) {
      return { notifications: sortNotifications(sessionItems.map(normalizeNotification)) };
    }

    await flushPendingNotificationOperations();

    // Check in-memory server cache
    const cachedEntry = notificationCache.get(userId);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.timestamp < NOTIFICATION_CACHE_TTL) {
      return {
        notifications: mergeNotifications(sessionItems, cachedEntry.data),
      };
    }

    if (!canUseEdgeApi()) {
      try {
        const serverNotifications = await getDirectNotifications(userId);
        notificationCache.set(userId, {
          data: serverNotifications as StoredNotification[],
          timestamp: Date.now(),
        });
        return {
          notifications: mergeNotifications(
            sessionItems,
            serverNotifications as StoredNotification[],
          ),
        };
      } catch {
        return { notifications: sortNotifications(sessionItems.map(normalizeNotification)) };
      }
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      const serverNotifications = Array.isArray(data?.notifications) ? data.notifications : [];
      notificationCache.set(userId, { data: serverNotifications, timestamp: Date.now() });
      return {
        notifications: mergeNotifications(sessionItems, serverNotifications),
      };
    } catch {
      try {
        const serverNotifications = await getDirectNotifications(userId);
        return {
          notifications: mergeNotifications(
            sessionItems,
            serverNotifications as StoredNotification[],
          ),
        };
      } catch {
        return { notifications: sortNotifications(sessionItems.map(normalizeNotification)) };
      }
    }
  },

  async markAsRead(notificationId: string) {
    markSessionNotificationAsRead(notificationId);

    let token: string | null = null;
    let userId: string | null = null;
    try {
      const auth = await getAuthDetails();
      token = auth.token;
      userId = auth.userId;
    } catch {
      return { success: true, source: 'local' };
    }

    if (!token || !userId) return { success: true, source: 'local' };

    if (!canUseEdgeApi()) {
      try {
        await markDirectNotificationAsRead(notificationId, userId);
        return { success: true, source: 'server' };
      } catch {
        upsertPendingSyncRecord(NOTIFICATION_SYNC_QUEUE, {
          kind: 'mark_read',
          userId,
          notificationId,
        });
        return { success: true, source: 'local' };
      }
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        upsertPendingSyncRecord(NOTIFICATION_SYNC_QUEUE, {
          kind: 'mark_read',
          userId,
          notificationId,
        });
        return { success: true, source: 'local' };
      }
      return await response.json();
    } catch {
      try {
        await markDirectNotificationAsRead(notificationId, userId);
        return { success: true, source: 'server' };
      } catch {
        upsertPendingSyncRecord(NOTIFICATION_SYNC_QUEUE, {
          kind: 'mark_read',
          userId,
          notificationId,
        });
        return { success: true, source: 'local' };
      }
    }
  },

  async createNotification(data: NotificationCreateInput): Promise<NotificationCreateResult> {
    const sessionItems = readSessionNotifications();
    let token: string | null = null;
    let userId: string | null = null;

    try {
      const auth = await getAuthDetails();
      token = auth.token;
      userId = auth.userId;
    } catch {
      // No auth — buffer in session memory only (lost on reload).
      writeSessionNotifications(
        sortNotifications([
          {
            id: `session-${Date.now()}`,
            title: data.title,
            message: data.message,
            type: data.type,
            priority: data.priority ?? 'medium',
            action_url: data.action_url,
            user_id: 'session',
            is_read: false,
            read: false,
            created_at: new Date().toISOString(),
            source: 'local',
          },
          ...sessionItems,
        ]),
      );
      return {
        success: true,
        source: 'local',
        deliveriesQueued: 0,
        deliverySource: 'none',
        channels: ['in_app'],
      };
    }

    const sessionDraft: StoredNotification = {
      id: `session-${Date.now()}`,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority ?? 'medium',
      action_url: data.action_url,
      user_id: userId ?? 'session',
      is_read: false,
      read: false,
      created_at: new Date().toISOString(),
      source: 'local',
    };

    if (!token || !userId) {
      writeSessionNotifications(sortNotifications([sessionDraft, ...sessionItems]));
      const deliveryResult = await queueSecondaryDeliveries({
        type: data.type,
        title: data.title,
        message: data.message,
        explicitChannels: data.channels,
        contact: data.contact,
      });
      return { success: true, source: 'local', ...deliveryResult };
    }

    await flushPendingNotificationOperations();

    if (!canUseEdgeApi()) {
      try {
        const created = await createDirectNotification({
          userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          action_url: data.action_url,
        });

        const notificationId = String(created?.id ?? sessionDraft.id);
        writeSessionNotifications(
          sortNotifications([
            { ...sessionDraft, id: notificationId, source: 'server' },
            ...sessionItems,
          ]),
        );

        // Invalidate server cache for this user
        notificationCache.delete(userId);

        const deliveryResult = await queueSecondaryDeliveries({
          userId,
          notificationId,
          type: data.type,
          title: data.title,
          message: data.message,
          explicitChannels: data.channels,
          contact: data.contact,
        });
        return { success: true, source: 'server', ...deliveryResult };
      } catch {
        writeSessionNotifications(sortNotifications([sessionDraft, ...sessionItems]));
        upsertPendingSyncRecord(NOTIFICATION_SYNC_QUEUE, {
          kind: 'create',
          userId,
          draftId: sessionDraft.id,
          data,
        });
        const deliveryResult = await queueSecondaryDeliveries({
          userId,
          notificationId: sessionDraft.id,
          type: data.type,
          title: data.title,
          message: data.message,
          explicitChannels: data.channels,
          contact: data.contact,
        });
        return { success: true, source: 'local', ...deliveryResult };
      }
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/notifications/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...data, body: data.message }),
      });

      if (!response.ok) {
        writeSessionNotifications(sortNotifications([sessionDraft, ...sessionItems]));
        upsertPendingSyncRecord(NOTIFICATION_SYNC_QUEUE, {
          kind: 'create',
          userId,
          draftId: sessionDraft.id,
          data,
        });
        const deliveryResult = await queueSecondaryDeliveries({
          userId,
          notificationId: sessionDraft.id,
          type: data.type,
          title: data.title,
          message: data.message,
          explicitChannels: data.channels,
          contact: data.contact,
        });
        return { success: true, source: 'local', ...deliveryResult };
      }

      const server = await response.json().catch(() => ({}));
      const notificationId = String(server?.notification?.id ?? sessionDraft.id);
      writeSessionNotifications(
        sortNotifications([
          { ...sessionDraft, id: notificationId, source: 'server' },
          ...sessionItems,
        ]),
      );

      notificationCache.delete(userId);

      const deliveryResult = await queueSecondaryDeliveries({
        userId,
        notificationId,
        type: data.type,
        title: data.title,
        message: data.message,
        explicitChannels: data.channels,
        contact: data.contact,
      });
      return { success: true, source: 'server', ...deliveryResult };
    } catch {
      try {
        const created = await createDirectNotification({
          userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          action_url: data.action_url,
        });

        const notificationId = String(created?.id ?? sessionDraft.id);
        writeSessionNotifications(
          sortNotifications([
            { ...sessionDraft, id: notificationId, source: 'server' },
            ...sessionItems,
          ]),
        );
        notificationCache.delete(userId);

        const deliveryResult = await queueSecondaryDeliveries({
          userId,
          notificationId,
          type: data.type,
          title: data.title,
          message: data.message,
          explicitChannels: data.channels,
          contact: data.contact,
        });
        return { success: true, source: 'server', ...deliveryResult };
      } catch {
        writeSessionNotifications(sortNotifications([sessionDraft, ...sessionItems]));
        upsertPendingSyncRecord(NOTIFICATION_SYNC_QUEUE, {
          kind: 'create',
          userId,
          draftId: sessionDraft.id,
          data,
        });
        const deliveryResult = await queueSecondaryDeliveries({
          userId,
          notificationId: sessionDraft.id,
          type: data.type,
          title: data.title,
          message: data.message,
          explicitChannels: data.channels,
          contact: data.contact,
        });
        return { success: true, source: 'local', ...deliveryResult };
      }
    }
  },
};
