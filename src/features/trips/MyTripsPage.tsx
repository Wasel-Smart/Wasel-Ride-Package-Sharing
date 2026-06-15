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

const lifecycleConfig: Record<
  TripLifecycle,
  { label: string; color: string; bg: string; icon: ReactNode }
> = {
  active: { label: 'Active', color: CYAN, bg: C.cyanDim, icon: <Clock size={12} /> },
  attention: {
    label: 'Needs attention',
    color: AMBER,
    bg: C.goldDim,
    icon: <ShieldAlert size={12} />,
  },
  completed: {
    label: 'Completed',
    color: GREEN,
    bg: C.greenDim,
    icon: <CheckCircle size={12} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: RED,
    bg: C.errorDim,
    icon: <XCircle size={12} />,
  },
};

const paymentConfig: Record<
  RidePaymentStatus | 'n/a',
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Payment pending', color: AMBER, bg: C.goldDim },
  authorized: { label: 'Payment authorized', color: CYAN, bg: C.cyanDim },
  captured: { label: 'Settlement captured', color: GREEN, bg: C.greenDim },
  refunded: { label: 'Refund completed', color: CYAN, bg: C.blueDim },
  failed: { label: 'Payment issue', color: RED, bg: C.errorDim },
  'n/a': { label: 'No payment state', color: MUTED, bg: C.elevated },
};

const supportStatusConfig: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: CYAN, bg: C.cyanDim },
  investigating: { label: 'Investigating', color: AMBER, bg: C.goldDim },
  waiting_on_user: { label: 'Waiting on you', color: GOLD, bg: C.goldDim },
  resolved: { label: 'Resolved', color: GREEN, bg: C.greenDim },
  closed: { label: 'Closed', color: MUTED, bg: C.elevated },
};

const supportPriorityConfig: Record<SupportPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: MUTED },
  normal: { label: 'Normal', color: CYAN },
  high: { label: 'High', color: GOLD },
  urgent: { label: 'Urgent', color: RED },
};

const lifecycleRank: Record<TripLifecycle, number> = {
  attention: 0,
  active: 1,
  completed: 2,
  cancelled: 3,
};

