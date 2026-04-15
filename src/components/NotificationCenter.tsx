import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  BellOff,
  CarFront,
  Check,
  CheckCheck,
  CircleDollarSign,
  Filter,
  Inbox,
  LifeBuoy,
  MessageSquare,
  Mail,
  MessageCircleMore,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import type { Notification } from '../../shared/domain-contracts';
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
  type NotificationChannelPreview,
  type NotificationCategory,
  type NotificationFilter,
  type NotificationStakeholder,
} from '../features/notifications/notificationCenterModel';

type FilterConfig = {
  value: NotificationFilter;
  label: string;
  icon: typeof Bell;
};

const CATEGORY_ICON: Record<NotificationCategory, typeof CarFront> = {
  rides: CarFront,
  messages: MessageSquare,
  wallet: CircleDollarSign,
  trust: ShieldCheck,
  support: LifeBuoy,
  system: Bell,
};

const CATEGORY_ACCENT: Record<NotificationCategory, string> = {
  rides: 'from-cyan-500/25 via-sky-500/10 to-transparent text-cyan-100 border-cyan-400/20',
  messages: 'from-blue-500/25 via-indigo-500/10 to-transparent text-blue-100 border-blue-400/20',
  wallet: 'from-emerald-500/25 via-lime-500/10 to-transparent text-emerald-100 border-emerald-400/20',
  trust: 'from-amber-500/25 via-orange-500/10 to-transparent text-amber-100 border-amber-400/20',
  support: 'from-rose-500/25 via-pink-500/10 to-transparent text-rose-100 border-rose-400/20',
  system: 'from-slate-500/25 via-slate-400/10 to-transparent text-slate-100 border-slate-400/20',
};

const CHANNEL_ICON: Record<NotificationChannelPreview, typeof Bell> = {
  in_app: Bell,
  push: Smartphone,
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircleMore,
};

const STAKEHOLDER_TONE: Record<NotificationStakeholder, string> = {
  rider: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
  driver: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  operations: 'border-violet-400/20 bg-violet-400/10 text-violet-100',
  support: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  finance: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  trust: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  system: 'border-slate-400/20 bg-slate-400/10 text-slate-100',
};

function formatRelativeTimestamp(dateString: string, locale: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffMins) < 60) return formatter.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 7) return formatter.format(diffDays, 'day');

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function NotificationMetric({
  label,
  value,
  tone,
  helper,
}: {
  label: string;
  value: string | number;
  tone: string;
  helper: string;
}) {
  return (
    <div className={`rounded-[24px] border bg-gradient-to-br p-4 ${tone}`}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-300">{helper}</div>
    </div>
  );
}

function getActionLabel(notification: Notification, labels: Record<string, string>) {
  const category = getNotificationCategory(notification);
  if (category === 'rides') return labels.openRide;
  if (category === 'messages') return labels.openMessage;
  if (category === 'wallet') return labels.openWallet;
  if (category === 'support') return labels.openSupport;
  return labels.view;
}

function getTopStakeholders(
  counts: Record<NotificationStakeholder, number>,
): Array<[NotificationStakeholder, number]> {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4) as Array<[NotificationStakeholder, number]>;
}

