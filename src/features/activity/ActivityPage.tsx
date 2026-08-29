import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bus, Car, Calendar, Package } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getStoredBusBookings, type StoredBusBooking } from '../../services/bus';
import { getConnectedPackages, type PackageRequest } from '../../services/journeyLogistics';
import { getRideBookings, type RideBookingRecord } from '../../services/rideLifecycle';
import { supabase } from '../../utils/supabase/client';
import { C, F, R, TYPE } from '../../utils/wasel-ds';
import { PageShell, SectionCard, StatusBadge } from '../../components/wasel-ui/WaselPagePrimitives';

type ItemKind = 'ride' | 'package' | 'bus' | 'scheduled';

type TimelineItem = {
  id: string;
  kind: ItemKind;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  amount?: number;
  status: string;
  statusColor: string;
  Icon: typeof Car;
  path: string;
};

type ScheduledPickupRow = {
  id: string;
  item_type: 'ride' | 'package_delivery' | 'package_return';
  status: string;
  pickup_location: string;
  dropoff_location?: string;
  scheduled_at: string;
  estimated_price?: number;
};

const STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  pending_driver: { en: 'Pending driver', ar: 'بانتظار السائق' },
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  delivered: { en: 'Delivered', ar: 'تم التوصيل' },
  in_transit: { en: 'In transit', ar: 'في الطريق' },
  scheduled: { en: 'Scheduled', ar: 'مجدول' },
  missed: { en: 'Missed', ar: 'فائت' },
};

const EMPTY_CTA: Record<ItemKind, { en: string; ar: string; path: string }> = {
  ride: { en: 'Book your first ride', ar: 'احجز رحلتك الأولى', path: '/app/find-ride' },
  package: { en: 'Send a package', ar: 'أرسل طرداً', path: '/app/packages' },
  bus: { en: 'Browse bus routes', ar: 'تصفح خطوط الباص', path: '/app/bus' },
  scheduled: { en: 'Schedule a pickup', ar: 'جدول استلاماً', path: '/app/schedule' },
};

function groupByDate(items: TimelineItem[]): { label: string; items: TimelineItem[] }[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0] ?? '';
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0] ?? '';

  const groups: { today: TimelineItem[]; week: TimelineItem[]; earlier: TimelineItem[] } = {
    today: [],
    week: [],
    earlier: [],
  };
  for (const item of items) {
    if (item.date === todayStr) groups.today.push(item);
    else if (item.date >= weekAgoStr) groups.week.push(item);
    else groups.earlier.push(item);
  }

  return [
    { label: 'Today', items: groups.today },
    { label: 'This week', items: groups.week },
    { label: 'Earlier', items: groups.earlier },
  ].filter(g => g.items.length > 0);
}

