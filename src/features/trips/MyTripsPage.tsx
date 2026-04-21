import { useMemo, useState, type ReactNode } from 'react';
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
  ShieldAlert,
  Ticket,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  isRideBookingConfirmed,
  isRideBookingPending,
  type RideBookingRecord,
  type RidePaymentStatus,
} from '../../services/rideLifecycle';
import {
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '../../services/supportInbox';
import type { StoredBusBooking } from '../../services/bus';
import type { PackageRequest } from '../../services/journeyLogistics';
import {
  ClarityBand,
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  SectionHead,
} from '../shared/pageShared';
import { useTrips } from '../../modules/trips/trip.hooks';

const CARD = DS.cardGrad;
const CARD_ALT = DS.card2;
const BORDER = DS.border;
const BORDER_STRONG = DS.borderH;
const CYAN = DS.cyan;
const BLUE = DS.blue;
const GOLD = DS.gold;
const GREEN = DS.green;
const RED = DS.red;
const AMBER = DS.gold;
const TEXT = DS.text;
const MUTED = DS.sub;
const DIM = DS.muted;
const FONT = DS.F;

function tone(color: string, amount = 14) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

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
  active: { label: 'Active', color: CYAN, bg: tone(CYAN, 14), icon: <Clock size={12} /> },
  attention: {
    label: 'Attention',
    color: AMBER,
    bg: tone(AMBER, 14),
    icon: <ShieldAlert size={12} />,
  },
  completed: {
    label: 'Done',
    color: GREEN,
    bg: tone(GREEN, 14),
    icon: <CheckCircle size={12} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: RED,
    bg: tone(RED, 14),
    icon: <XCircle size={12} />,
  },
};

const paymentConfig: Record<
  RidePaymentStatus | 'n/a',
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Payment pending', color: AMBER, bg: tone(AMBER, 14) },
  authorized: { label: 'Payment authorized', color: CYAN, bg: tone(CYAN, 14) },
  captured: { label: 'Paid', color: GREEN, bg: tone(GREEN, 14) },
  refunded: { label: 'Refunded', color: BLUE, bg: tone(BLUE, 14) },
  failed: { label: 'Payment issue', color: RED, bg: tone(RED, 14) },
  'n/a': { label: 'No payment state', color: MUTED, bg: tone(MUTED, 16) },
};

const supportStatusConfig: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: CYAN, bg: tone(CYAN, 14) },
  investigating: { label: 'Investigating', color: AMBER, bg: tone(AMBER, 14) },
  waiting_on_user: { label: 'Waiting on you', color: GOLD, bg: tone(GOLD, 14) },
  resolved: { label: 'Resolved', color: GREEN, bg: tone(GREEN, 14) },
  closed: { label: 'Closed', color: MUTED, bg: tone(MUTED, 16) },
};

const supportPriorityConfig: Record<SupportPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: MUTED },
  normal: { label: 'Normal', color: CYAN },
  high: { label: 'High', color: GOLD },
  urgent: { label: 'Urgent', color: RED },
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
    background: bg ?? tone(color, 14),
    border: `1px solid ${tone(color, 24)}`,
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
    booking.status === 'pending_driver' ||
    isRideBookingPending(booking)
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
    title: 'Ride',
    valueLabel: `${booking.seatsRequested} seat${booking.seatsRequested > 1 ? 's' : ''}`,
    lifecycle,
    primaryStatus:
      booking.status === 'pending_driver'
        ? 'Waiting for driver'
        : isRideBookingPending(booking)
          ? 'Confirmation in progress'
          : isRideBookingConfirmed(booking)
            ? 'Boarding ready'
            : `Trip ${booking.status}`,
    secondaryStatus:
      support.length > 0
        ? `${support.length} support thread${support.length > 1 ? 's' : ''}`
        : isRideBookingPending(booking)
          ? 'Wasel is finalizing backend confirmation before boarding details unlock.'
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
    time: pkg.packageType === 'return' ? 'Return lane' : 'Package lane',
    title: pkg.packageType === 'return' ? 'Return parcel' : 'Package',
    valueLabel: pkg.matchedRideId ? 'Matched' : 'Waiting',
    lifecycle,
    primaryStatus:
      pkg.status === 'searching'
        ? 'Searching for carrier'
        : `Package ${pkg.status.replace('_', ' ')}`,
    secondaryStatus: pkg.handoffCode ? `Handoff ${pkg.handoffCode}` : undefined,
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
    title: 'Bus',
    valueLabel: `${booking.seatsRequested} seat${booking.seatsRequested > 1 ? 's' : ''}`,
    lifecycle,
    primaryStatus: booking.status === 'confirmed' ? 'Boarding ready' : `Booking ${booking.status}`,
    secondaryStatus: `Seat: ${booking.seatPreference}`,
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
        minWidth: 0,
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
          background: `radial-gradient(circle, ${tone(color, 16)} 0%, transparent 72%)`,
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
          background: tone(color, 14),
          border: `1px solid ${tone(color, 24)}`,
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

