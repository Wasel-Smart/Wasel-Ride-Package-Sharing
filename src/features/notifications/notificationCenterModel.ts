import type { Notification } from '../../../shared/domain-contracts';

export type NotificationCategory =
  | 'rides'
  | 'messages'
  | 'wallet'
  | 'trust'
  | 'support'
  | 'system';

export type NotificationStakeholder =
  | 'rider'
  | 'driver'
  | 'operations'
  | 'support'
  | 'finance'
  | 'trust'
  | 'system';

export type NotificationChannelPreview = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';

export type NotificationSectionKey = 'today' | 'week' | 'earlier';

export type NotificationFilter = 'all' | 'unread' | 'urgent' | NotificationCategory | 'archived';

export type NotificationSection = {
  key: NotificationSectionKey;
  title: string;
  items: Notification[];
};

type FilterCountMap = Record<NotificationFilter, number>;

const CATEGORY_PATTERNS: Array<{ category: NotificationCategory; patterns: RegExp[] }> = [
  { category: 'rides', patterns: [/trip/i, /ride/i, /booking/i, /driver/i, /bus/i, /package/i] },
  { category: 'messages', patterns: [/message/i, /chat/i] },
  { category: 'wallet', patterns: [/payment/i, /wallet/i, /refund/i, /payout/i, /credit/i] },
  { category: 'trust', patterns: [/verification/i, /trust/i, /safety/i, /rating/i] },
  { category: 'support', patterns: [/support/i, /help/i, /ticket/i] },
];

const STAKEHOLDER_PATTERNS: Array<{
  stakeholder: NotificationStakeholder;
  patterns: RegExp[];
}> = [
  { stakeholder: 'driver', patterns: [/driver/i, /captain/i, /courier/i] },
  { stakeholder: 'rider', patterns: [/rider/i, /passenger/i, /pickup/i, /dropoff/i] },
  { stakeholder: 'operations', patterns: [/route/i, /dispatch/i, /corridor/i, /ops/i, /operations/i] },
  { stakeholder: 'support', patterns: [/support/i, /ticket/i, /case/i, /help/i] },
  { stakeholder: 'finance', patterns: [/wallet/i, /payment/i, /refund/i, /payout/i, /credit/i] },
  { stakeholder: 'trust', patterns: [/trust/i, /verification/i, /safety/i, /secure/i, /rating/i] },
];

function extractMetadataRecord(notification: Notification): Record<string, unknown> | null {
  if (!notification.data || typeof notification.data !== 'object' || Array.isArray(notification.data)) {
    return null;
  }

  return notification.data as Record<string, unknown>;
}

export function getNotificationCategory(notification: Notification): NotificationCategory {
  const haystack = `${notification.type} ${notification.title} ${notification.message}`;

  for (const entry of CATEGORY_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(haystack))) {
      return entry.category;
    }
  }

  return 'system';
}

export function getNotificationStakeholders(notification: Notification): NotificationStakeholder[] {
  const metadata = extractMetadataRecord(notification);
  const metadataStakeholders = Array.isArray(metadata?.stakeholders)
    ? metadata.stakeholders.filter(
      (value): value is NotificationStakeholder =>
        typeof value === 'string' &&
        ['rider', 'driver', 'operations', 'support', 'finance', 'trust', 'system'].includes(value),
    )
    : [];

  if (metadataStakeholders.length > 0) {
    return metadataStakeholders;
  }

  const haystack = `${notification.type} ${notification.title} ${notification.message}`;
  const matches = STAKEHOLDER_PATTERNS
    .filter((entry) => entry.patterns.some((pattern) => pattern.test(haystack)))
    .map((entry) => entry.stakeholder);

  const category = getNotificationCategory(notification);
  if (category === 'rides') matches.push('rider', 'operations');
  if (category === 'messages') matches.push('support');
  if (category === 'wallet') matches.push('finance');
  if (category === 'trust') matches.push('trust');
  if (category === 'support') matches.push('support', 'operations');
  if (matches.length === 0) matches.push('system');

  return Array.from(new Set(matches));
}

