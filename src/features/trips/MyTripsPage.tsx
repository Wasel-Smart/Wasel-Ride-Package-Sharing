import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import {
  ArrowRight,
  Bus,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  LifeBuoy,
  MapPin,
  Package,
  Plus,
  ShieldAlert,
  Ticket,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge as PageStatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselButton } from '../../design-system';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLocale } from '../../hooks/useLocale';
import { ListSkeleton } from '../home/HomePageShared';
import { getStoredBusBookings, type StoredBusBooking } from '../../services/bus';
import { getConnectedPackages, type PackageRequest } from '../../services/journeyLogistics';
import {
  syncRideBookingCompletion,
  type RideBookingRecord,
  type RidePaymentStatus,
} from '../../services/rideLifecycle';
import {
  getSupportTickets,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '../../services/supportInbox';
import { C, F, R, SPACE, TYPE } from '../../utils/wasel-ds';

const CARD = C.card;
const CARD_ALT = C.elevated;
const BORDER = C.border;
const CYAN = C.cyan;
const GOLD = C.gold;
const GREEN = C.green;
const RED = C.error;
const AMBER = C.warning;
const TEXT = C.text;
const MUTED = C.textMuted;
const DIM = C.textDim;
const FONT = F;

type TripLifecycle = 'active' | 'attention' | 'completed' | 'cancelled';
type TripKind = 'rides' | 'packages' | 'buses';
type CopyLanguage = 'en' | 'ar';

function tripKindLabel(kind: TripKind, language: CopyLanguage): string {
  if (language !== 'ar') {
    return kind === 'rides' ? 'rides' : kind === 'packages' ? 'packages' : 'buses';
  }
  return kind === 'rides' ? 'الرحلات' : kind === 'packages' ? 'الطرود' : 'الحافلات';
}

interface TripItem {
  id: string;
  kind: TripKind;
  from: string;
  to: string;
  date: string;
  time: string;
  title: string;
  valueLabel: string;
  lifecycle: TripLifecycle;
  primaryStatus: string;
  secondaryStatus?: string;
  ticketLabel?: string;
  captainLabel?: string;
  supportCount: number;
  paymentStatus?: RidePaymentStatus | 'n/a';
  openPath: string;
}

function lifecycleConfig(
  language: CopyLanguage,
): Record<TripLifecycle, { label: string; color: string; bg: string; icon: ReactNode }> {
  const ar = language === 'ar';
  return {
    active: {
      label: ar ? 'نشطة' : 'Active',
      color: CYAN,
      bg: C.cyanDim,
      icon: <Clock size={12} />,
    },
    attention: {
      label: ar ? 'بحاجة متابعة' : 'Needs attention',
      color: AMBER,
      bg: C.goldDim,
      icon: <ShieldAlert size={12} />,
    },
    completed: {
      label: ar ? 'مكتملة' : 'Completed',
      color: GREEN,
      bg: C.greenDim,
      icon: <CheckCircle size={12} />,
    },
    cancelled: {
      label: ar ? 'ملغية' : 'Cancelled',
      color: RED,
      bg: C.errorDim,
      icon: <XCircle size={12} />,
    },
  };
}

function paymentConfig(
  language: CopyLanguage,
): Record<RidePaymentStatus | 'n/a', { label: string; color: string; bg: string }> {
  const ar = language === 'ar';
  return {
    pending: { label: ar ? 'الدفع معلّق' : 'Payment pending', color: AMBER, bg: C.goldDim },
    authorized: { label: ar ? 'الدفع مصرّح' : 'Payment authorized', color: CYAN, bg: C.cyanDim },
    captured: { label: ar ? 'تمت التسوية' : 'Settlement captured', color: GREEN, bg: C.greenDim },
    refunded: { label: ar ? 'تم الاسترداد' : 'Refund completed', color: CYAN, bg: C.blueDim },
    failed: { label: ar ? 'مشكلة دفع' : 'Payment issue', color: RED, bg: C.errorDim },
    'n/a': { label: ar ? 'لا توجد حالة دفع' : 'No payment state', color: MUTED, bg: C.elevated },
  };
}

function supportStatusConfig(
  language: CopyLanguage,
): Record<SupportStatus, { label: string; color: string; bg: string }> {
  const ar = language === 'ar';
  return {
    open: { label: ar ? 'مفتوح' : 'Open', color: CYAN, bg: C.cyanDim },
    investigating: { label: ar ? 'قيد المراجعة' : 'Investigating', color: AMBER, bg: C.goldDim },
    waiting_on_user: { label: ar ? 'بانتظارك' : 'Waiting on you', color: GOLD, bg: C.goldDim },
    resolved: { label: ar ? 'محلول' : 'Resolved', color: GREEN, bg: C.greenDim },
    closed: { label: ar ? 'مغلق' : 'Closed', color: MUTED, bg: C.elevated },
  };
}

function supportPriorityConfig(
  language: CopyLanguage,
): Record<SupportPriority, { label: string; color: string }> {
  const ar = language === 'ar';
  return {
    low: { label: ar ? 'منخفض' : 'Low', color: MUTED },
    normal: { label: ar ? 'عادي' : 'Normal', color: CYAN },
    high: { label: ar ? 'عالٍ' : 'High', color: GOLD },
    urgent: { label: ar ? 'عاجل' : 'Urgent', color: RED },
  };
}

const lifecycleRank: Record<TripLifecycle, number> = {
  attention: 0,
  active: 1,
  completed: 2,
  cancelled: 3,
};

function formatDateLabel(input: string, locale: string, language: CopyLanguage): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input || (language === 'ar' ? 'مرن' : 'Flexible');
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function pill(color: string, bg?: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 999,
    background: bg ?? `${color}15`,
    border: `1px solid ${color}30`,
    color,
    fontSize: '0.66rem',
    fontWeight: 700,
    fontFamily: FONT,
  } as const;
}

