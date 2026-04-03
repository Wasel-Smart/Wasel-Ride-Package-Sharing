import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CircleDollarSign,
  Inbox,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  CarFront,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import {
  buildNotificationSections,
  getNotificationCategory,
  getNotificationSummary,
  matchesNotificationFilter,
  matchesNotificationSearch,
  type NotificationCategory,
  type NotificationFilter,
} from '../features/notifications/notificationCenterModel';

type FilterConfig = {
  value: NotificationFilter;
  label: string;
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
  rides: 'from-cyan-500/25 to-sky-500/5 text-cyan-300 border-cyan-500/20',
  messages: 'from-blue-500/25 to-indigo-500/5 text-blue-300 border-blue-500/20',
  wallet: 'from-emerald-500/25 to-lime-500/5 text-emerald-300 border-emerald-500/20',
  trust: 'from-amber-500/25 to-orange-500/5 text-amber-300 border-amber-500/20',
  support: 'from-rose-500/25 to-pink-500/5 text-rose-300 border-rose-500/20',
  system: 'from-slate-500/25 to-slate-400/5 text-slate-200 border-slate-500/20',
};

function formatRelativeTimestamp(dateString: string, isRTL: boolean) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
  if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return isRTL ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tone}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
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
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const labels = {
    title: isRTL ? 'مركز الإشعارات' : 'Notification Center',
    subtitle: isRTL
      ? 'رتّب التنبيهات المهمة، تابع الحجوزات، وأبقِ العمليات تحت السيطرة.'
      : 'Triage what matters, follow booking movement, and keep operations under control.',
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
    total: isRTL ? 'مرئية' : 'Visible',
    unreadCount: isRTL ? 'تحتاج انتباهاً' : 'Need attention',
    urgentCount: isRTL ? 'أولوية عالية' : 'High priority',
    archivedCount: isRTL ? 'مخفية' : 'Archived',
    searchPlaceholder: isRTL ? 'ابحث في العنوان أو الرسالة أو النوع' : 'Search title, message, or type',
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
  };

  const archivedSet = useMemo(() => new Set(archivedIds), [archivedIds]);

  const summary = useMemo(
    () => getNotificationSummary(notifications, archivedSet),
    [archivedSet, notifications],
  );

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => (
      matchesNotificationFilter({ notification, filter, archivedIds: archivedSet }) &&
      matchesNotificationSearch(notification, deferredSearchTerm)
    )),
    [archivedSet, deferredSearchTerm, filter, notifications],
  );

  const sections = useMemo(
    () => buildNotificationSections(filteredNotifications, new Date(), {
      today: labels.today,
      week: labels.week,
      earlier: labels.earlier,
    }),
    [filteredNotifications, labels.earlier, labels.today, labels.week],
  );

  const filters: FilterConfig[] = [
    { value: 'all', label: labels.all },
    { value: 'unread', label: labels.unread },
    { value: 'urgent', label: labels.urgent },
    { value: 'rides', label: labels.rides },
    { value: 'messages', label: labels.messages },
    { value: 'wallet', label: labels.wallet },
    { value: 'trust', label: labels.trust },
    { value: 'support', label: labels.support },
    { value: 'system', label: labels.system },
    { value: 'archived', label: labels.archived },
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
    <div className="mx-auto max-w-5xl space-y-5">
      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),linear-gradient(135deg,rgba(4,12,24,0.96),rgba(8,15,28,0.98))] shadow-[0_28px_80px_-48px_rgba(34,211,238,0.6)]">
        <CardHeader className="border-b border-white/8 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                <Inbox className="size-3.5" />
                {labels.title}
              </div>
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight text-white">{labels.title}</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{labels.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 border-white/15 bg-white/5">
                {connectionStatus === 'online' && <Wifi className="size-3 text-emerald-400" />}
                {connectionStatus === 'offline' && <WifiOff className="size-3 text-rose-400" />}
                {connectionStatus === 'syncing' && <RefreshCw className="size-3 animate-spin text-cyan-300" />}
                <span className="text-slate-200">
                  {connectionStatus === 'online' ? labels.online : connectionStatus === 'offline' ? labels.offline : labels.syncing}
                </span>
              </Badge>
              <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={connectionStatus === 'offline'} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <RefreshCw className={`size-4 ${connectionStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {labels.refresh}
              </Button>
              {unreadCount > 0 && (
                <Button size="sm" onClick={() => void markAllAsRead()} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  <CheckCheck className="size-4" />
                  {labels.markAllRead}
                </Button>
              )}
              {summary.archived > 0 && (
                <Button variant="outline" size="sm" onClick={restoreArchivedNotifications} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  {labels.restoreArchived}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <NotificationMetric label={labels.total} value={summary.total} tone="border-white/10 text-white" />
          <NotificationMetric label={labels.unreadCount} value={summary.unread} tone="border-cyan-400/20 text-cyan-50" />
          <NotificationMetric label={labels.urgentCount} value={summary.urgent} tone="border-amber-400/20 text-amber-50" />
          <NotificationMetric label={labels.archivedCount} value={summary.archived} tone="border-slate-400/20 text-slate-100" />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/80 backdrop-blur">
        <CardContent className="space-y-4 pt-6">
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
              className="h-11 rounded-2xl border-white/10 bg-background/60 pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((entry) => (
              <Button
                key={entry.value}
                variant={filter === entry.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(entry.value)}
                className={filter === entry.value ? 'bg-primary text-primary-foreground' : 'border-white/10 bg-background/40'}
              >
                {entry.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sections.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-card/70">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                {filter === 'archived' ? <Trash2 className="size-8 text-muted-foreground" /> : <BellOff className="size-8 text-muted-foreground" />}
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
              <div className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {section.title}
              </div>

              <ScrollArea className="max-h-[720px]">
                <div className="space-y-3 pr-2">
                  {section.items.map((notification, index) => {
                    const category = getNotificationCategory(notification);
                    const Icon = CATEGORY_ICON[category];
                    const accent = CATEGORY_ACCENT[category];

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.18 }}
                      >
                        <Card className={`overflow-hidden border-white/10 bg-gradient-to-br ${accent}`}>
                          <CardContent className="p-0">
                            <div className="grid gap-4 p-5 md:grid-cols-[auto,1fr,auto]">
                              <div className="flex items-start">
                                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                                  <Icon className="size-5" />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-wrap items-start gap-2">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-base font-semibold text-white">{notification.title}</h3>
                                      {!notification.read && (
                                        <span className="inline-flex size-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                                      )}
                                      {notification.priority === 'urgent' && (
                                        <Badge variant="destructive">{labels.urgentBadge}</Badge>
                                      )}
                                      {notification.priority === 'high' && (
                                        <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">
                                          {labels.highBadge}
                                        </Badge>
                                      )}
                                      {notification.source === 'local' && (
                                        <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-100">
                                          {labels.localDraft}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="max-w-3xl text-sm leading-6 text-slate-200/90">{notification.message}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                  <Badge variant="outline" className="border-white/10 bg-black/10 text-slate-200">
                                    {filters.find((entry) => entry.value === category)?.label ?? category}
                                  </Badge>
                                  <span>{formatRelativeTimestamp(notification.created_at, isRTL)}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-start justify-end gap-2">
                                {notification.action_url && (
                                  <Button size="sm" onClick={() => void handleOpenAction(notification)}>
                                    {labels.view}
                                  </Button>
                                )}
                                {!notification.read && (
                                  <Button variant="outline" size="sm" onClick={() => void markAsRead(notification.id)} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                                    <Check className="size-4" />
                                    {labels.markRead}
                                  </Button>
                                )}
                                {filter !== 'archived' && (
                                  <Button variant="ghost" size="sm" onClick={() => archiveNotification(notification.id)} className="text-slate-200 hover:bg-black/10 hover:text-white">
                                    <Trash2 className="size-4" />
                                    {labels.archive}
                                  </Button>
                                )}
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
