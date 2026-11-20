// ─── Package & notification operations ───────────────────────────────────────

import { getDb } from './helpers';
import { buildUserContext } from './userContext';
import type {
  RawCommunicationDelivery,
  RawCommunicationPreferences,
  RawNotification,
} from './types';

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getDirectNotifications(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: false });
  if (error) {throw error;}
  return Array.isArray(data) ? (data as RawNotification[]) : [];
}

export async function markDirectNotificationAsRead(notificationId: string, userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('notifications')
    .update({ read: true, is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', context.user.id)
    .select('*')
    .maybeSingle();
  if (error) {throw error;}
  return data as RawNotification | null;
}

export async function createDirectNotification(input: {
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
}) {
  const context = await buildUserContext(input.userId);
  const db = getDb();
  const { data, error } = await db
    .from('notifications')
    .insert({
      user_id: context.user.id,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
      is_read: false,
      metadata: { priority: input.priority ?? 'medium', action_url: input.action_url },
    })
    .select('*')
    .single();
  if (error) {throw error;}
  return data as RawNotification;
}

export async function getDirectCommunicationPreferences(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('communication_preferences')
    .select('*')
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (error) {throw error;}
  return (data as RawCommunicationPreferences | null) ?? null;
}

export async function upsertDirectCommunicationPreferences(userId: string, updates: Record<string, unknown>) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('communication_preferences')
    .upsert({
      user_id: context.user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) {throw error;}
  return data as RawCommunicationPreferences;
}

export async function queueDirectCommunicationDeliveries(
  userId: string,
  deliveries: Array<Record<string, unknown>>,
) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const now = new Date().toISOString();
  const payload = deliveries.map((delivery) => ({
    user_id: context.user.id,
    notification_id: delivery.notification_id ?? null,
    channel: delivery.channel,
    delivery_status: 'queued',
    destination: delivery.destination ?? null,
    subject: delivery.subject ?? null,
    payload: {
      body: delivery.body ?? '',
      metadata: delivery.metadata ?? null,
    },
    provider_name: 'app_queue',
    queued_at: now,
  }));

  const { data, error } = await db
    .from('communication_deliveries')
    .insert(payload)
    .select('*');
  if (error) {throw error;}
  return Array.isArray(data) ? (data as RawCommunicationDelivery[]) : [];
}

export async function getDirectCommunicationDeliveries(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('communication_deliveries')
    .select('*')
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {throw error;}
  return Array.isArray(data) ? (data as RawCommunicationDelivery[]) : [];
}