function getSupportForItem(
  tickets: SupportTicket[],
  identifiers: Array<string | undefined>,
): SupportTicket[] {
  const lookup = new Set(identifiers.filter(Boolean));
  return tickets.filter(ticket => ticket.relatedId && lookup.has(ticket.relatedId));
}

function deriveRideLifecycle(booking: RideBookingRecord, support: SupportTicket[]): TripLifecycle {
  if (booking.status === 'cancelled' || booking.status === 'rejected') return 'cancelled';
  if (booking.status === 'completed') return 'completed';
  if (
    support.length > 0 ||
    booking.supportThreadOpen ||
    booking.paymentStatus === 'failed' ||
    booking.paymentStatus === 'refunded' ||
    booking.status === 'pending_driver'
  ) {
    return 'attention';
  }
  return 'active';
}

function derivePackageLifecycle(pkg: PackageRequest, support: SupportTicket[]): TripLifecycle {
  if (pkg.status === 'delivered') return 'completed';
  if (support.length > 0 || pkg.status === 'searching') return 'attention';
  return 'active';
}

function deriveBusLifecycle(booking: StoredBusBooking, support: SupportTicket[]): TripLifecycle {
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.status === 'completed') return 'completed';
  if (support.length > 0) return 'attention';
  return 'active';
}

function toRideItem(
  booking: RideBookingRecord,
  support: SupportTicket[],
  locale: string,
  language: CopyLanguage,
): TripItem {
  const lifecycle = deriveRideLifecycle(booking, support);
  const ar = language === 'ar';
  return {
    id: booking.id,
    kind: 'rides',
    from: booking.from,
    to: booking.to,
    date: formatDateLabel(booking.date, locale, language),
    time: booking.time || (ar ? 'مرن' : 'Flexible'),
    title: ar ? 'حجز رحلة' : 'Ride booking',
    valueLabel: ar
      ? `${booking.seatsRequested} مقعد`
      : `${booking.seatsRequested} seat${booking.seatsRequested > 1 ? 's' : ''}`,
    lifecycle,
    primaryStatus:
      booking.status === 'pending_driver'
        ? ar
          ? 'بانتظار تأكيد السائق'
          : 'Waiting for driver confirmation'
        : ar
          ? `حالة الرحلة ${booking.status}`
          : `Trip ${booking.status}`,
    secondaryStatus:
      support.length > 0
        ? ar
          ? `${support.length} طلب دعم`
          : `${support.length} support thread${support.length > 1 ? 's' : ''}`
        : undefined,
    ticketLabel: booking.ticketCode,
    captainLabel: booking.driverName,
    supportCount: support.length,
    paymentStatus: booking.paymentStatus,
    openPath: '/app/find-ride',
  };
}

