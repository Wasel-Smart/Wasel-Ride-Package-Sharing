import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bus, Car, Package, Wallet, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getStoredBusBookings, type StoredBusBooking } from '../../services/bus';
import { getConnectedPackages, type PackageRequest } from '../../services/journeyLogistics';
import { getRideBookings, type RideBookingRecord } from '../../services/rideLifecycle';
import { supabase } from '../../utils/supabase/client';
import { C, F, R, TYPE } from '../../utils/wasel-ds';
import { PageShell, SectionCard, StatusBadge } from '../../components/wasel-ui/WaselPagePrimitives';

type TimelineItem = {
  id: string;
  kind: 'ride' | 'package' | 'bus' | 'scheduled';
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

export function ActivityPage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const [filter, setFilter] = useState<'all' | 'ride' | 'package' | 'bus' | 'scheduled'>('all');
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

      if (!cancelled && data) {
        setScheduledItems(data as ScheduledPickupRow[]);
      }
    }

    void loadScheduled();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const items: TimelineItem[] = useMemo(() => {
    const mapped: TimelineItem[] = [];

    rides.forEach((b: RideBookingRecord) => {
      mapped.push({
        id: b.id,
        kind: 'ride',
        title: b.from ? `${b.from} → ${b.to}` : (ar ? 'رحلة' : 'Ride'),
        subtitle: ar ? `مقاعد: ${b.seatsRequested}` : `Seats: ${b.seatsRequested}`,
        date: b.date,
        time: b.time,
        status: b.status,
        statusColor:
          b.status === 'completed'
            ? C.green
            : b.status === 'cancelled'
              ? C.error
              : b.status === 'rejected'
                ? C.error
                : b.status === 'confirmed'
                  ? C.cyan
                  : C.gold,
        Icon: Car,
        path: `/app/live-trip?id=${b.id}`,
      });
    });

    packages.forEach((p: PackageRequest) => {
      mapped.push({
        id: p.id,
        kind: 'package',
        title: ar ? `طرد: ${p.trackingId}` : `Package: ${p.trackingId}`,
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
        title: ar ? 'باص' : 'Bus',
        subtitle: `${b.pickupStop} → ${b.dropoffStop}`,
        date: b.scheduleDate,
        time: b.departureTime,
        amount: Number(b.totalPrice ?? 0),
        status: b.status,
        statusColor: b.status === 'confirmed' || b.status === 'completed' ? C.green : b.status === 'cancelled' ? C.error : C.gold,
        Icon: Bus,
        path: '/app/bus',
      });
    });

    scheduledItems.forEach(s => {
      const typeCol = s.item_type === 'ride' ? C.cyan : s.item_type === 'package_delivery' ? C.gold : C.green;
      const typeLabel = s.item_type === 'ride' ? (ar ? 'رحلة مجدولة' : 'Scheduled ride') : s.item_type === 'package_delivery' ? (ar ? 'توصيل مجدولة' : 'Scheduled delivery') : (ar ? 'إرجاع مجدول' : 'Scheduled return');
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

    mapped.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(b.time));

    return mapped;
  }, [rides, packages, buses, scheduledItems, ar]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.kind === filter)),
    [items, filter],
  );

  const totalSpent = useMemo(
    () => filtered.reduce((sum, i) => sum + (i.amount ?? 0), 0),
    [filtered],
  );

  const filters: { key: typeof filter; label: string; labelAr: string }[] = [
    { key: 'all', label: 'All', labelAr: 'الكل' },
    { key: 'ride', label: 'Rides', labelAr: 'رحلات' },
    { key: 'package', label: 'Delivery', labelAr: 'توصيل' },
    { key: 'bus', label: 'Bus', labelAr: 'باص' },
    { key: 'scheduled', label: 'Scheduled', labelAr: 'مجدول' },
  ];

  return (
    <PageShell>
      <SectionCard
        title={ar ? 'نشاطي' : 'My Activity'}
        subtitle={ar ? 'كل رحلة ودفع في مكان واحد' : 'Every trip and payment in one place'}
        icon={<Wallet size={18} color={C.gold} />}
        action={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: R.md,
              background: C.card,
              border: `1px solid ${C.border}`,
            }}
          >
            <Wallet size={16} color={C.gold} />
            <span style={{ color: C.text, fontWeight: TYPE.weight.bold, fontFamily: F }}>
              JOD {totalSpent.toFixed(2)}
            </span>
            <span style={{ color: C.textMuted, fontSize: TYPE.size.sm }}>
              {ar ? 'إجمالي' : 'total'}
            </span>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map(f => (
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

        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: C.textMuted,
            }}
          >
            <Package size={32} color={C.textDim} />
            <div style={{ marginTop: 12, fontFamily: F, fontSize: TYPE.size.base }}>
              {ar ? 'لا توجد عناصر بعد.' : 'No items yet.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 0, marginTop: 16 }}>
            {filtered.map(item => {
              const statusLabel =
                item.status === 'pending_driver'
                  ? ar
                    ? 'بانتظار السائق'
                    : 'Pending driver'
                  : item.status === 'pending'
                    ? ar
                      ? 'قيد الانتظار'
                      : 'Pending'
                    : item.status === 'confirmed'
                      ? ar
                        ? 'مؤكد'
                        : 'Confirmed'
                      : item.status === 'completed'
                        ? ar
                          ? 'مكتمل'
                          : 'Completed'
                        : item.status === 'cancelled'
                          ? ar
                            ? 'ملغي'
                            : 'Cancelled'
                          : item.status === 'rejected'
                            ? ar
                              ? 'مرفوض'
                              : 'Rejected'
                            : item.status === 'delivered'
                              ? ar
                                ? 'تم التوصيل'
                                : 'Delivered'
                              : item.status === 'in_transit'
                                ? ar
                                  ? 'في الطريق'
                                  : 'In transit'
                                : item.status === 'scheduled'
                                  ? ar
                                    ? 'مجدول'
                                    : 'Scheduled'
                                  : item.status === 'missed'
                                    ? ar
                                      ? 'فائت'
                                      : 'Missed'
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
                      {item.amount !== undefined && (
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
        )}
      </SectionCard>
    </PageShell>
  );
}