export function NotificationCenter() {
  const nav = useIframeSafeNavigate();
  const {
    notifications,
    unreadCount,
    archivedIds,
    loading,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    restoreArchivedNotifications,
    refresh,
  } = useNotifications();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const locale = isRTL ? 'ar-JO' : 'en';
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const labels = {
    title: isRTL ? 'مركز الإشعارات' : 'Notification Center',
    subtitle: isRTL
      ? 'لوحة واحدة لالتقاط ما يحتاج ردًا سريعًا، متابعة الحركة، وإنهاء المهام قبل أن تتراكم.'
      : 'One sharp place to triage what matters, track movement, and clear important tasks before they pile up.',
    commandDeck: isRTL ? 'لوحة التحكم' : 'Command deck',
    all: isRTL ? 'الكل' : 'All',
    unread: isRTL ? 'غير المقروءة' : 'Unread',
    urgent: isRTL ? 'عاجلة' : 'Urgent',
    archived: isRTL ? 'المؤرشفة' : 'Archived',
    rides: isRTL ? 'الرحلات' : 'Rides',
    messages: isRTL ? 'الرسائل' : 'Messages',
    wallet: isRTL ? 'المحفظة' : 'Wallet',
    trust: isRTL ? 'الثقة' : 'Trust',
    support: isRTL ? 'الدعم' : 'Support',
    system: isRTL ? 'النظام' : 'System',
    total: isRTL ? 'المرئية' : 'Visible',
    unreadCount: isRTL ? 'تحتاج انتباهًا' : 'Need attention',
    urgentCount: isRTL ? 'أولوية عالية' : 'High priority',
    archivedCount: isRTL ? 'مخفية' : 'Archived',
    totalHelper: isRTL ? 'الإشعارات المتاحة في هذا العرض الآن.' : 'Notifications currently available in this workspace.',
    unreadHelper: isRTL ? 'العناصر التي لم تُغلق بعد وتحتاج مرورًا سريعًا.' : 'Items still waiting for a quick pass from you.',
    urgentHelper: isRTL ? 'التنبيهات التي قد تؤثر على الرحلات أو الخدمة فورًا.' : 'Signals most likely to affect trips or service right away.',
    archivedHelper: isRTL ? 'محفوظة بعيدًا لكن يمكن استعادتها في أي وقت.' : 'Stored away cleanly and ready to restore anytime.',
    searchPlaceholder: isRTL ? 'ابحث في العنوان أو الرسالة أو النوع' : 'Search by title, message, or type',
    markAllRead: isRTL ? 'تعيين الكل كمقروء' : 'Mark all read',
    restoreArchived: isRTL ? 'استعادة المؤرشفة' : 'Restore archived',
    refresh: isRTL ? 'تحديث' : 'Refresh',
    view: isRTL ? 'فتح' : 'Open',
    markRead: isRTL ? 'تعيين كمقروء' : 'Mark read',
    archive: isRTL ? 'أرشفة' : 'Archive',
    today: isRTL ? 'اليوم' : 'Today',
    week: isRTL ? 'آخر 7 أيام' : 'Last 7 days',
    earlier: isRTL ? 'أقدم' : 'Earlier',
    online: isRTL ? 'متصل' : 'Online',
    offline: isRTL ? 'غير متصل' : 'Offline',
    syncing: isRTL ? 'مزامنة' : 'Syncing',
    noResults: isRTL ? 'لا توجد نتائج' : 'No results',
    emptyAll: isRTL ? 'لم تصل أي إشعارات بعد.' : 'No notifications have landed yet.',
    emptyFiltered: isRTL ? 'هذا العرض هادئ الآن.' : 'This view is quiet right now.',
    localDraft: isRTL ? 'محلي' : 'Local',
    urgentBadge: isRTL ? 'عاجل' : 'Urgent',
    highBadge: isRTL ? 'مرتفع' : 'High',
    spotlight: isRTL ? 'التركيز الآن' : 'Focus now',
    spotlightQuiet: isRTL ? 'كل شيء تحت السيطرة' : 'Everything looks under control',
    spotlightQuietCopy: isRTL
      ? 'لا توجد تنبيهات عاجلة في المقدمة. يمكنك استخدام الفلاتر للرجوع إلى عناصر أقدم.'
      : 'No critical items are floating to the top. Use filters to sweep older work without losing focus.',
    spotlightAction: isRTL ? 'أسرع إجراء' : 'Fastest win',
    spotlightActionCopy: isRTL
      ? 'ابدأ بالإشعار الأعلى تأثيرًا ثم صفِّ الباقي حسب الأولوية.'
      : 'Start with the highest-impact alert first, then clear the queue by priority.',
    liveQueue: isRTL ? 'صف حي' : 'Live queue',
    liveQueueCopy: isRTL
      ? 'المزامنة والبحث والفلاتر تعمل معًا حتى تبقى الصورة واضحة.'
      : 'Sync, search, and filtering work together so the queue stays readable under load.',
    viewSummary: isRTL ? 'ملخص العرض' : 'View summary',
    filteredCount: isRTL ? 'مطابقات' : 'Matches',
    unreadInView: isRTL ? 'غير مقروء في العرض' : 'Unread in view',
    sectionCount: isRTL ? 'عنصر' : 'items',
    openRide: isRTL ? 'فتح الرحلة' : 'Open trip',
    openMessage: isRTL ? 'فتح المحادثة' : 'Open chat',
    openWallet: isRTL ? 'فتح المحفظة' : 'Open wallet',
    openSupport: isRTL ? 'فتح الدعم' : 'Open support',
    communicationMap: isRTL ? 'خريطة التواصل' : 'Communication map',
    communicationMapCopy: isRTL
      ? 'يوضح هذا العرض من يتأثر الآن وكيف تتحرك الرسائل بينهم.'
      : 'This view shows who is affected right now and how updates are likely moving between them.',
    stakeholders: isRTL ? 'الأطراف' : 'Stakeholders',
    channels: isRTL ? 'القنوات' : 'Channels',
    escalation: isRTL ? 'التصعيد' : 'Escalation',
    audience: isRTL ? 'الجمهور' : 'Audience',
    stakeholderRider: isRTL ? 'راكب' : 'Rider',
    stakeholderDriver: isRTL ? 'سائق' : 'Driver',
    stakeholderOperations: isRTL ? 'العمليات' : 'Operations',
    stakeholderSupport: isRTL ? 'الدعم' : 'Support',
    stakeholderFinance: isRTL ? 'المالية' : 'Finance',
    stakeholderTrust: isRTL ? 'الثقة' : 'Trust',
    stakeholderSystem: isRTL ? 'النظام' : 'System',
    channelInApp: isRTL ? 'داخل التطبيق' : 'In-app',
    channelPush: isRTL ? 'دفع' : 'Push',
    channelEmail: isRTL ? 'بريد' : 'Email',
    channelSms: isRTL ? 'رسائل' : 'SMS',
    channelWhatsapp: isRTL ? 'واتساب' : 'WhatsApp',
  };

  const archivedSet = useMemo(() => new Set(archivedIds), [archivedIds]);

  const summary = useMemo(
    () => getNotificationSummary(notifications, archivedSet),
    [archivedSet, notifications],
  );

  const filterCounts = useMemo(
    () => buildFilterCounts(notifications, archivedSet),
    [archivedSet, notifications],
  );

  const stakeholderCounts = useMemo(
    () => buildStakeholderCounts(notifications, archivedSet),
    [archivedSet, notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          matchesNotificationFilter({ notification, filter, archivedIds: archivedSet }) &&
          matchesNotificationSearch(notification, deferredSearchTerm),
      ),
    [archivedSet, deferredSearchTerm, filter, notifications],
  );

  const rankedNotifications = useMemo(
    () => rankNotifications(filteredNotifications),
    [filteredNotifications],
  );

  const spotlightNotification = rankedNotifications[0];
  const visibleUnread = filteredNotifications.filter((notification) => !notification.read).length;
  const topStakeholders = useMemo(
    () => getTopStakeholders(stakeholderCounts),
    [stakeholderCounts],
  );

  const stakeholderLabels: Record<NotificationStakeholder, string> = {
    rider: labels.stakeholderRider,
    driver: labels.stakeholderDriver,
    operations: labels.stakeholderOperations,
    support: labels.stakeholderSupport,
    finance: labels.stakeholderFinance,
    trust: labels.stakeholderTrust,
    system: labels.stakeholderSystem,
  };

  const channelLabels: Record<NotificationChannelPreview, string> = {
    in_app: labels.channelInApp,
    push: labels.channelPush,
    email: labels.channelEmail,
    sms: labels.channelSms,
    whatsapp: labels.channelWhatsapp,
  };

  const sections = useMemo(
    () =>
      buildNotificationSections(rankedNotifications, new Date(), {
        today: labels.today,
        week: labels.week,
        earlier: labels.earlier,
      }),
    [labels.earlier, labels.today, labels.week, rankedNotifications],
  );

  const filters: FilterConfig[] = [
    { value: 'all', label: labels.all, icon: Inbox },
    { value: 'unread', label: labels.unread, icon: Bell },
    { value: 'urgent', label: labels.urgent, icon: TriangleAlert },
    { value: 'rides', label: labels.rides, icon: CarFront },
    { value: 'messages', label: labels.messages, icon: MessageSquare },
    { value: 'wallet', label: labels.wallet, icon: CircleDollarSign },
    { value: 'trust', label: labels.trust, icon: ShieldCheck },
    { value: 'support', label: labels.support, icon: LifeBuoy },
    { value: 'system', label: labels.system, icon: Bell },
    { value: 'archived', label: labels.archived, icon: Trash2 },
  ];

  const handleOpenAction = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id).catch(() => undefined);
    }

    if (!notification.action_url) {
      return;
    }

    if (notification.action_url.startsWith('/')) {
      await nav(notification.action_url);
      return;
    }

    window.open(notification.action_url, '_blank', 'noopener,noreferrer');
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="size-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%),linear-gradient(135deg,rgba(3,9,20,0.98),rgba(10,18,33,0.98))] shadow-[0_30px_90px_-50px_rgba(34,211,238,0.65)]">
        <CardHeader className="border-b border-white/8 pb-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                <Sparkles className="size-3.5" />
                {labels.commandDeck}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight text-white">
                  {labels.title}
                </CardTitle>
                <p className="max-w-3xl text-sm leading-6 text-slate-300">{labels.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 border-white/15 bg-white/5 px-3 py-1.5">
                {connectionStatus === 'online' && <Wifi className="size-3 text-emerald-400" />}
                {connectionStatus === 'offline' && <WifiOff className="size-3 text-rose-400" />}
                {connectionStatus === 'syncing' && (
                  <RefreshCw className="size-3 animate-spin text-cyan-300" />
                )}
                <span className="text-slate-200">
                  {connectionStatus === 'online'
                    ? labels.online
                    : connectionStatus === 'offline'
                      ? labels.offline
                      : labels.syncing}
                </span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
                disabled={connectionStatus === 'offline'}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <RefreshCw
                  className={`size-4 ${connectionStatus === 'syncing' ? 'animate-spin' : ''}`}
                />
                {labels.refresh}
              </Button>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => void markAllAsRead()}
                  className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                >
                  <CheckCheck className="size-4" />
                  {labels.markAllRead}
                </Button>
              )}
              {summary.archived > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={restoreArchivedNotifications}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  {labels.restoreArchived}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 pt-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NotificationMetric
              label={labels.total}
              value={summary.total}
              helper={labels.totalHelper}
              tone="border-white/10"
            />
            <NotificationMetric
              label={labels.unreadCount}
              value={summary.unread}
              helper={labels.unreadHelper}
              tone="border-cyan-400/20"
            />
            <NotificationMetric
              label={labels.urgentCount}
              value={summary.urgent}
              helper={labels.urgentHelper}
              tone="border-amber-400/20"
            />
            <NotificationMetric
              label={labels.archivedCount}
              value={summary.archived}
              helper={labels.archivedHelper}
              tone="border-slate-400/20"
            />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            {spotlightNotification ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-200">
                    <TriangleAlert className="size-3.5" />
                    {labels.spotlight}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatRelativeTimestamp(spotlightNotification.created_at, locale)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-white">{spotlightNotification.title}</div>
                  <p className="text-sm leading-6 text-slate-300">
                    {spotlightNotification.message}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
                    {filters.find(
                      (entry) => entry.value === getNotificationCategory(spotlightNotification),
                    )?.label ?? labels.system}
                  </Badge>
                  {getNotificationStakeholders(spotlightNotification).slice(0, 3).map((stakeholder) => (
                    <Badge
                      key={stakeholder}
                      variant="outline"
                      className={STAKEHOLDER_TONE[stakeholder]}
                    >
                      {stakeholderLabels[stakeholder]}
                    </Badge>
                  ))}
                  {!spotlightNotification.read && (
                    <Badge className="bg-cyan-400 text-slate-950 hover:bg-cyan-400">
                      {labels.unread}
                    </Badge>
                  )}
                  {(spotlightNotification.priority === 'urgent' ||
                    spotlightNotification.priority === 'high') && (
                    <Badge
                      variant="outline"
                      className="border-amber-400/30 bg-amber-400/10 text-amber-100"
                    >
                      {spotlightNotification.priority === 'urgent'
                        ? labels.urgentBadge
                        : labels.highBadge}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      {labels.spotlightAction}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {labels.spotlightActionCopy}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      {labels.communicationMap}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {labels.communicationMapCopy}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getNotificationChannelPreview(spotlightNotification).map((channel) => {
                        const Icon = CHANNEL_ICON[channel];
                        return (
                          <span
                            key={channel}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
                          >
                            <Icon className="size-3.5" />
                            {channelLabels[channel]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center gap-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-200">
                  <CheckCheck className="size-3.5" />
                  {labels.spotlightQuiet}
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-300">
                  {labels.spotlightQuietCopy}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(11,16,30,0.94),rgba(11,16,30,0.8))] backdrop-blur">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => {
                    setSearchTerm(nextValue);
                  });
                }}
                placeholder={labels.searchPlaceholder}
                className="h-12 rounded-2xl border-white/10 bg-background/50 pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                <Filter className="size-3.5" />
                {labels.viewSummary}
              </div>
              <Badge variant="outline" className="border-white/10 bg-black/10 text-slate-100">
                {labels.filteredCount}: {rankedNotifications.length}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-black/10 text-slate-100">
                {labels.unreadInView}: {visibleUnread}
              </Badge>
            </div>
          </div>

          {topStakeholders.length > 0 && (
            <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
              <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                {labels.communicationMap}
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {topStakeholders.map(([stakeholder, count]) => (
                  <div
                    key={stakeholder}
                    className={`rounded-2xl border px-3 py-3 ${STAKEHOLDER_TONE[stakeholder]}`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                      {stakeholderLabels[stakeholder]}
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {filters.map((entry) => {
              const Icon = entry.icon;
              const isActive = filter === entry.value;
              const count = filterCounts[entry.value];

              return (
                <Button
                  key={entry.value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(entry.value)}
                  className={
                    isActive
                      ? 'h-10 rounded-full bg-white text-slate-950 hover:bg-white/90'
                      : 'h-10 rounded-full border-white/10 bg-background/40 text-slate-200 hover:bg-white/10 hover:text-white'
                  }
                >
                  <Icon className="size-4" />
                  {entry.label}
                  <span
                    className={
                      isActive
                        ? 'rounded-full bg-slate-950/10 px-2 py-0.5 text-[11px]'
                        : 'rounded-full bg-white/10 px-2 py-0.5 text-[11px]'
                    }
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {sections.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-card/70">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                {filter === 'archived' ? (
                  <Trash2 className="size-8 text-muted-foreground" />
                ) : (
                  <BellOff className="size-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{labels.noResults}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {searchTerm || filter !== 'all' ? labels.emptyFiltered : labels.emptyAll}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sections.map((section) => (
            <div key={section.key} className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {section.title}
                </div>
                <div className="text-xs text-slate-400">
                  {section.items.length} {labels.sectionCount}
                </div>
              </div>

              <ScrollArea className="max-h-[720px]">
                <div className="space-y-3 pr-2">
                  {section.items.map((notification, index) => {
                    const category = getNotificationCategory(notification);
                    const Icon = CATEGORY_ICON[category];
                    const accent = CATEGORY_ACCENT[category];
                    const actionLabel = getActionLabel(notification, labels);
                    const stakeholders = getNotificationStakeholders(notification);
                    const channels = getNotificationChannelPreview(notification);
                    const escalationLabel = getNotificationEscalationLabel(notification);

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.18 }}
                      >
                        <Card
                          className={`overflow-hidden border bg-[linear-gradient(135deg,rgba(7,11,24,0.96),rgba(10,15,27,0.92))] ${notification.read ? 'border-white/8' : 'border-cyan-400/20 shadow-[0_18px_48px_-36px_rgba(34,211,238,0.65)]'}`}
                        >
                          <CardContent className="p-0">
                            <div className="grid gap-0 md:grid-cols-[auto,1fr]">
                              <div
                                className={`flex items-center justify-center border-b border-white/8 bg-gradient-to-b p-5 md:border-b-0 md:border-r ${accent}`}
                              >
                                <div className="rounded-[22px] border border-white/10 bg-black/15 p-3.5">
                                  <Icon className="size-5" />
                                </div>
                              </div>

                              <div className="space-y-4 p-5">
                                <div className="flex flex-wrap items-start gap-2">
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-base font-semibold text-white">
                                        {notification.title}
                                      </h3>
                                      {!notification.read && (
                                        <span className="inline-flex size-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                                      )}
                                      {notification.priority === 'urgent' && (
                                        <Badge variant="destructive">{labels.urgentBadge}</Badge>
                                      )}
                                      {notification.priority === 'high' && (
                                        <Badge
                                          variant="outline"
                                          className="border-amber-400/30 bg-amber-400/10 text-amber-100"
                                        >
                                          {labels.highBadge}
                                        </Badge>
                                      )}
                                      {notification.source === 'local' && (
                                        <Badge
                                          variant="outline"
                                          className="border-white/15 bg-white/5 text-slate-100"
                                        >
                                          {labels.localDraft}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="max-w-3xl text-sm leading-6 text-slate-300">
                                      {notification.message}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                  <Badge
                                    variant="outline"
                                    className="border-white/10 bg-black/10 text-slate-200"
                                  >
                                    {filters.find((entry) => entry.value === category)?.label ?? category}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border-white/10 bg-black/10 text-slate-200"
                                  >
                                    {labels.escalation}: {escalationLabel}
                                  </Badge>
                                  <span>{formatRelativeTimestamp(notification.created_at, locale)}</span>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-3">
                                  <div className="rounded-2xl border border-white/8 bg-black/10 p-3 lg:col-span-2">
                                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                      {labels.communicationMap}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {stakeholders.map((stakeholder) => (
                                        <span
                                          key={stakeholder}
                                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${STAKEHOLDER_TONE[stakeholder]}`}
                                        >
                                          {stakeholderLabels[stakeholder]}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                      {labels.channels}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {channels.map((channel) => {
                                        const ChannelIcon = CHANNEL_ICON[channel];
                                        return (
                                          <span
                                            key={channel}
                                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
                                          >
                                            <ChannelIcon className="size-3.5" />
                                            {channelLabels[channel]}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                      {labels.spotlightAction}
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                      {notification.action_url ? actionLabel : labels.liveQueue}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                      {notification.action_url
                                        ? labels.spotlightActionCopy
                                        : labels.liveQueueCopy}
                                    </p>
                                    <div className="mt-3 text-xs text-slate-400">
                                      {labels.escalation}: {escalationLabel}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
                                  {notification.action_url && (
                                    <Button size="sm" onClick={() => void handleOpenAction(notification)}>
                                      {actionLabel}
                                    </Button>
                                  )}
                                  {!notification.read && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void markAsRead(notification.id)}
                                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                    >
                                      <Check className="size-4" />
                                      {labels.markRead}
                                    </Button>
                                  )}
                                  {filter !== 'archived' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => archiveNotification(notification.id)}
                                      className="text-slate-200 hover:bg-black/10 hover:text-white"
                                    >
                                      <Trash2 className="size-4" />
                                      {labels.archive}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