function toPackageItem(
  pkg: PackageRequest,
  support: SupportTicket[],
  locale: string,
  language: CopyLanguage,
): TripItem {
  const lifecycle = derivePackageLifecycle(pkg, support);
  const ar = language === 'ar';
  return {
    id: pkg.id,
    kind: 'packages',
    from: pkg.from,
    to: pkg.to,
    date: formatDateLabel(pkg.createdAt, locale, language),
    time:
      pkg.packageType === 'return'
        ? ar
          ? 'مسار إرجاع'
          : 'Return corridor'
        : ar
          ? 'مسار طرد'
          : 'Package lane',
    title:
      pkg.packageType === 'return'
        ? ar
          ? 'طرد إرجاع'
          : 'Return parcel'
        : ar
          ? 'طلب طرد'
          : 'Package request',
    valueLabel: pkg.matchedRideId
      ? ar
        ? 'مطابق لمسار'
        : 'Matched to route'
      : ar
        ? 'بانتظار مطابقة مسار'
        : 'Waiting for route match',
    lifecycle,
    primaryStatus:
      pkg.status === 'searching'
        ? ar
          ? 'نبحث عن ناقل'
          : 'Searching for a carrier'
        : ar
          ? `حالة الطرد ${pkg.status.replace('_', ' ')}`
          : `Package ${pkg.status.replace('_', ' ')}`,
    secondaryStatus: pkg.handoffCode
      ? ar
        ? `كود التسليم ${pkg.handoffCode}`
        : `Handoff code ${pkg.handoffCode}`
      : undefined,
    ticketLabel: pkg.matchedRideId ?? undefined,
    captainLabel: pkg.matchedDriver,
    supportCount: support.length,
    paymentStatus: 'n/a',
    openPath: '/app/packages',
  };
}

function toBusItem(
  booking: StoredBusBooking,
  support: SupportTicket[],
  locale: string,
  language: CopyLanguage,
): TripItem {
  const lifecycle = deriveBusLifecycle(booking, support);
  const ar = language === 'ar';
  return {
    id: booking.id,
    kind: 'buses',
    from: booking.pickupStop,
    to: booking.dropoffStop,
    date: formatDateLabel(booking.scheduleDate, locale, language),
    time: booking.departureTime,
    title: ar ? 'حجز باص' : 'Bus booking',
    valueLabel: ar
      ? `${booking.seatsRequested} مقعد`
      : `${booking.seatsRequested} seat${booking.seatsRequested > 1 ? 's' : ''}`,
    lifecycle,
    primaryStatus:
      booking.status === 'confirmed'
        ? ar
          ? 'تفاصيل الصعود جاهزة'
          : 'Boarding details ready'
        : ar
          ? `حالة الحجز ${booking.status}`
          : `Booking ${booking.status}`,
    secondaryStatus: ar
      ? `التفضيل: ${booking.seatPreference}`
      : `Preference: ${booking.seatPreference}`,
    ticketLabel: booking.ticket_code,
    supportCount: support.length,
    paymentStatus: 'authorized',
    openPath: '/app/bus',
  };
}

