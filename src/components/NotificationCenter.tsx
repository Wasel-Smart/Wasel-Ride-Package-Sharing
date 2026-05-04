/**
 * NotificationCenter.tsx  ← REFACTORED
 *
 * Orchestrator only — all sub-components and helpers are now in
 * src/components/notifications/.
 *
 * Before: 39 KB single-file monolith
 * After:  ~6 KB orchestrator + 3 focused modules:
 *   - notificationHelpers.ts    (pure functions + static maps)
 *   - NotificationMetric.tsx    (stat tile)
 *   - NotificationItem.tsx      (notification row card)
 */
import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  Inbox,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { WaselStateCard } from './system/WaselStateCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { normalizeTextTree } from '../utils/textEncoding';
import {
  buildNotificationSections,
  getNotificationSummary,
  matchesNotificationFilter,
  matchesNotificationSearch,
  type NotificationFilter,
} from '../features/notifications/notificationCenterModel';
import { NotificationItem } from './notifications/NotificationItem';
import { NotificationMetric } from './notifications/NotificationMetric';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterConfig = { value: NotificationFilter; label: string };

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const nav = useIframeSafeNavigate();
  const {
    notifications,
    unreadCount,
    archivedIds,
    loading,
    connectionStatus,
    errorMessage,
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

  // ── Labels (bilingual) ──────────────────────────────────────────────────────
  const labels = normalizeTextTree({
    title: isRTL ? 'مركز الإشعارات' : 'Notification Center',
    subtitle: isRTL
      ? 'رتّب التنبيهات المهمة، تابع الحجوزات، وأبقِ العمليات تحت السيطرة.'
      : 'See important updates fast.',
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
    searchPlaceholder: isRTL
      ? 'ابحث في العنوان أو الرسالة أو النوع'
      : 'Search title, message, or type',
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
    emptyAll: isRTL ? 'لم تصل أي إشعارات بعد.' : 'No notifications yet.',
    emptyFiltered: isRTL ? 'هذا العرض هادئ الآن.' : 'Nothing here right now.',
    localDraft: isRTL ? 'محلي' : 'Local',
    urgentBadge: isRTL ? 'عاجل' : 'Urgent',
    highBadge: isRTL ? 'مرتفع' : 'High',
    loadingEyebrow: isRTL ? 'مركز الإشعارات' : 'Notification Center',
    loadingTitle: isRTL ? 'نجهز تدفق الإشعارات الآن' : 'Preparing your notification stream',
    loadingDescription: isRTL
      ? 'نجمع الحجوزات ورسائل الدعم ونشاط المحفظة في موجز واحد واضح.'
      : 'Pulling bookings, support messages, and wallet activity into one clear feed.',
    loadingFooter: isRTL
      ? 'سيمتلئ هذا العرض بمجرد اكتمال المزامنة.'
      : 'This view will fill in as soon as the sync completes.',
    serviceUnavailable: isRTL ? 'خدمة الإشعارات غير متاحة' : 'Notification service unavailable',
    resetView: isRTL ? 'إعادة ضبط العرض' : 'Reset view',
  });

  // ── Derived state ───────────────────────────────────────────────────────────
  const archivedSet = useMemo(() => new Set(archivedIds), [archivedIds]);

  const summary = useMemo(
    () => getNotificationSummary(notifications, archivedSet),
    [archivedSet, notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter(
        n =>
          matchesNotificationFilter({ notification: n, filter, archivedIds: archivedSet }) &&
          matchesNotificationSearch(n, deferredSearchTerm),
      ),
    [archivedSet, deferredSearchTerm, filter, notifications],
  );

  const sections = useMemo(
    () =>
      buildNotificationSections(filteredNotifications, new Date(), {
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleOpenAction = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id).catch(() => undefined);
    }
    if (!notification.action_url) return;
    if (notification.action_url.startsWith('/')) {
      await nav(notification.action_url);
      return;
    }
    window.open(notification.action_url, '_blank', 'noopener,noreferrer');
  };

  const itemLabels = {
    view: labels.view,
    markRead: labels.markRead,
    archive: labels.archive,
    urgentBadge: labels.urgentBadge,
    highBadge: labels.highBadge,
    localDraft: labels.localDraft,
  };

  // ── Loading states ──────────────────────────────────────────────────────────
  if (loading && notifications.length === 0) {
    return (
      <WaselStateCard
        eyebrow={labels.loadingEyebrow}
        title={labels.loadingTitle}
        description={labels.loadingDescription}
        icon={Inbox}
        loading
        footer={labels.loadingFooter}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ── Summary card ── */}
      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),linear-gradient(135deg,rgba(4,12,24,0.96),rgba(8,15,28,0.98))] shadow-[0_28px_80px_-48px_rgba(34,211,238,0.6)]">
        <CardHeader className="border-b border-white/8 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                <Inbox className="size-3.5" />
                {labels.title}
              </div>
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight text-white">
                  {labels.title}
                </CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{labels.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 border-white/15 bg-white/5">
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

        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <NotificationMetric
            label={labels.total}
            value={summary.total}
            tone="border-white/10 text-white"
          />
          <NotificationMetric
            label={labels.unreadCount}
            value={summary.unread}
            tone="border-cyan-400/20 text-cyan-50"
          />
          <NotificationMetric
            label={labels.urgentCount}
            value={summary.urgent}
            tone="border-amber-400/20 text-amber-50"
          />
          <NotificationMetric
            label={labels.archivedCount}
            value={summary.archived}
            tone="border-slate-400/20 text-slate-100"
          />
        </CardContent>
      </Card>

      {/* ── Error banner ── */}
      {errorMessage && (
        <Card className="border-amber-400/25 bg-amber-400/10">
          <CardContent className="flex flex-col gap-3 pt-6 text-sm text-amber-50 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">{labels.serviceUnavailable}</p>
                <p className="text-amber-100/90">{errorMessage}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              className="border-amber-200/30 bg-transparent text-amber-50 hover:bg-amber-300/10"
            >
              <RefreshCw className="size-4" />
              {labels.refresh}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Search + filters ── */}
      <Card className="border-white/10 bg-card/80 backdrop-blur">
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={event => {
                const nextValue = event.target.value;
                startTransition(() => setSearchTerm(nextValue));
              }}
              placeholder={labels.searchPlaceholder}
              className="h-11 rounded-2xl border-white/10 bg-background/60 pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map(entry => (
              <Button
                key={entry.value}
                variant={filter === entry.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(entry.value)}
                className={
                  filter === entry.value
                    ? 'bg-primary text-primary-foreground'
                    : 'border-white/10 bg-background/40'
                }
              >
                {entry.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Notification list ── */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <WaselStateCard
            eyebrow={filter === 'archived' ? labels.archived : labels.title}
            title={labels.noResults}
            description={searchTerm || filter !== 'all' ? labels.emptyFiltered : labels.emptyAll}
            icon={filter === 'archived' ? Trash2 : BellOff}
            minHeight={280}
            actions={
              searchTerm || filter !== 'all' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  {labels.resetView}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => void refresh()}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <RefreshCw className="size-4" />
                  {labels.refresh}
                </Button>
              )
            }
          />
        ) : (
          sections.map(section => (
            <div key={section.key} className="space-y-3">
              <div className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {section.title}
              </div>

              <ScrollArea className="max-h-[720px]">
                <div className="space-y-3 pr-2">
                  {section.items.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      index={index}
                      isRTL={isRTL}
                      filter={filter}
                      filters={filters}
                      labels={itemLabels}
                      onOpen={n => void handleOpenAction(n)}
                      onMarkRead={id => void markAsRead(id)}
                      onArchive={id => archiveNotification(id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