export function getNotificationChannelPreview(
  notification: Notification,
): NotificationChannelPreview[] {
  const metadata = extractMetadataRecord(notification);
  const metadataChannels = Array.isArray(metadata?.channels)
    ? metadata.channels.filter(
      (value): value is NotificationChannelPreview =>
        typeof value === 'string' &&
        ['in_app', 'push', 'email', 'sms', 'whatsapp'].includes(value),
    )
    : [];

  if (metadataChannels.length > 0) {
    return metadataChannels;
  }

  const channels: NotificationChannelPreview[] = ['in_app'];
  const category = getNotificationCategory(notification);
  const stakeholders = getNotificationStakeholders(notification);

  if (notification.priority === 'urgent' || notification.priority === 'high') {
    channels.push('push');
  }

  if (
    category === 'support' ||
    category === 'wallet' ||
    category === 'trust' ||
    stakeholders.some((stakeholder) => ['support', 'trust', 'finance', 'operations'].includes(stakeholder))
  ) {
    channels.push('email');
  }

  if (category === 'rides' && (notification.priority === 'urgent' || notification.priority === 'high')) {
    channels.push('sms');
  }

  return Array.from(new Set(channels));
}

export function getNotificationEscalationLabel(notification: Notification) {
  if (notification.priority === 'urgent') return 'Immediate';
  if (notification.priority === 'high') return 'High touch';

  const category = getNotificationCategory(notification);
  if (category === 'support' || category === 'trust') return 'Monitored';
  if (category === 'rides' || category === 'wallet') return 'Tracked';
  return 'Routine';
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

export function getNotificationPriorityWeight(notification: Notification) {
  const priorityWeights: Record<NonNullable<Notification['priority']>, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
  };

  const priority = priorityWeights[notification.priority ?? 'medium'];
  const unreadBoost = notification.read ? 0 : 2;
  const ageMs = Math.max(Date.now() - new Date(notification.created_at).getTime(), 0);
  const recencyBoost = Math.max(0, 3 - ageMs / 3_600_000 / 12);

  return priority * 10 + unreadBoost + recencyBoost;
}

export function rankNotifications(notifications: Notification[]) {
  return [...notifications].sort((left, right) => {
    const weightDifference = getNotificationPriorityWeight(right) - getNotificationPriorityWeight(left);
    if (weightDifference !== 0) return weightDifference;

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export function buildFilterCounts(
  notifications: Notification[],
  archivedIds: Set<string>,
): FilterCountMap {
  const filters: NotificationFilter[] = [
    'all',
    'unread',
    'urgent',
    'rides',
    'messages',
    'wallet',
    'trust',
    'support',
    'system',
    'archived',
  ];

  return filters.reduce<FilterCountMap>((accumulator, filter) => {
    accumulator[filter] = notifications.filter((notification) => (
      matchesNotificationFilter({ notification, filter, archivedIds })
    )).length;
    return accumulator;
  }, {
    all: 0,
    unread: 0,
    urgent: 0,
    rides: 0,
    messages: 0,
    wallet: 0,
    trust: 0,
    support: 0,
    system: 0,
    archived: 0,
  });
}

export function buildStakeholderCounts(
  notifications: Notification[],
  archivedIds: Set<string>,
): Record<NotificationStakeholder, number> {
  const visible = notifications.filter((notification) => !archivedIds.has(notification.id));
  const counts: Record<NotificationStakeholder, number> = {
    rider: 0,
    driver: 0,
    operations: 0,
    support: 0,
    finance: 0,
    trust: 0,
    system: 0,
  };

  for (const notification of visible) {
    for (const stakeholder of getNotificationStakeholders(notification)) {
      counts[stakeholder] += 1;
    }
  }

  return counts;
}
