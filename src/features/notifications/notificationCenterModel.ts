import type { Notification } from '../../hooks/useNotifications';

export type NotificationCategory =
  | 'rides'
  | 'messages'
  | 'wallet'
  | 'trust'
  | 'support'
  | 'system';

export type NotificationSectionKey = 'today' | 'week' | 'earlier';

export type NotificationFilter = 'all' | 'unread' | 'urgent' | NotificationCategory | 'archived';

export type NotificationSection = {
  key: NotificationSectionKey;
  title: string;
  items: Notification[];
};

const CATEGORY_PATTERNS: Array<{ category: NotificationCategory; patterns: RegExp[] }> = [
  { category: 'rides', patterns: [/trip/i, /ride/i, /booking/i, /driver/i, /bus/i, /package/i] },
  { category: 'messages', patterns: [/message/i, /chat/i] },
  { category: 'wallet', patterns: [/payment/i, /wallet/i, /refund/i, /payout/i, /credit/i] },
  { category: 'trust', patterns: [/verification/i, /trust/i, /safety/i, /rating/i] },
  { category: 'support', patterns: [/support/i, /help/i, /ticket/i] },
];

export function getNotificationCategory(notification: Notification): NotificationCategory {
  const haystack = `${notification.type} ${notification.title} ${notification.message}`;

  for (const entry of CATEGORY_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(haystack))) {
      return entry.category;
    }
  }

  return 'system';
}

export function matchesNotificationFilter(args: {
  notification: Notification;
  filter: NotificationFilter;
  archivedIds: Set<string>;
}): boolean {
  const { notification, filter, archivedIds } = args;
  const isArchived = archivedIds.has(notification.id);

  if (filter === 'archived') {
    return isArchived;
  }

  if (isArchived) {
    return false;
  }

  if (filter === 'all') return true;
  if (filter === 'unread') return !notification.read;
  if (filter === 'urgent') return notification.priority === 'urgent' || notification.priority === 'high';

  return getNotificationCategory(notification) === filter;
}

export function matchesNotificationSearch(notification: Notification, searchTerm: string): boolean {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return true;

  return [
    notification.title,
    notification.message,
    notification.type,
    notification.priority ?? '',
    getNotificationCategory(notification),
  ].some((value) => value.toLowerCase().includes(normalized));
}

export function buildNotificationSections(
  notifications: Notification[],
  now: Date,
  labels: Record<NotificationSectionKey, string>,
): NotificationSection[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const buckets: Record<NotificationSectionKey, Notification[]> = {
    today: [],
    week: [],
    earlier: [],
  };

  for (const notification of notifications) {
    const createdAt = new Date(notification.created_at);
    if (createdAt >= startOfToday) {
      buckets.today.push(notification);
    } else if (createdAt >= sevenDaysAgo) {
      buckets.week.push(notification);
    } else {
      buckets.earlier.push(notification);
    }
  }

  return (Object.keys(buckets) as NotificationSectionKey[])
    .map((key) => ({
      key,
      title: labels[key],
      items: buckets[key],
    }))
    .filter((section) => section.items.length > 0);
}

export function getNotificationSummary(notifications: Notification[], archivedIds: Set<string>) {
  const visible = notifications.filter((notification) => !archivedIds.has(notification.id));
  const unread = visible.filter((notification) => !notification.read).length;
  const urgent = visible.filter(
    (notification) => notification.priority === 'urgent' || notification.priority === 'high',
  ).length;

  return {
    total: visible.length,
    unread,
    urgent,
    archived: archivedIds.size,
  };
}