function formatDateLabel(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input || 'Flexible';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function toRideItem(booking: RideBookingRecord, support: SupportTicket[]): TripItem {
  const lifecycle = deriveRideLifecycle(booking, support);
  return {
    id: booking.id,
    kind: 'rides',
    from: booking.from,
    to: booking.to,
    date: formatDateLabel(booking.date),
    time: booking.time || 'Flexible',
    title: 'Ride booking',
    valueLabel: `${booking.seatsRequested} seat${booking.seatsRequested > 1 ? 's' : ''}`,
    lifecycle,
    primaryStatus:
      booking.status === 'pending_driver'
        ? 'Waiting for driver confirmation'
        : `Trip ${booking.status}`,
    secondaryStatus:
      support.length > 0
        ? `${support.length} support thread${support.length > 1 ? 's' : ''}`
        : undefined,
    ticketLabel: booking.ticketCode,
    captainLabel: booking.driverName,
    supportCount: support.length,
    paymentStatus: booking.paymentStatus,
    openPath: '/app/find-ride',
  };
}

function toPackageItem(pkg: PackageRequest, support: SupportTicket[]): TripItem {
  const lifecycle = derivePackageLifecycle(pkg, support);
  return {
    id: pkg.id,
    kind: 'packages',
    from: pkg.from,
    to: pkg.to,
    date: formatDateLabel(pkg.createdAt),
    time: pkg.packageType === 'return' ? 'Return corridor' : 'Package lane',
    title: pkg.packageType === 'return' ? 'Return parcel' : 'Package request',
    valueLabel: pkg.matchedRideId ? 'Matched to route' : 'Waiting for route match',
    lifecycle,
    primaryStatus:
      pkg.status === 'searching'
        ? 'Searching for a carrier'
        : `Package ${pkg.status.replace('_', ' ')}`,
    secondaryStatus: pkg.handoffCode ? `Handoff code ${pkg.handoffCode}` : undefined,
    ticketLabel: pkg.matchedRideId ?? undefined,
    captainLabel: pkg.matchedDriver,
    supportCount: support.length,
    paymentStatus: 'n/a',
    openPath: '/app/packages',
  };
}

function toBusItem(booking: StoredBusBooking, support: SupportTicket[]): TripItem {
  const lifecycle = deriveBusLifecycle(booking, support);
  return {
    id: booking.id,
    kind: 'buses',
    from: booking.pickupStop,
    to: booking.dropoffStop,
    date: formatDateLabel(booking.scheduleDate),
    time: booking.departureTime,
    title: 'Bus booking',
    valueLabel: `${booking.seatsRequested} seat${booking.seatsRequested > 1 ? 's' : ''}`,
    lifecycle,
    primaryStatus:
      booking.status === 'confirmed' ? 'Boarding details ready' : `Booking ${booking.status}`,
    secondaryStatus: `Preference: ${booking.seatPreference}`,
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
  const item = lifecycleConfig[lifecycle];
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
  const [expanded, setExpanded] = useState(false);
  const routeAccent = trip.kind === 'rides' ? CYAN : trip.kind === 'packages' ? GOLD : C.blue;
  const payment = paymentConfig[trip.paymentStatus ?? 'n/a'];

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
            <span style={{ color: C.textDim, fontSize: '0.78rem' }}>to</span>
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
                {trip.supportCount} active support
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
              Operational status is now tied to live booking, package, bus, and support records so
              this view shows what still needs action.
            </div>
            <WaselButton onClick={onOpen} variant="outline" size="sm">
              Open journey
            </WaselButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SupportQueue({ tickets }: { tickets: SupportTicket[] }) {
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
        <div style={{ color: TEXT, fontWeight: 800, fontFamily: FONT }}>Support queue</div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {tickets.map(ticket => {
          const status = supportStatusConfig[ticket.status];
          const priority = supportPriorityConfig[ticket.priority];
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
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const isRTL = language === 'ar';

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

  useEffect(() => {
    let cancelled = false;

    const loadSupportTickets = async () => {
      const tickets = await getSupportTickets(user?.id);
      if (cancelled) return;
      setSupportTickets(tickets.slice(0, 5));
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
      return toRideItem(booking, relatedSupport);
    });
  }, [supportTickets]);

  const packageItems = useMemo(() => {
    return getConnectedPackages().map(pkg => {
      const relatedSupport = getSupportForItem(supportTickets, [
        pkg.id,
        pkg.matchedRideId,
        pkg.handoffCode,
      ]);
      return toPackageItem(pkg, relatedSupport);
    });
  }, [supportTickets]);

  const busItems = useMemo(() => {
    return getStoredBusBookings().map(booking => {
      const relatedSupport = getSupportForItem(supportTickets, [
        booking.id,
        booking.ticket_code,
        booking.tripId,
      ]);
      return toBusItem(booking, relatedSupport);
    });
  }, [supportTickets]);

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
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'attention', label: 'Needs attention' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <PageShell maxWidth={1040} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow="Journey Control"
          icon={<MapPin size={18} />}
          title="My Trips"
          description={`Welcome ${user?.name ?? 'traveler'}. See what is moving, what needs action, and what is already settled across rides, parcels, and buses.`}
          accent={CYAN}
          actions={
            <WaselButton onClick={() => nav(createPath)} icon={<Plus size={14} />}>
              {tab === 'rides' ? 'New ride' : tab === 'packages' ? 'New package' : 'Book bus'}
            </WaselButton>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <PageStatusBadge
                label={`${filtered.length} live item${filtered.length === 1 ? '' : 's'}`}
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
                  { label: 'Active', value: String(stats.active), accent: CYAN },
                  { label: 'Attention', value: String(stats.attention), accent: AMBER },
                  { label: 'Support', value: String(supportTickets.length), accent: GREEN },
                  { label: 'Completion', value: `${completionRate}%`, accent: GOLD },
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

        <div
          style={{
            display: 'none',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: CYAN,
                marginBottom: 6,
                fontFamily: FONT,
              }}
            >
              WASEL · JOURNEY CONTROL
            </div>
            <h1
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: TEXT,
                fontFamily: FONT,
                margin: 0,
              }}
            >
              My Trips
            </h1>
            <p style={{ fontSize: '0.82rem', color: MUTED, fontFamily: FONT, margin: '6px 0 0' }}>
              Welcome {user?.name ?? 'traveler'} · {filtered.length} operational item
              {filtered.length === 1 ? '' : 's'} visible right now
            </p>
          </div>
          <WaselButton onClick={() => nav(createPath)} icon={<Plus size={14} />}>
            {tab === 'rides' ? 'New ride' : tab === 'packages' ? 'New package' : 'Book bus'}
          </WaselButton>
        </div>

        <div
          style={{
            display: 'none',
            gridTemplateColumns: 'minmax(0, 1.35fr) minmax(240px, 0.9fr)',
            gap: 14,
            borderRadius: 18,
            padding: '18px 20px',
            background: `linear-gradient(135deg, ${C.cyanDim}, ${C.elevated})`,
            border: `1px solid ${C.borderHov}`,
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                color: TEXT,
                fontWeight: 800,
                fontSize: '0.98rem',
                marginBottom: 6,
                fontFamily: FONT,
              }}
            >
              Your live mobility operations now sit in one place
            </div>
            <div style={{ color: MUTED, fontSize: '0.84rem', lineHeight: 1.6, fontFamily: FONT }}>
              Rides, buses, packages, payment state, and support queues all feed this page so we can
              spot what is done and what still needs action.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
            <span style={pill(GREEN)}>
              <CheckCircle size={12} />
              Captured lifecycle
            </span>
            <span style={pill(CYAN)}>
              <Ticket size={12} />
              Ticket visibility
            </span>
            <span style={pill(AMBER)}>
              <LifeBuoy size={12} />
              Support queue
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            label="Total journeys"
            value={String(stats.total)}
            detail={`${tab} currently in your account`}
            color={CYAN}
            icon={<MapPin size={18} color={CYAN} />}
          />
          <SummaryCard
            label="Active"
            value={String(stats.active)}
            detail="Running smoothly"
            color={CYAN}
            icon={<Clock size={18} color={CYAN} />}
          />
          <SummaryCard
            label="Needs attention"
            value={String(stats.attention)}
            detail="Pending support, approval, or action"
            color={AMBER}
            icon={<ShieldAlert size={18} color={AMBER} />}
          />
          <SummaryCard
            label="Completed"
            value={String(stats.completed)}
            detail="Closed with delivery or settlement"
            color={GREEN}
            icon={<CheckCircle size={18} color={GREEN} />}
          />
        </div>

        <SectionCard
          title="Priority Board"
          subtitle="Bring active issues and the next live item to the top before scanning the full lane."
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
                      ? 'Next item needing action'
                      : 'Next live item'}
                  </div>
                  <div style={{ color: TEXT, fontWeight: 900, fontSize: '1rem', marginTop: 6 }}>
                    {nextPriorityTrip
                      ? `${nextPriorityTrip.from} to ${nextPriorityTrip.to}`
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
                  ? `${nextPriorityTrip.primaryStatus}. ${nextPriorityTrip.supportCount > 0 ? `${nextPriorityTrip.supportCount} support thread${nextPriorityTrip.supportCount > 1 ? 's are' : ' is'} attached.` : 'No support thread is attached yet.'}`
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
                  {nextPriorityTrip ? 'Open item' : 'Create movement'}
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
                    Focus this lane
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
                Attention lane
              </div>
              <div style={{ color: TEXT, fontSize: '1.3rem', fontWeight: 900 }}>
                {attentionItems.length}
              </div>
              <div style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.65 }}>
                Bookings, route matches, or settlements that still need a decision.
              </div>
              <WaselButton
                onClick={() => setFilter('attention')}
                variant="gold"
                size="sm"
                style={{ marginTop: 'auto' }}
              >
                Review attention items
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
                Support and completion
              </div>
              <div style={{ color: TEXT, fontSize: '1.3rem', fontWeight: 900 }}>
                {supportBacklog > 0 ? `${supportBacklog} open` : `${completionRate}%`}
              </div>
              <div style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.65 }}>
                {supportBacklog > 0
                  ? 'Open support threads stay visible until they are resolved.'
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
                {supportBacklog > 0 ? 'Open support-linked items' : 'Review completed items'}
              </WaselButton>
            </div>
          </div>
        </SectionCard>

        <SupportQueue tickets={supportTickets} />

        <SectionCard
          title="Journey Lanes"
          subtitle="Switch lanes without losing lifecycle, payment, or support context."
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
                ['rides', <Car key="car" size={14} />, 'Rides'],
                ['packages', <Package key="pkg" size={14} />, 'Packages'],
                ['buses', <Bus key="bus" size={14} />, 'Buses'],
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

          {filtered.length === 0 ? (
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
                No {tab} match this lifecycle filter yet
              </p>
              <WaselButton
                onClick={() => nav(createPath)}
                variant="outline"
                style={{ marginTop: 16 }}
                iconEnd={<ArrowRight size={14} />}
              >
                {tab === 'rides'
                  ? 'Create ride'
                  : tab === 'packages'
                    ? 'Create package request'
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