export function ActivityPage() {
  const { user } = useLocalAuth();
  const { language, t } = useLanguage();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const [filter, setFilter] = useState<'all' | ItemKind>('all');
  const [scheduledItems, setScheduledItems] = useState<ScheduledPickupRow[]>([]);

  const rides = useMemo(() => getRideBookings(), []);
  const packages = useMemo(() => getConnectedPackages(), []);
  const buses = useMemo(() => getStoredBusBookings(), []);

  useEffect(() => {
    let cancelled = false;
    async function loadScheduled() {
      if (!supabase || !user?.id) return;
      const { data } = await supabase
        .from('scheduled_pickups')
        .select('id,item_type,status,pickup_location,dropoff_location,scheduled_at,estimated_price')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: false });
      if (!cancelled && data) setScheduledItems(data as ScheduledPickupRow[]);
    }
    void loadScheduled();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const items: TimelineItem[] = useMemo(() => {
    const mapped: TimelineItem[] = [];

    rides.forEach((b: RideBookingRecord) => {
      const isActive = b.status === 'confirmed' || b.status === 'pending_driver';
      mapped.push({
        id: b.id,
        kind: 'ride',
        title: b.from ? `${b.from} → ${b.to}` : t('activity.rideTitle'),
        subtitle: t('activity.seatsLabel') + ': ' + b.seatsRequested,
        date: b.date,
        time: b.time,
        status: b.status,
        statusColor:
          b.status === 'completed'
            ? C.green
            : b.status === 'cancelled' || b.status === 'rejected'
              ? C.error
              : b.status === 'confirmed'
                ? C.cyan
                : C.gold,
        Icon: Car,
        path: isActive ? `/app/live-trip?id=${b.id}` : '/app/trips',
      });
    });

    packages.forEach((p: PackageRequest) => {
      mapped.push({
        id: p.id,
        kind: 'package',
        title: t('activity.packageTitle') + ': ' + p.trackingId,
        subtitle: `${p.from} → ${p.to}`,
        date: p.createdAt?.split('T')[0] ?? '',
        time: p.createdAt?.split('T')[1]?.slice(0, 5) ?? '',
        status: p.status,
        statusColor:
          p.status === 'delivered' ? C.green : p.status === 'in_transit' ? C.cyan : C.gold,
        Icon: Package,
        path: '/app/packages',
      });
    });

    buses.forEach((b: StoredBusBooking) => {
      mapped.push({
        id: b.id,
        kind: 'bus',
        title: t('activity.busTitle'),
        subtitle: `${b.pickupStop} → ${b.dropoffStop}`,
        date: b.scheduleDate,
        time: b.departureTime,
        amount: Number(b.totalPrice ?? 0),
        status: b.status,
        statusColor:
          b.status === 'confirmed' || b.status === 'completed'
            ? C.green
            : b.status === 'cancelled'
              ? C.error
              : C.gold,
        Icon: Bus,
        path: '/app/bus',
      });
    });

    scheduledItems.forEach(s => {
      const typeCol =
        s.item_type === 'ride' ? C.cyan : s.item_type === 'package_delivery' ? C.gold : C.green;
      const typeLabel =
        s.item_type === 'ride'
          ? t('activity.scheduledRide')
          : s.item_type === 'package_delivery'
            ? t('activity.scheduledDelivery')
            : t('activity.scheduledReturn');
      mapped.push({
        id: s.id,
        kind: 'scheduled',
        title: typeLabel,
        subtitle: `${s.pickup_location}${s.dropoff_location ? ' → ' + s.dropoff_location : ''}`,
        date: (s.scheduled_at ?? '').split('T')[0] ?? '',
        time: (s.scheduled_at ?? '').split('T')[1]?.slice(0, 5) ?? '',
        amount: s.estimated_price ?? 0,
        status: s.status,
        statusColor: typeCol,
        Icon: Calendar,
        path: '/app/schedule',
      });
    });

    // Fixed sort: was b.time.localeCompare(b.time) — always 0
    mapped.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    return mapped;
  }, [rides, packages, buses, scheduledItems, ar]);

  const countByKind = useMemo(() => {
    const counts: Record<string, number> = { ride: 0, package: 0, bus: 0, scheduled: 0 };
    for (const item of items) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    return counts;
  }, [items]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.kind === filter)),
    [items, filter],
  );

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const filterDefs: { key: typeof filter; label: string; labelAr: string }[] = [
    { key: 'all', label: `All (${items.length})`, labelAr: `الكل (${items.length})` },
    {
      key: 'ride',
      label: `Rides (${countByKind['ride'] ?? 0})`,
      labelAr: `رحلات (${countByKind['ride'] ?? 0})`,
    },
    {
      key: 'package',
      label: `Delivery (${countByKind['package'] ?? 0})`,
      labelAr: `توصيل (${countByKind['package'] ?? 0})`,
    },
    {
      key: 'bus',
      label: `Bus (${countByKind['bus'] ?? 0})`,
      labelAr: `باص (${countByKind['bus'] ?? 0})`,
    },
    {
      key: 'scheduled',
      label: `Scheduled (${countByKind['scheduled'] ?? 0})`,
      labelAr: `مجدول (${countByKind['scheduled'] ?? 0})`,
    },
  ];

  return (
    <PageShell>
      <SectionCard
        title={t('activity.pageTitle')}
        subtitle={t('activity.pageSubtitle')}
        icon={<Car size={18} color={C.cyan} />}
      >
        {/* Filter pills with counts */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterDefs.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: R.sm,
                border: `1px solid ${filter === f.key ? C.cyan : C.border}`,
                background: filter === f.key ? C.cyan : C.elevated,
                color: filter === f.key ? C.bg : C.text,
                fontWeight: TYPE.weight.bold,
                fontFamily: F,
                fontSize: TYPE.size.sm,
                cursor: 'pointer',
                transition: 'all 0.14s',
              }}
            >
              {ar ? f.labelAr : f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            {filter !== 'all' &&
              (() => {
                const cta = EMPTY_CTA[filter as ItemKind];
                const KindIcon =
                  { ride: Car, package: Package, bus: Bus, scheduled: Calendar }[
                    filter as ItemKind
                  ] ?? Package;
                return (
                  <>
                    <KindIcon size={32} color={C.textDim} />
                    <div
                      style={{
                        marginTop: 12,
                        color: C.textMuted,
                        fontFamily: F,
                        fontSize: TYPE.size.base,
                      }}
                    >
                      {t('activity.noItemsYet')}
                    </div>
                    <button
                      onClick={() => nav(cta.path)}
                      style={{
                        marginTop: 16,
                        padding: '8px 20px',
                        borderRadius: R.full,
                        border: 'none',
                        background: C.cyan,
                        color: C.bg,
                        fontWeight: TYPE.weight.bold,
                        cursor: 'pointer',
                        fontSize: TYPE.size.sm,
                      }}
                    >
                      {ar ? cta.ar : cta.en}
                    </button>
                  </>
                );
              })()}
            {filter === 'all' && (
              <>
                <Car size={32} color={C.textDim} />
                <div
                  style={{
                    marginTop: 12,
                    color: C.textMuted,
                    fontFamily: F,
                    fontSize: TYPE.size.base,
                  }}
                >
                  {t('activity.noActivityYet')}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {grouped.map(group => (
              <div key={group.label}>
                <div
                  style={{
                    padding: '10px 0 6px',
                    color: C.textDim,
                    fontSize: TYPE.size.xs,
                    fontWeight: TYPE.weight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  {group.label}
                </div>
                {group.items.map(item => {
                  const statusEntry = STATUS_LABEL[item.status];
                  const statusLabel = statusEntry
                    ? ar
                      ? statusEntry.ar
                      : statusEntry.en
                    : item.status;

                  return (
                    <button
                      key={item.id}
                      onClick={() => nav(item.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        border: 'none',
                        borderBottom: `1px solid ${C.borderFaint}`,
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.14s',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: `${item.statusColor}14`,
                          border: `1px solid ${item.statusColor}26`,
                          display: 'grid',
                          placeItems: 'center',
                          color: item.statusColor,
                          flexShrink: 0,
                        }}
                      >
                        <item.Icon size={20} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: TYPE.weight.bold,
                              color: C.text,
                              fontFamily: F,
                              fontSize: TYPE.size.base,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </span>
                          <StatusBadge label={statusLabel} accent={item.statusColor} />
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: TYPE.size.sm,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.subtitle}
                        </div>
                        <div
                          style={{
                            color: C.textDim,
                            fontSize: TYPE.size.xs,
                            marginTop: 4,
                            display: 'flex',
                            gap: 10,
                          }}
                        >
                          <span>
                            {item.date} {item.time}
                          </span>
                          {item.amount !== undefined && item.amount > 0 && (
                            <span style={{ fontWeight: TYPE.weight.bold, color: C.text }}>
                              JOD {item.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight
                        size={16}
                        color={C.textMuted}
                        style={{ flexShrink: 0, transform: ar ? 'rotate(180deg)' : 'none' }}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}