function StatusBadge({ lifecycle }: { lifecycle: TripLifecycle }) {
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
        border: `1px solid ${tone(item.color, 22)}`,
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
  const routeAccent = trip.kind === 'rides' ? CYAN : trip.kind === 'packages' ? GOLD : BLUE;
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
      <button
        onClick={() => setExpanded(value => !value)}
        style={{
          width: '100%',
          padding: '16px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background: tone(routeAccent, 14),
            border: `1px solid ${tone(routeAccent, 24)}`,
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
            <span style={{ color: DIM, fontSize: '0.78rem' }}>to</span>
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
              <span style={pill(TEXT, tone(TEXT, 8))}>
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
          <StatusBadge lifecycle={trip.lifecycle} />
        </div>
        <ChevronRight
          size={14}
          color={DIM}
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

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
              <span style={pill(AMBER, tone(AMBER, 14))}>
                <LifeBuoy size={12} />
                {trip.supportCount} active support
              </span>
            ) : null}
            {trip.captainLabel ? (
              <span style={pill(GREEN, tone(GREEN, 14))}>{trip.captainLabel}</span>
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
              Live trip, payment, and support status in one place.
            </div>
            <button
              onClick={onOpen}
              style={{
              padding: '7px 14px',
              borderRadius: 10,
              background: CARD_ALT,
              border: `1px solid ${BORDER_STRONG}`,
              color: TEXT,
              fontWeight: 700,
              fontFamily: FONT,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              Open journey
            </button>
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

  const initialTab = new URLSearchParams(location.search).get('tab');
  const [tab, setTab] = useState<TripKind>(
    initialTab === 'packages' || initialTab === 'buses' ? initialTab : 'rides',
  );
  const [filter, setFilter] = useState<TripLifecycle | 'all'>('all');
  const { state: tripsState } = useTrips(user?.id);
  const supportTickets = tripsState.supportTickets;

  const rideItems = useMemo(() => {
    return tripsState.rides.map(booking => {
      const relatedSupport = getSupportForItem(supportTickets, [
        booking.id,
        booking.backendBookingId,
        booking.ticketCode,
        booking.rideId,
      ]);
      return toRideItem(booking, relatedSupport);
    });
  }, [supportTickets, tripsState.rides]);

  const packageItems = useMemo(() => {
    return tripsState.packages.map(pkg => {
      const relatedSupport = getSupportForItem(supportTickets, [
        pkg.id,
        pkg.matchedRideId,
        pkg.handoffCode,
      ]);
      return toPackageItem(pkg, relatedSupport);
    });
  }, [supportTickets, tripsState.packages]);

  const busItems = useMemo(() => {
    return tripsState.buses.map(booking => {
      const relatedSupport = getSupportForItem(supportTickets, [
        booking.id,
        booking.ticket_code,
        booking.tripId,
      ]);
      return toBusItem(booking, relatedSupport);
    });
  }, [supportTickets, tripsState.buses]);

  const collections: Record<TripKind, TripItem[]> = {
    rides: rideItems,
    packages: packageItems,
    buses: busItems,
  };

  const items = collections[tab];
  const filtered = filter === 'all' ? items : items.filter(trip => trip.lifecycle === filter);
  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter(trip => trip.lifecycle === 'active').length,
      attention: items.filter(trip => trip.lifecycle === 'attention').length,
      completed: items.filter(trip => trip.lifecycle === 'completed').length,
    }),
    [items],
  );
  const supportWaiting = supportTickets.filter(
    ticket => ticket.status === 'waiting_on_user',
  ).length;
  const highPrioritySupport = supportTickets.filter(
    ticket => ticket.priority === 'high' || ticket.priority === 'urgent',
  ).length;

  const createPath =
    tab === 'rides' ? '/app/offer-ride' : tab === 'packages' ? '/app/packages' : '/app/bus';
  const filters: Array<{ key: TripLifecycle | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'attention', label: 'Attention' },
    { key: 'completed', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <Protected>
      <PageShell>
        <div style={{ fontFamily: FONT, direction: isRTL ? 'rtl' : 'ltr', paddingBottom: 56 }}>
          <SectionHead
            emoji="🧭"
            title="My Trips"
            titleAr="رحلاتي"
            sub={
              isRTL
                ? 'عرض سريع لكل الرحلات والحجوزات المفتوحة.'
                : 'One place for rides, packages, and bus bookings.'
            }
            color={CYAN}
            action={{
              label: tab === 'rides' ? 'New ride' : tab === 'packages' ? 'New package' : 'Book bus',
              onClick: () => nav(createPath),
            }}
          />

          <CoreExperienceBanner
            title={isRTL ? 'الحالة المباشرة واضحة' : 'Live journey status stays visible'}
            detail={
              isRTL
                ? `${filtered.length} عنصر ظاهر الآن مع الحالات والمدفوعات والدعم.`
                : `${filtered.length} item${filtered.length === 1 ? '' : 's'} visible now for ${user?.name ?? 'you'}.`
            }
            tone={CYAN}
          />

          {Boolean(
            (globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner,
          ) && (
            <div style={{ marginBottom: 18 }}>
              <StakeholderSignalBanner
                dir={isRTL ? 'rtl' : 'ltr'}
                eyebrow="Wasel journey"
                title="Trips, operators, and support now read from the same playbook"
                detail="This journey surface keeps riders, drivers, and support aligned around one live trip state so handoffs are clearer and pending actions do not get buried."
                stakeholders={[
                  { label: 'Rider items', value: String(stats.total), tone: 'teal' },
                  { label: 'Driver-facing', value: String(rideItems.length), tone: 'blue' },
                  { label: 'Support queue', value: String(supportTickets.length), tone: 'amber' },
                  { label: 'High priority', value: String(highPrioritySupport), tone: 'rose' },
                ]}
                statuses={[
                  { label: 'Needs attention', value: String(stats.attention), tone: 'amber' },
                  { label: 'Waiting on user', value: String(supportWaiting), tone: 'rose' },
                  { label: 'Completed', value: String(stats.completed), tone: 'green' },
                ]}
                lanes={[
                  {
                    label: 'Trip lifecycle',
                    detail:
                      'Bookings, package movement, and bus journeys all map into one operational state.',
                  },
                  {
                    label: 'Support escalation',
                    detail:
                      'Open cases follow the same route identifiers so operations can step in quickly.',
                  },
                  {
                    label: 'Ticket visibility',
                    detail:
                      'Codes, statuses, and payment checkpoints stay visible while the trip is active.',
                  },
                ]}
              />
            </div>
          )}

          <ClarityBand
            title={isRTL ? 'لقطة سريعة' : 'Quick status'}
            detail={isRTL ? 'أهم الحالات بدون نص زائد.' : 'The key signals without extra reading.'}
            tone={CYAN}
            items={[
              { label: isRTL ? 'الكل' : 'Total', value: String(stats.total) },
              { label: isRTL ? 'نشط' : 'Active', value: String(stats.active) },
              { label: isRTL ? 'يحتاج إجراء' : 'Attention', value: String(stats.attention) },
            ]}
          />

          <div
            className="sp-4col"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <SummaryCard
              label="Total"
              value={String(stats.total)}
              detail={`${tab} in account`}
              color={CYAN}
              icon={<MapPin size={18} color={CYAN} />}
            />
            <SummaryCard
              label="Active"
              value={String(stats.active)}
              detail="In progress"
              color={CYAN}
              icon={<Clock size={18} color={CYAN} />}
            />
            <SummaryCard
              label="Attention"
              value={String(stats.attention)}
              detail="Needs action"
              color={AMBER}
              icon={<ShieldAlert size={18} color={AMBER} />}
            />
            <SummaryCard
              label="Done"
              value={String(stats.completed)}
              detail="Closed"
              color={GREEN}
              icon={<CheckCircle size={18} color={GREEN} />}
            />
          </div>

          <SupportQueue tickets={supportTickets} />

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
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 10,
                  background: tab === key ? tone(CYAN, 14) : 'transparent',
                  border: tab === key ? `1px solid ${tone(CYAN, 24)}` : '1px solid transparent',
                  color: tab === key ? CYAN : MUTED,
                  fontWeight: tab === key ? 800 : 600,
                  fontFamily: FONT,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.14s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {filters.map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: '0.75rem',
                  fontWeight: filter === filterOption.key ? 800 : 600,
                  fontFamily: FONT,
                  cursor: 'pointer',
                  border: `1px solid ${filter === filterOption.key ? CYAN : BORDER}`,
                  background: filter === filterOption.key ? tone(CYAN, 14) : 'transparent',
                  color: filter === filterOption.key ? CYAN : MUTED,
                }}
              >
                {filterOption.label}
              </button>
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
                No {tab} match this filter
              </p>
              <button
                onClick={() => nav(createPath)}
                style={{
                  marginTop: 16,
                  padding: '10px 18px',
                  borderRadius: 10,
                  background: tone(CYAN, 14),
                  border: `1px solid ${tone(CYAN, 24)}`,
                  color: CYAN,
                  fontWeight: 800,
                  fontFamily: FONT,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {tab === 'rides'
                  ? 'Create ride'
                  : tab === 'packages'
                    ? 'Create package'
                    : 'Find a bus'}
                <ArrowRight size={14} />
              </button>
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
        </div>
      </PageShell>
    </Protected>
  );
}