function SummaryCard({
  label,
  value,
  detail,
  color,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: '18px 18px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}16 0%, transparent 72%)`,
        }}
      />
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}16`,
          border: `1px solid ${color}26`,
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div style={{ color, fontWeight: 900, fontSize: '1.3rem', fontFamily: FONT }}>{value}</div>
      <div
        style={{
          color: TEXT,
          fontWeight: 800,
          fontSize: '0.84rem',
          marginTop: 4,
          fontFamily: FONT,
        }}
      >
        {label}
      </div>
      <div style={{ color: DIM, fontSize: '0.74rem', marginTop: 4, fontFamily: FONT }}>
        {detail}
      </div>
    </div>
  );
}

function LifecycleBadge({ lifecycle }: { lifecycle: TripLifecycle }) {
  const { language } = useLanguage();
  const item = lifecycleConfig(language)[lifecycle];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.64rem',
        fontWeight: 700,
        padding: '4px 9px',
        borderRadius: 999,
        color: item.color,
        background: item.bg,
        fontFamily: FONT,
      }}
    >
      {item.icon}
      {item.label}
    </span>
  );
}

function TripCard({ trip, onOpen }: { trip: TripItem; onOpen: () => void }) {
  const { language, t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const routeAccent = trip.kind === 'rides' ? CYAN : trip.kind === 'packages' ? GOLD : C.blue;
  const payment = paymentConfig(language)[trip.paymentStatus ?? 'n/a'];

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <WaselButton
        onClick={() => setExpanded(value => !value)}
        variant="ghost"
        style={{
          width: '100%',
          padding: '16px 18px',
          textAlign: 'left',
          height: 'auto',
          justifyContent: 'stretch',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background: `${routeAccent}14`,
            border: `1px solid ${routeAccent}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {trip.kind === 'rides' ? (
            <Car size={16} color={routeAccent} />
          ) : trip.kind === 'packages' ? (
            <Package size={16} color={routeAccent} />
          ) : (
            <Bus size={16} color={routeAccent} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: TEXT, fontFamily: FONT, fontSize: '0.92rem' }}>
              {trip.from}
            </span>
            <span style={{ color: C.textDim, fontSize: '0.78rem' }}>{t('myTripsPage.to')}</span>
            <span style={{ fontWeight: 800, color: TEXT, fontFamily: FONT, fontSize: '0.92rem' }}>
              {trip.to}
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: MUTED, fontFamily: FONT, marginTop: 4 }}>
            {trip.title} · {trip.date} · {trip.time}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={pill(routeAccent)}>{trip.primaryStatus}</span>
            {trip.ticketLabel ? (
              <span style={pill(C.text, C.elevated)}>
                <Ticket size={12} />
                {trip.ticketLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 900, color: TEXT, fontFamily: FONT, fontSize: '0.9rem' }}>
            {trip.valueLabel}
          </span>
          <LifecycleBadge lifecycle={trip.lifecycle} />
        </div>
        <ChevronRight
          size={14}
          color={C.textDim}
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </WaselButton>

      {expanded ? (
        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            padding: '14px 18px',
            display: 'grid',
            gap: 12,
            background: CARD_ALT,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={pill(payment.color, payment.bg)}>
              <Wallet size={12} />
              {payment.label}
            </span>
            {trip.supportCount > 0 ? (
              <span style={pill(AMBER, C.goldDim)}>
                <LifeBuoy size={12} />
                {trip.supportCount} {t('myTripsPage.active_support')}
              </span>
            ) : null}
            {trip.captainLabel ? (
              <span style={pill(GREEN, C.greenDim)}>{trip.captainLabel}</span>
            ) : null}
          </div>
          {trip.secondaryStatus ? (
            <div style={{ color: MUTED, fontSize: '0.78rem', fontFamily: FONT, lineHeight: 1.6 }}>
              {trip.secondaryStatus}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ color: DIM, fontSize: '0.76rem', fontFamily: FONT }}>
              {t(
                'myTripsPage.operational_status_is_now_tied_to_live_booking_package_bus_and_support_records_so_this_view_shows_what_still_needs_action',
              )}
            </div>
            <WaselButton onClick={onOpen} variant="outline" size="sm">
              {t('myTripsPage.open_journey')}
            </WaselButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SupportQueue({ tickets }: { tickets: SupportTicket[] }) {
  const { language, t } = useLanguage();
  if (tickets.length === 0) return null;
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <LifeBuoy size={16} color={CYAN} />
        <div style={{ color: TEXT, fontWeight: 800, fontFamily: FONT }}>
          {t('myTripsPage.support_queue')}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {tickets.map(ticket => {
          const status = supportStatusConfig(language)[ticket.status];
          const priority = supportPriorityConfig(language)[ticket.priority];
          return (
            <div
              key={ticket.id}
              style={{
                background: CARD_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '12px 14px',
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{ color: TEXT, fontWeight: 700, fontSize: '0.82rem', fontFamily: FONT }}
                  >
                    {ticket.subject}
                  </div>
                  <div
                    style={{ color: MUTED, fontSize: '0.74rem', marginTop: 4, fontFamily: FONT }}
                  >
                    {ticket.routeLabel ?? ticket.topic}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={pill(status.color, status.bg)}>{status.label}</span>
                  <span style={pill(priority.color)}>{priority.label}</span>
                </div>
              </div>
              <div style={{ color: DIM, fontSize: '0.74rem', fontFamily: FONT }}>
                {ticket.resolutionSummary ?? ticket.history.at(-1)?.note ?? ticket.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyTripsPage() {
  const { user } = useLocalAuth();
  const { language, t } = useLanguage();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const isRTL = language === 'ar';
  const locale = useLocale();

  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab');
  const initialFilter = searchParams.get('filter');
  const [tab, setTab] = useState<TripKind>(
    initialTab === 'packages' || initialTab === 'buses' ? initialTab : 'rides',
  );
  const [filter, setFilter] = useState<TripLifecycle | 'all'>(
    initialFilter === 'active' ||
      initialFilter === 'attention' ||
      initialFilter === 'completed' ||
      initialFilter === 'cancelled'
      ? initialFilter
      : 'all',
  );

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSupportTickets = async () => {
      const tickets = await getSupportTickets(user?.id);
      if (cancelled) return;
      setSupportTickets(tickets.slice(0, 5));
      setSupportLoading(false);
    };

    void loadSupportTickets();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextTab = params.get('tab');
    const nextFilter = params.get('filter');

    setTab(nextTab === 'packages' || nextTab === 'buses' ? nextTab : 'rides');
    setFilter(
      nextFilter === 'active' ||
        nextFilter === 'attention' ||
        nextFilter === 'completed' ||
        nextFilter === 'cancelled'
        ? nextFilter
        : 'all',
    );
  }, [location.search]);

  const rideItems = useMemo(() => {
    return syncRideBookingCompletion().map(booking => {
      const relatedSupport = getSupportForItem(supportTickets, [
        booking.id,
        booking.backendBookingId,
        booking.ticketCode,
        booking.rideId,
      ]);
      return toRideItem(booking, relatedSupport, locale.locale, language);
    });
  }, [language, supportTickets, locale.locale]);

  const packageItems = useMemo(() => {
    return getConnectedPackages().map(pkg => {
      const relatedSupport = getSupportForItem(supportTickets, [
        pkg.id,
        pkg.matchedRideId,
        pkg.handoffCode,
      ]);
      return toPackageItem(pkg, relatedSupport, locale.locale, language);
    });
  }, [language, supportTickets, locale.locale]);

  const busItems = useMemo(() => {
    return getStoredBusBookings().map(booking => {
      const relatedSupport = getSupportForItem(supportTickets, [
        booking.id,
        booking.ticket_code,
        booking.tripId,
      ]);
      return toBusItem(booking, relatedSupport, locale.locale, language);
    });
  }, [language, supportTickets, locale.locale]);

  const collections: Record<TripKind, TripItem[]> = {
    rides: rideItems,
    packages: packageItems,
    buses: busItems,
  };

  const items = collections[tab];
  const filtered = useMemo(() => {
    const visible = filter === 'all' ? items : items.filter(trip => trip.lifecycle === filter);

    return [...visible].sort((left, right) => {
      const lifecycleDiff = lifecycleRank[left.lifecycle] - lifecycleRank[right.lifecycle];
      if (lifecycleDiff !== 0) return lifecycleDiff;
      if (left.supportCount !== right.supportCount) return right.supportCount - left.supportCount;
      return left.time.localeCompare(right.time);
    });
  }, [filter, items]);
  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter(trip => trip.lifecycle === 'active').length,
      attention: items.filter(trip => trip.lifecycle === 'attention').length,
      completed: items.filter(trip => trip.lifecycle === 'completed').length,
    }),
    [items],
  );
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const attentionItems = useMemo(
    () => items.filter(trip => trip.lifecycle === 'attention'),
    [items],
  );
  const activeItems = useMemo(() => items.filter(trip => trip.lifecycle === 'active'), [items]);
  const nextPriorityTrip = attentionItems[0] ?? activeItems[0] ?? filtered[0] ?? null;
  const supportBacklog = supportTickets.filter(
    ticket => ticket.status !== 'resolved' && ticket.status !== 'closed',
  ).length;

  const createPath =
    tab === 'rides' ? '/app/offer-ride' : tab === 'packages' ? '/app/packages' : '/app/bus';
  const filters: Array<{ key: TripLifecycle | 'all'; label: string }> = [
    { key: 'all', label: isRTL ? 'الكل' : 'All' },
    { key: 'active', label: isRTL ? 'نشطة' : 'Active' },
    { key: 'attention', label: isRTL ? 'بحاجة متابعة' : 'Needs attention' },
    { key: 'completed', label: isRTL ? 'مكتملة' : 'Completed' },
    { key: 'cancelled', label: isRTL ? 'ملغية' : 'Cancelled' },
  ];

  return (
    <PageShell maxWidth={1040} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={isRTL ? 'تحكم الرحلات' : 'Journey Control'}
          icon={<MapPin size={18} />}
          title={t('sidebar.mytrips')}
          description={
            isRTL
              ? `أهلاً ${user?.name ?? 'مسافر'}. شوف شو بتحرك، شو بحاجة إجراء، وشو اكتمل عبر الرحلات والطرود والباصات.`
              : `Welcome ${user?.name ?? 'traveler'}. See what is moving, what needs action, and what is already settled across rides, parcels, and buses.`
          }
          accent={CYAN}
          actions={
            <WaselButton onClick={() => nav(createPath)} icon={<Plus size={14} />}>
              {tab === 'rides'
                ? isRTL
                  ? 'رحلة جديدة'
                  : 'New ride'
                : tab === 'packages'
                  ? isRTL
                    ? 'طرد جديد'
                    : 'New package'
                  : isRTL
                    ? 'احجز باص'
                    : 'Book bus'}
            </WaselButton>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <PageStatusBadge
                label={
                  isRTL
                    ? `${filtered.length} عنصر حي`
                    : `${filtered.length} live item${filtered.length === 1 ? '' : 's'}`
                }
                accent={stats.attention > 0 ? AMBER : CYAN}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: SPACE[3],
                }}
              >
                {[
                  { label: isRTL ? 'نشطة' : 'Active', value: String(stats.active), accent: CYAN },
                  {
                    label: isRTL ? 'متابعة' : 'Attention',
                    value: String(stats.attention),
                    accent: AMBER,
                  },
                  {
                    label: isRTL ? 'دعم' : 'Support',
                    value: String(supportTickets.length),
                    accent: GREEN,
                  },
                  {
                    label: isRTL ? 'الإكمال' : 'Completion',
                    value: `${completionRate}%`,
                    accent: GOLD,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: R.xl,
                      border: `1px solid ${item.accent}24`,
                      background: `${item.accent}12`,
                      padding: `${SPACE[3]} ${SPACE[4]}`,
                    }}
                  >
                    <div
                      style={{
                        color: C.text,
                        fontSize: TYPE.size.xl,
                        fontWeight: 900,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.value}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: MUTED,
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        {/* Legacy header removed — PageHero above handles title and actions */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            label={isRTL ? 'كل الرحلات' : 'Total journeys'}
            value={String(stats.total)}
            detail={
              isRTL ? 'العناصر الحالية في حسابك' : `${tripKindLabel(tab, language)} currently in your account`
            }
            color={CYAN}
            icon={<MapPin size={18} color={CYAN} />}
          />
          <SummaryCard
            label={isRTL ? 'نشطة' : 'Active'}
            value={String(stats.active)}
            detail={isRTL ? 'ماشية بدون مشاكل' : 'Running smoothly'}
            color={CYAN}
            icon={<Clock size={18} color={CYAN} />}
          />
          <SummaryCard
            label={isRTL ? 'بحاجة متابعة' : 'Needs attention'}
            value={String(stats.attention)}
            detail={
              isRTL ? 'بانتظار دعم أو موافقة أو إجراء' : 'Pending support, approval, or action'
            }
            color={AMBER}
            icon={<ShieldAlert size={18} color={AMBER} />}
          />
          <SummaryCard
            label={isRTL ? 'مكتملة' : 'Completed'}
            value={String(stats.completed)}
            detail={isRTL ? 'مغلقة بتسليم أو تسوية' : 'Closed with delivery or settlement'}
            color={GREEN}
            icon={<CheckCircle size={18} color={GREEN} />}
          />
        </div>

        <SectionCard
          title={t('myTripsPage.priority_board')}
          subtitle={
            isRTL
              ? 'ارفع المشاكل النشطة والعنصر الحي التالي للأعلى قبل مراجعة كل المسار.'
              : 'Bring active issues and the next live item to the top before scanning the full lane.'
          }
          icon={<ShieldAlert size={18} color={AMBER} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${C.cyanDim}, ${C.elevated})`,
                border: `1px solid ${nextPriorityTrip?.lifecycle === 'attention' ? AMBER : CYAN}24`,
                borderRadius: 18,
                padding: '18px 18px 16px',
                display: 'grid',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      color: nextPriorityTrip?.lifecycle === 'attention' ? AMBER : CYAN,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {nextPriorityTrip?.lifecycle === 'attention'
                      ? isRTL
                        ? 'العنصر التالي بحاجة إجراء'
                        : 'Next item needing action'
                      : isRTL
                        ? 'العنصر الحي التالي'
                        : 'Next live item'}
                  </div>
                  <div style={{ color: TEXT, fontWeight: 900, fontSize: '1rem', marginTop: 6 }}>
                    {nextPriorityTrip
                      ? `${nextPriorityTrip.from} ${t('myTripsPage.to')} ${nextPriorityTrip.to}`
                      : isRTL
                        ? 'لا توجد رحلة نشطة حالياً'
                        : 'No trip is active yet'}
                  </div>
                </div>
                {nextPriorityTrip ? (
                  <LifecycleBadge lifecycle={nextPriorityTrip.lifecycle} />
                ) : null}
              </div>

              <div
                style={{ color: MUTED, fontSize: '0.84rem', lineHeight: 1.65, fontFamily: FONT }}
              >
                {nextPriorityTrip
                  ? `${nextPriorityTrip.primaryStatus}. ${nextPriorityTrip.supportCount > 0 ? (isRTL ? `${nextPriorityTrip.supportCount} طلب دعم مربوط.` : `${nextPriorityTrip.supportCount} support thread${nextPriorityTrip.supportCount > 1 ? 's are' : ' is'} attached.`) : isRTL ? 'لا يوجد طلب دعم مربوط حالياً.' : 'No support thread is attached yet.'}`
                  : isRTL
                    ? 'المسار واضح حالياً. ابدأ رحلة أو حركة طرد أو حجز باص من هون.'
                    : 'The lane is clear right now. Start a new ride, package movement, or bus booking from here.'}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <WaselButton
                  onClick={() =>
                    nextPriorityTrip ? nav(nextPriorityTrip.openPath) : nav(createPath)
                  }
                  variant={nextPriorityTrip?.lifecycle === 'attention' ? 'gold' : 'primary'}
                  size="sm"
                  iconEnd={<ArrowRight size={14} />}
                >
                  {nextPriorityTrip
                    ? isRTL
                      ? 'افتح العنصر'
                      : 'Open item'
                    : isRTL
                      ? 'أنشئ حركة'
                      : 'Create movement'}
                </WaselButton>
                {nextPriorityTrip ? (
                  <WaselButton
                    onClick={() => {
                      setTab(nextPriorityTrip.kind);
                      setFilter(
                        nextPriorityTrip.lifecycle === 'attention' ? 'attention' : 'active',
                      );
                    }}
                    variant="outline"
                    size="sm"
                  >
                    {t('myTripsPage.focus_this_lane')}
                  </WaselButton>
                ) : null}
              </div>
            </div>

            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: '18px 18px 16px',
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  color: AMBER,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {t('myTripsPage.attention_lane')}
              </div>
              <div style={{ color: TEXT, fontSize: '1.3rem', fontWeight: 900 }}>
                {attentionItems.length}
              </div>
              <div style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.65 }}>
                {t('myTripsPage.bookings_route_matches_or_settlements_that_still_need_a_decision')}
              </div>
              <WaselButton
                onClick={() => setFilter('attention')}
                variant="gold"
                size="sm"
                style={{ marginTop: 'auto' }}
              >
                {t('myTripsPage.review_attention_items')}
              </WaselButton>
            </div>

            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: '18px 18px 16px',
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  color: GREEN,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {t('myTripsPage.support_and_completion')}
              </div>
              <div style={{ color: TEXT, fontSize: '1.3rem', fontWeight: 900 }}>
                {supportBacklog > 0 ? (isRTL ? `${supportBacklog} مفتوحة` : `${supportBacklog} open`) : `${completionRate}%`}
              </div>
              <div style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.65 }}>
                {supportBacklog > 0
                  ? isRTL
                    ? 'طلبات الدعم المفتوحة بتظل واضحة لحد ما تنحل.'
                    : 'Open support threads stay visible until they are resolved.'
                  : isRTL
                    ? 'نسبة الإكمال بتظل عالية لما تنفصل المسارات النشطة عن مسارات المتابعة.'
                    : 'Completion stays high when active lanes and attention lanes remain separated.'}
              </div>
              <WaselButton
                onClick={() => {
                  if (supportBacklog > 0) {
                    setFilter('attention');
                    return;
                  }
                  setFilter('completed');
                }}
                variant="outline"
                size="sm"
                style={{ marginTop: 'auto' }}
              >
                {supportBacklog > 0
                  ? isRTL
                    ? 'افتح العناصر المرتبطة بالدعم'
                    : 'Open support-linked items'
                  : isRTL
                    ? 'راجع العناصر المكتملة'
                    : 'Review completed items'}
              </WaselButton>
            </div>
          </div>
        </SectionCard>

        <SupportQueue tickets={supportTickets} />

        <SectionCard
          title={t('myTripsPage.journey_lanes')}
          subtitle={
            isRTL
              ? 'بدّل بين المسارات بدون ما تخسر سياق دورة الحياة أو الدفع أو الدعم.'
              : 'Switch lanes without losing lifecycle, payment, or support context.'
          }
          icon={<Ticket size={18} color={CYAN} />}
        >
          <div
            style={{
              display: 'flex',
              gap: 0,
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: 4,
              marginBottom: 16,
            }}
          >
            {(
              [
                ['rides', <Car key="car" size={14} />, isRTL ? 'رحلات' : 'Rides'],
                ['packages', <Package key="pkg" size={14} />, isRTL ? 'طرود' : 'Packages'],
                ['buses', <Bus key="bus" size={14} />, isRTL ? 'باصات' : 'Buses'],
              ] as const
            ).map(([key, icon, label]) => (
              <WaselButton
                key={key}
                onClick={() => setTab(key)}
                variant={tab === key ? 'primary' : 'ghost'}
                size="sm"
                style={{
                  flex: 1,
                }}
                icon={icon}
              >
                {label}
              </WaselButton>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {filters.map(filterOption => (
              <WaselButton
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                variant={filter === filterOption.key ? 'primary' : 'outline'}
                size="sm"
              >
                {filterOption.label}
              </WaselButton>
            ))}
          </div>

          {supportLoading ? (
            <ListSkeleton count={3} />
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '72px 0',
                color: DIM,
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
              }}
            >
              {tab === 'rides' ? (
                <Car size={42} style={{ marginBottom: 12, opacity: 0.35 }} />
              ) : tab === 'packages' ? (
                <Package size={42} style={{ marginBottom: 12, opacity: 0.35 }} />
              ) : (
                <Bus size={42} style={{ marginBottom: 12, opacity: 0.35 }} />
              )}
              <p style={{ fontFamily: FONT, fontSize: '0.94rem', margin: 0 }}>
                {t('common.no')} {tripKindLabel(tab, language)}{' '}
                {t('myTripsPage.match_this_lifecycle_filter_yet')}
              </p>
              <WaselButton
                onClick={() => nav(createPath)}
                variant="outline"
                style={{ marginTop: 16 }}
                iconEnd={<ArrowRight size={14} />}
              >
                {tab === 'rides'
                  ? isRTL
                    ? 'أنشئ رحلة'
                    : 'Create ride'
                  : tab === 'packages'
                    ? isRTL
                      ? 'أنشئ طلب طرد'
                      : 'Create package request'
                    : isRTL
                      ? 'ابحث عن باص'
                      : 'Find a bus'}
              </WaselButton>
            </div>
          ) : (
            filtered.map(trip => (
              <TripCard
                key={`${trip.kind}-${trip.id}`}
                trip={trip}
                onOpen={() => nav(trip.openPath)}
              />
            ))
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
