import { describe, expect, it } from 'vitest';

import type { Notification } from '../../../src/hooks/useNotifications';
import {
  buildFilterCounts,
  buildNotificationSections,
  buildStakeholderCounts,
  getNotificationChannelPreview,
  getNotificationCategory,
  getNotificationEscalationLabel,
  getNotificationSummary,
  getNotificationStakeholders,
  matchesNotificationFilter,
  matchesNotificationSearch,
  rankNotifications,
} from '../../../src/features/notifications/notificationCenterModel';

function createNotification(partial: Partial<Notification>): Notification {
  return {
    id: partial.id ?? 'notification-1',
    user_id: partial.user_id ?? 'user-1',
    type: partial.type ?? 'system',
    title: partial.title ?? 'Notification',
    message: partial.message ?? 'Details',
    read: partial.read ?? false,
    created_at: partial.created_at ?? '2026-04-01T10:00:00.000Z',
    priority: partial.priority ?? 'medium',
    action_url: partial.action_url,
    data: partial.data,
    source: partial.source,
  };
}

describe('notificationCenterModel', () => {
  it('detects categories from notification content', () => {
    expect(getNotificationCategory(createNotification({ type: 'trip_accepted' }))).toBe('rides');
    expect(getNotificationCategory(createNotification({ title: 'New message from support' }))).toBe('messages');
    expect(getNotificationCategory(createNotification({ title: 'Wallet top-up complete' }))).toBe('wallet');
    expect(getNotificationCategory(createNotification({ title: 'Verification approved' }))).toBe('trust');
    expect(getNotificationCategory(createNotification({ title: 'Support ticket created' }))).toBe('support');
  });

  it('filters notifications by unread, category, and archived state', () => {
    const unreadRide = createNotification({ id: 'ride', type: 'trip_accepted', read: false });
    const readSystem = createNotification({ id: 'system', type: 'system', read: true });
    const archivedIds = new Set(['system']);

    expect(matchesNotificationFilter({ notification: unreadRide, filter: 'unread', archivedIds })).toBe(true);
    expect(matchesNotificationFilter({ notification: readSystem, filter: 'all', archivedIds })).toBe(false);
    expect(matchesNotificationFilter({ notification: readSystem, filter: 'archived', archivedIds })).toBe(true);
    expect(matchesNotificationFilter({ notification: unreadRide, filter: 'rides', archivedIds })).toBe(true);
  });

  it('matches search terms across title, body, and category', () => {
    const notification = createNotification({
      title: 'Driver arrived',
      message: 'Pickup has started',
      type: 'trip_started',
    });

    expect(matchesNotificationSearch(notification, 'driver')).toBe(true);
    expect(matchesNotificationSearch(notification, 'pickup')).toBe(true);
    expect(matchesNotificationSearch(notification, 'rides')).toBe(true);
    expect(matchesNotificationSearch(notification, 'wallet')).toBe(false);
  });

  it('builds timeline sections in descending freshness buckets', () => {
    const now = new Date('2026-04-08T12:00:00.000Z');
    const sections = buildNotificationSections([
      createNotification({ id: 'today', created_at: '2026-04-08T08:00:00.000Z' }),
      createNotification({ id: 'week', created_at: '2026-04-04T08:00:00.000Z' }),
      createNotification({ id: 'earlier', created_at: '2026-03-20T08:00:00.000Z' }),
    ], now, {
      today: 'Today',
      week: 'Last 7 days',
      earlier: 'Earlier',
    });

    expect(sections.map((section) => section.key)).toEqual(['today', 'week', 'earlier']);
    expect(sections[0].items[0].id).toBe('today');
  });

  it('summarizes visible, unread, urgent, and archived counts', () => {
    const notifications = [
      createNotification({ id: 'visible-unread', read: false, priority: 'medium' }),
      createNotification({ id: 'visible-urgent', read: false, priority: 'urgent' }),
      createNotification({ id: 'archived', read: true, priority: 'high' }),
    ];

    expect(getNotificationSummary(notifications, new Set(['archived']))).toEqual({
      total: 2,
      unread: 2,
      urgent: 1,
      archived: 1,
    });
  });

  it('ranks unread urgent notifications ahead of older read items', () => {
    const ranked = rankNotifications([
      createNotification({
        id: 'older-read',
        read: true,
        priority: 'high',
        created_at: '2026-04-01T08:00:00.000Z',
      }),
      createNotification({
        id: 'urgent-unread',
        read: false,
        priority: 'urgent',
        created_at: '2026-04-04T08:30:00.000Z',
      }),
    ]);

    expect(ranked[0]?.id).toBe('urgent-unread');
  });

  it('builds filter counts for live and archived views', () => {
    const notifications = [
      createNotification({ id: 'ride-1', type: 'trip_update', read: false }),
      createNotification({ id: 'wallet-1', type: 'wallet_credit', read: true }),
      createNotification({
        id: 'support-1',
        type: 'support_reply',
        read: false,
        priority: 'urgent',
      }),
    ];

    const counts = buildFilterCounts(notifications, new Set(['wallet-1']));

    expect(counts.all).toBe(2);
    expect(counts.unread).toBe(2);
    expect(counts.urgent).toBe(1);
    expect(counts.wallet).toBe(0);
    expect(counts.support).toBe(1);
    expect(counts.archived).toBe(1);
  });

  it('infers stakeholders, channels, and escalation labels for communication-heavy notifications', () => {
    const notification = createNotification({
      type: 'support_security',
      title: 'Driver verification requires support follow-up',
      message: 'Operations escalated this case for immediate review.',
      priority: 'urgent',
    });

    expect(getNotificationStakeholders(notification)).toEqual(
      expect.arrayContaining(['driver', 'operations', 'support', 'trust']),
    );
    expect(getNotificationChannelPreview(notification)).toEqual(
      expect.arrayContaining(['in_app', 'push', 'email']),
    );
    expect(getNotificationEscalationLabel(notification)).toBe('Immediate');
  });

  it('summarizes visible notifications by stakeholder', () => {
    const notifications = [
      createNotification({ id: 'ride-ops', type: 'trip_update', title: 'Driver near pickup' }),
      createNotification({ id: 'wallet-finance', type: 'wallet_credit', title: 'Refund processed' }),
      createNotification({ id: 'support-case', type: 'support_reply', title: 'Support replied' }),
    ];

    const counts = buildStakeholderCounts(notifications, new Set());

    expect(counts.operations).toBeGreaterThan(0);
    expect(counts.finance).toBeGreaterThan(0);
    expect(counts.support).toBeGreaterThan(0);
  });
});
