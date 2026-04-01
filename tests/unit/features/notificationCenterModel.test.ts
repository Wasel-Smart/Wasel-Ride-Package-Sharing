import { describe, expect, it } from 'vitest';

import type { Notification } from '../../../src/hooks/useNotifications';
import {
  buildNotificationSections,
  getNotificationCategory,
  getNotificationSummary,
  matchesNotificationFilter,
  matchesNotificationSearch,
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
});
