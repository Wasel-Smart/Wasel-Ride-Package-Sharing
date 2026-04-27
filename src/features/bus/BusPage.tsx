import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  ArrowLeftRight,
  ArrowRight,
  Award,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  Route,
  Shield,
  TimerReset,
  Users,
} from 'lucide-react';
import { MapWrapper } from '../../components/MapWrapper';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { BUS_PAGE_COPY, BUS_TEST_IDS } from '../../modules/bus/bus.copy';
import { useBusSearch } from '../../modules/bus/bus.hooks';
import { createSupportTicket } from '../../services/supportInbox';
import { notificationsAPI } from '../../services/notifications.js';
import { routeEndpointsAreDistinct } from '../../utils/jordanLocations';
import {
  CITIES,
  ClarityBand,
  CoreExperienceBanner,
  DS,
  midpoint,
  PageShell,
  pill,
  Protected,
  r,
  resolveCityCoord,
  SectionHead,
} from '../shared/pageShared';
import {
  getRouteStatus,
  getScheduleTimes,
  getTodayIsoDate,
  isExactRoute,
  JOURNEY_PRESETS,
} from './busPage.utils';

export function BusPage() {
  const { user } = useLocalAuth();
  const [searchParams] = useSearchParams();
  const [today] = useState(getTodayIsoDate);
  const [origin, setOrigin] = useState('Amman');
  const [destination, setDestination] = useState('Aqaba');
  const [tripDate, setTripDate] = useState(today);
  const [passengers, setPassengers] = useState(1);
  const [scheduleMode, setScheduleMode] = useState<'depart-now' | 'schedule-later'>(
    'schedule-later',
  );
  const [seatPreference, setSeatPreference] = useState<'window' | 'aisle' | 'front-zone'>('window');
  const [selected, setSelected] = useState('');
  const [selectedDeparture, setSelectedDeparture] = useState('07:00');
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingTicketCode, setBookingTicketCode] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [searchNonce, setSearchNonce] = useState(0);
  const syncDelayMs =
    !searchParams.toString() &&
    origin === 'Amman' &&
    destination === 'Aqaba' &&
    passengers === 1 &&
    tripDate === today
      ? 1500
      : 0;
  const { state: busState, bookRoute } = useBusSearch({
    from: origin,
    to: destination,
    date: tripDate,
    seats: passengers,
    searchKey: `${searchParams.toString()}::${searchNonce}`,
    delayMs: syncDelayMs,
  });
  const busRoutes = busState.routes;
  const routesLoading = busState.loading;
  const routesInfo = busState.info;
  const bookingBusy = busState.bookingBusy;

  useEffect(() => {
    if (tripDate < today) setTripDate(today);
  }, [today, tripDate]);

  useEffect(() => {
    const queryFrom = searchParams.get('from');
    const queryTo = searchParams.get('to');

    if (queryFrom && CITIES.includes(queryFrom) && queryFrom !== origin) {
      setOrigin(queryFrom);
    }
    if (queryTo && CITIES.includes(queryTo) && queryTo !== destination) {
      setDestination(queryTo);
    }
  }, [destination, origin, searchParams]);

  useEffect(() => {
    setSelected(prev =>
      busRoutes.some(route => route.id === prev) ? prev : (busRoutes[0]?.id ?? ''),
    );
  }, [busRoutes]);

  const activeBus = busRoutes.find(route => route.id === selected) ?? busRoutes[0] ?? null;
  const departureTimes = useMemo(() => (activeBus ? getScheduleTimes(activeBus) : []), [activeBus]);
  const departureKey = useMemo(() => departureTimes.join('|'), [departureTimes]);

  useEffect(() => {
    if (!activeBus) {
      return;
    }
    setPassengers(value => (activeBus.seats > 0 ? Math.min(value, activeBus.seats) : 1));
  }, [activeBus]);

  useEffect(() => {
    if (!activeBus) {
      return;
    }
    setSelectedDeparture(departureTimes[0] ?? activeBus.dep);
  }, [activeBus, departureKey, departureTimes]);

  if (!activeBus) {
    return (
      <Protected>
        <PageShell>
          <SectionHead
            emoji="🚌"
            title="Wasel Bus"
            sub="Book intercity seats only when the backend has live availability."
            color={DS.green}
          />
          <CoreExperienceBanner
            title="Bus service unavailable"
            detail={routesInfo?.message ?? 'Bus service is unavailable right now.'}
            tone={DS.green}
          />
          <ClarityBand
            title="No ticket was created."
            detail="Bus bookings stop when live inventory is unavailable."
            tone={DS.green}
            items={[
              { label: 'Status', value: routesLoading ? BUS_PAGE_COPY.loadingRoutes : (routesInfo?.message ?? 'Bus service is unavailable right now.') },
              { label: 'Action', value: 'Retry this search after the backend recovers.' },
              { label: 'Fallback', value: 'Use rides or packages instead of a simulated ticket.' },
            ]}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSearchNonce((current) => current + 1)}
              style={{
                height: 44,
                padding: '0 16px',
                borderRadius: r(14),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: DS.text,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </PageShell>
      </Protected>
    );
  }

  const pickupCoord = resolveCityCoord(activeBus.from);
  const dropoffCoord = resolveCityCoord(activeBus.to);
  const routeCenter = midpoint(pickupCoord, dropoffCoord);
  const totalPrice = activeBus.price * passengers;
  const totalOpenSeats = busRoutes.reduce((sum, route) => sum + route.seats, 0);
  const exactRouteCount = busRoutes.filter(route =>
    isExactRoute(route, origin, destination),
  ).length;
  const operatorCount = new Set(busRoutes.map(route => route.company)).size;
  const bookingDisabled =
    bookingBusy ||
    !routeEndpointsAreDistinct(origin, destination) ||
    activeBus.seats === 0 ||
    passengers > activeBus.seats;
  const departureLabel =
    scheduleMode === 'depart-now'
      ? `Next departure today at ${selectedDeparture}`
      : `${tripDate} at ${selectedDeparture}`;
  const activeStatus = getRouteStatus(activeBus, tripDate, today, {
    cyan: DS.cyan,
    gold: DS.gold,
    green: DS.green,
  });
  const otherLiveDepartures = busRoutes
    .filter(route => route.id !== activeBus.id && route.seats > 0)
    .slice(0, 3);
  const bestFare = busRoutes.length
    ? Math.min(...busRoutes.map(route => route.price))
    : activeBus.price;
  const networkBrief =
    exactRouteCount > 0
      ? `${exactRouteCount} direct coach ${exactRouteCount === 1 ? 'departure is' : 'departures are'} visible for this corridor.`
      : 'No direct coach is available for this corridor right now.';
  const corridorSupport = routeEndpointsAreDistinct(origin, destination)
    ? `${operatorCount} operators are contributing inventory across ${busRoutes.length} visible departures.`
    : 'Choose two different cities to unlock the full corridor view.';
  const bookingSignal =
    activeBus.seats === 0
      ? 'This departure is full, but the same corridor filters stay active while you switch to another coach.'
      : `${activeBus.seats} seats are open on the selected coach and booking is confirmed only after the backend responds.`;
  const routeStatusColors = {
    cyan: DS.cyan,
    gold: DS.gold,
    green: DS.green,
  };

  function selectRoute(routeId: string) {
    setSelected(routeId);
    setBookingComplete(false);
    setBookingError(null);
  }

  async function handleBusBooking() {
    if (bookingDisabled) return;
    setBookingComplete(false);
    setBookingError(null);

    try {
      const result = await bookRoute({
        tripId: activeBus.id,
        seatsRequested: passengers,
        pickupStop: activeBus.pickupPoint,
        dropoffStop: activeBus.dropoffPoint,
        scheduleDate: scheduleMode === 'depart-now' ? today : tripDate,
        departureTime: selectedDeparture,
        seatPreference,
        scheduleMode,
        totalPrice,
        passengerName: user?.name,
        passengerEmail: user?.email,
      });
      setBookingTicketCode(result.ticketCode);
      setBookingComplete(true);
      notificationsAPI
        .createNotification({
          title: 'Bus seat confirmed',
          message: `${activeBus.from} to ${activeBus.to} is confirmed. Ticket ${result.ticketCode}.`,
          type: 'booking',
          priority: 'high',
          action_url: '/app/bus',
        })
        .catch(() => {});
    } catch (error) {
      setBookingTicketCode(null);
      setBookingError(
        error instanceof Error
          ? error.message
          : 'Bus booking could not be completed. Please try again.',
      );
    }
  }

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="🚌"
          title="Wasel Bus"
          sub="Live bus departures and backend-confirmed booking."
          color={DS.green}
        />
        <CoreExperienceBanner
          title="Jordan bus schedules with trusted fares"
          detail={BUS_PAGE_COPY.heroDetail}
          tone={DS.green}
        />
        <ClarityBand
          title="Choose the corridor, then reserve."
          detail="Start with the route, confirm operator and fare, then book."
          tone={DS.green}
          items={[
            { label: '1. Corridor', value: 'Pick the cities first.' },
            { label: '2. Departure', value: 'Check schedule, operator, and fare.' },
            { label: '3. Reserve', value: 'Keep the seat and ticket in one flow.' },
          ]}
        />

        <div
          className="sp-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              background: 'var(--wasel-panel-strong)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              borderRadius: r(20),
              border: `1px solid ${DS.border}`,
              padding: '18px 18px 16px',
              boxShadow: 'var(--wasel-shadow-lg)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: r(12),
                  background: `${DS.green}16`,
                  border: `1px solid ${DS.green}28`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Bus size={18} color={DS.green} />
              </div>
              <div>
                <div style={{ color: DS.text, fontWeight: 800 }}>Coach corridor brief</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  A clearer view of the bus network.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[networkBrief, corridorSupport, bookingSignal].map(line => (
                <div
                  key={line}
                  style={{
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    padding: '12px 14px',
                    color: DS.text,
                    fontSize: '0.82rem',
                    lineHeight: 1.65,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(107,181,21,0.12), rgba(71,183,230,0.08) 58%, rgba(255,255,255,0.03))',
              borderRadius: r(20),
              border: `1px solid ${activeBus.color ?? DS.green}30`,
              padding: '18px 18px 16px',
              boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: activeBus.color ?? DS.green,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Selected journey
                </div>
                <div
                  style={{
                    color: DS.text,
                    fontWeight: 900,
                    fontSize: '1.08rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {activeBus.from} to {activeBus.to}
                </div>
                <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 4 }}>
                  {activeBus.company} • {activeBus.serviceLevel ?? 'Standard'} •{' '}
                  {activeBus.duration}
                </div>
              </div>
              <span style={{ ...pill(activeStatus.color), fontSize: '0.68rem' }}>
                {activeStatus.label}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[
                { label: 'Fare', value: `${activeBus.price} JOD` },
                { label: 'Departure', value: selectedDeparture },
                {
                  label: 'Source',
                  value: 'Backend',
                },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${DS.border}`,
                    borderRadius: r(14),
                    padding: '12px 12px 10px',
                  }}
                >
                  <div
                    style={{
                      color: DS.muted,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: DS.text,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={pill(activeBus.color ?? DS.green)}>{departureLabel}</span>
              <span style={pill(DS.cyan)}>{activeBus.pickupPoint}</span>
              <span style={pill(activeBus.seats > 0 ? DS.green : DS.gold)}>
                {activeBus.seats > 0 ? `${activeBus.seats} seats open` : 'Sold out'}
              </span>
            </div>
            <button
              data-testid={BUS_TEST_IDS.confirmBooking}
              onClick={handleBusBooking}
              disabled={bookingDisabled}
              type="button"
              style={{
                width: '100%',
                height: 48,
                marginTop: 14,
                borderRadius: r(15),
                border: 'none',
                background: bookingDisabled
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))'
                  : `linear-gradient(135deg, ${activeBus.color ?? DS.green}, ${DS.blue})`,
                color: '#fff',
                fontWeight: 900,
                fontFamily: DS.F,
                cursor: bookingDisabled ? 'not-allowed' : 'pointer',
                fontSize: '0.92rem',
                opacity: bookingDisabled ? 0.72 : 1,
                boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
                scrollMarginTop: 104,
              }}
            >
              {bookingBusy
                ? 'Reserving seat...'
                : activeBus.seats === 0
                  ? 'Try another departure'
                  : 'Reserve seat'}
            </button>
          </div>
        </div>

        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(107,181,21,0.12), rgba(71,183,230,0.06) 50%, rgba(255,255,255,0.03))',
            border: `1px solid ${DS.border}`,
            borderRadius: r(22),
            padding: 18,
            marginBottom: 18,
            boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  color: DS.green,
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Trip planner
              </div>
              <div style={{ color: DS.text, fontWeight: 900, letterSpacing: '-0.02em' }}>
                Plan your trip
              </div>
              <div style={{ color: DS.sub, fontSize: '0.82rem', marginTop: 4 }}>
                Pick your cities first so live availability stays relevant.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <span
                  style={pill(routeEndpointsAreDistinct(origin, destination) ? DS.green : DS.gold)}
                >
                  {routeEndpointsAreDistinct(origin, destination)
                    ? 'Corridor ready'
                    : 'Choose 2 cities'}
                </span>
                <span style={pill(DS.cyan)}>Backend live</span>
              </div>
            </div>
            <button
              onClick={() => {
                setOrigin(destination);
                setDestination(origin);
                setBookingComplete(false);
                setBookingError(null);
              }}
              type="button"
              style={{
                height: 42,
                padding: '0 16px',
                borderRadius: '99px',
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: DS.text,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 18px rgba(0,0,0,0.14)',
              }}
            >
              <ArrowLeftRight size={16} />
              Swap cities
            </button>
          </div>
          <div
            className="sp-search-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}
          >
            <div>
              <label
                style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}
              >
                From
              </label>
              <select
                value={origin}
                onChange={event => {
                  setOrigin(event.target.value);
                  setBookingComplete(false);
                  setBookingError(null);
                }}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: r(14),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: DS.text,
                  padding: '0 14px',
                  fontFamily: DS.F,
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}
              >
                To
              </label>
              <select
                value={destination}
                onChange={event => {
                  setDestination(event.target.value);
                  setBookingComplete(false);
                  setBookingError(null);
                }}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: r(14),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: DS.text,
                  padding: '0 14px',
                  fontFamily: DS.F,
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}
              >
                Travel date
              </label>
              <input
                type="date"
                min={today}
                value={tripDate}
                onChange={event => {
                  setTripDate(event.target.value);
                  setBookingComplete(false);
                }}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: r(14),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: DS.text,
                  padding: '0 14px',
                  fontFamily: DS.F,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {JOURNEY_PRESETS.map(preset => {
              const active = origin === preset.from && destination === preset.to;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setOrigin(preset.from);
                    setDestination(preset.to);
                    setBookingComplete(false);
                    setBookingError(null);
                  }}
                  style={{
                    borderRadius: r(14),
                    border: `1px solid ${active ? DS.green : DS.border}`,
                    background: active ? `${DS.green}12` : DS.card2,
                    padding: '10px 14px',
                    color: active ? DS.green : DS.text,
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="sp-4col"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            {
              label: 'Matching routes',
              value: `${exactRouteCount}/${busRoutes.length}`,
              detail: 'Exact corridor coaches first',
              icon: <Route size={18} />,
              color: DS.green,
            },
            {
              label: 'Open seats',
              value: `${totalOpenSeats}`,
              detail: 'Across the visible schedules',
              icon: <Users size={18} />,
              color: activeBus.color ?? DS.cyan,
            },
            {
              label: 'Best fare',
              value: `${bestFare} JOD`,
              detail: 'Lowest live fare on screen',
              icon: <CreditCard size={18} />,
              color: DS.cyan,
            },
            {
              label: 'Operators',
              value: `${operatorCount}`,
              detail: 'Visible live operators',
              icon: <TimerReset size={18} />,
              color: DS.gold,
            },
          ].map(item => (
            <div
              key={item.label}
              className="w-focus"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                border: `1px solid ${DS.border}`,
                borderRadius: r(18),
                padding: '18px 18px 16px',
                boxShadow: 'var(--wasel-shadow-md)',
                backdropFilter: 'blur(18px)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: r(12),
                  background: `${item.color}16`,
                  border: `1px solid ${item.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  marginBottom: 14,
                }}
              >
                {item.icon}
              </div>
              <div
                style={{ color: item.color, fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}
              >
                {item.value}
              </div>
              <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.86rem' }}>
                {item.label}
              </div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        {(routesLoading || routesInfo) && (
          <div
            data-testid={BUS_TEST_IDS.routeInfo}
            data-route-info-kind={routesLoading ? 'loading' : (routesInfo?.kind ?? 'none')}
            style={{
              marginBottom: 16,
              background: DS.card2,
              border: `1px solid ${DS.border}`,
              borderRadius: r(14),
              padding: '12px 14px',
              color: DS.sub,
              fontSize: '0.8rem',
            }}
          >
            {routesLoading ? BUS_PAGE_COPY.loadingRoutes : routesInfo?.message}
          </div>
        )}

        <div
          className="sp-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.9fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {busRoutes.map(route => {
              const isSelected = selected === route.id;
              const soldOut = route.seats === 0;
              const exactMatch = isExactRoute(route, origin, destination);
              const routeStatus = getRouteStatus(route, tripDate, today, routeStatusColors);
              return (
                <div
                  key={route.id}
                  className="w-focus"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${route.from} to ${route.to}, ${route.company}, ${routeStatus.label}`}
                  style={{
                    background: 'var(--wasel-panel-strong)',
                    backdropFilter: 'blur(22px)',
                    WebkitBackdropFilter: 'blur(22px)',
                    borderRadius: r(20),
                    border: `1px solid ${isSelected ? (route.color ?? DS.cyan) : DS.border}`,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? `0 10px 30px ${route.color ?? DS.cyan}12`
                      : 'var(--wasel-shadow-md)',
                    opacity: soldOut ? 0.8 : 1,
                    transition:
                      'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  }}
                  onClick={() => selectRoute(String(route.id))}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectRoute(String(route.id));
                    }
                  }}
                  onMouseEnter={e => {
                    if (!soldOut) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `var(--wasel-shadow-lg), 0 0 20px ${route.color ?? DS.cyan}10`;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isSelected
                      ? `0 10px 30px ${route.color ?? DS.cyan}12`
                      : 'var(--wasel-shadow-md)';
                  }}
                >
                  <div
                    style={{
                      height: 3,
                      background: `linear-gradient(90deg,${route.color ?? DS.cyan},transparent)`,
                    }}
                  />
                  <div style={{ padding: '20px 24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 14,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0 }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: r(12),
                            background: `${route.color ?? DS.cyan}15`,
                            border: `1.5px solid ${route.color ?? DS.cyan}30`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Bus size={22} color={route.color ?? DS.cyan} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: DS.text,
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {route.from} to {route.to}
                          </div>
                          <div style={{ color: DS.sub, fontSize: '0.82rem', marginTop: 3 }}>
                            {route.company} - {route.serviceLevel ?? 'Standard'} - {route.duration}
                          </div>
                          <div
                            style={{
                              color: DS.muted,
                              fontSize: '0.78rem',
                              marginTop: 8,
                              lineHeight: 1.55,
                            }}
                          >
                            {route.summary}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 6,
                            marginBottom: 6,
                          }}
                        >
                          {isSelected && (
                            <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.64rem' }}>
                              Selected route
                            </span>
                          )}
                          {!exactMatch && (
                            <span style={{ ...pill(DS.gold), fontSize: '0.64rem' }}>
                              Closest alternative
                            </span>
                          )}
                          <span style={{ ...pill(routeStatus.color), fontSize: '0.64rem' }}>
                            {routeStatus.label}
                          </span>
                          {soldOut && (
                            <span style={{ ...pill(DS.gold), fontSize: '0.64rem' }}>Sold out</span>
                          )}
                        </div>
                        <div
                          style={{
                            color: route.color ?? DS.cyan,
                            fontWeight: 900,
                            fontSize: '1.6rem',
                          }}
                        >
                          {route.price}
                        </div>
                        <div style={{ color: DS.muted, fontSize: '0.62rem', fontWeight: 600 }}>
                          JOD/seat
                        </div>
                        <span
                          style={{
                            ...pill(soldOut ? DS.gold : route.seats > 5 ? DS.green : DS.gold),
                            marginTop: 6,
                            fontSize: '0.65rem',
                          }}
                        >
                          {soldOut ? 'No seats left' : `${route.seats} seats left`}
                        </span>
                      </div>
                    </div>
                    <div
                      className="sp-bus-card-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
                        gap: 10,
                        marginTop: 16,
                      }}
                    >
                      {[
                        {
                          label: 'Pickup',
                          value: route.pickupPoint,
                          icon: <MapPin size={13} color={route.color ?? DS.cyan} />,
                        },
                        {
                          label: 'Schedule',
                          value: route.scheduleDays ?? route.frequency,
                          icon: <Calendar size={13} color={route.color ?? DS.cyan} />,
                        },
                        {
                          label: 'Status',
                          value: routeStatus.detail,
                          icon: <Award size={13} color={route.color ?? DS.cyan} />,
                        },
                      ].map(item => (
                        <div
                          key={item.label}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${DS.border}`,
                            borderRadius: r(12),
                            padding: '12px 13px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: DS.muted,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              marginBottom: 4,
                            }}
                          >
                            {item.icon}
                            {item.label}
                          </div>
                          <div
                            style={{
                              color: DS.text,
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              lineHeight: 1.35,
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                      {getScheduleTimes(route)
                        .slice(0, 6)
                        .map(time => (
                          <span key={time} style={pill(route.color ?? DS.cyan)}>
                            {time}
                          </span>
                        ))}
                      {getScheduleTimes(route).length > 6 && (
                        <span style={pill(DS.sub)}>+{getScheduleTimes(route).length - 6} more</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                      {route.amenities.map(amenity => (
                        <span key={amenity} style={pill(route.color ?? DS.cyan)}>
                          {amenity}
                        </span>
                      ))}
                      {route.via.map(stop => (
                        <span key={stop} style={pill(DS.sub)}>
                          Via {stop}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="sp-side-column"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              position: 'sticky',
              top: 16,
            }}
          >
            <div
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                border: `1px solid ${activeBus.color ?? DS.cyan}30`,
                borderRadius: r(22),
                overflow: 'hidden',
                boxShadow: `0 16px 42px ${activeBus.color ?? DS.cyan}10`,
              }}
            >
              <div
                style={{
                  padding: '22px 22px 18px',
                  background: `linear-gradient(135deg, ${activeBus.color ?? DS.cyan}14, rgba(255,255,255,0.94))`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div style={{ color: DS.text, fontWeight: 900, fontSize: '1.15rem' }}>
                      Reserve your seat
                    </div>
                    <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 4 }}>
                      {activeBus.from} to {activeBus.to} - {activeBus.company} -{' '}
                      {activeBus.serviceLevel ?? 'Standard'}
                    </div>
                  </div>
                  <span style={{ ...pill(activeStatus.color), fontSize: '0.7rem' }}>
                    {activeStatus.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['depart-now', 'schedule-later'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        setScheduleMode(mode);
                        setBookingComplete(false);
                      }}
                      type="button"
                      style={{
                        height: 38,
                        padding: '0 14px',
                        borderRadius: '99px',
                        border: 'none',
                        cursor: 'pointer',
                        background:
                          scheduleMode === mode
                            ? mode === 'depart-now'
                              ? DS.gradC
                              : DS.gradG
                            : DS.card2,
                        color: scheduleMode === mode ? '#fff' : DS.text,
                        fontWeight: 700,
                      }}
                    >
                      {mode === 'depart-now' ? 'Depart now' : 'Book later'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    background: DS.card2,
                    border: `1px solid ${DS.border}`,
                    borderRadius: r(16),
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      color: DS.muted,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Departure plan
                  </div>
                  <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.95rem' }}>
                    {departureLabel}
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 4 }}>
                    Board at {activeBus.pickupPoint} - arrive at {activeBus.dropoffPoint}.
                  </div>
                  <div
                    style={{
                      color: activeStatus.color,
                      fontSize: '0.78rem',
                      marginTop: 6,
                      fontWeight: 700,
                    }}
                  >
                    {activeStatus.detail}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: DS.sub,
                      fontSize: '0.76rem',
                      marginBottom: 8,
                    }}
                  >
                    Departure time
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {departureTimes.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setSelectedDeparture(time);
                          setBookingComplete(false);
                        }}
                        style={{
                          height: 36,
                          padding: '0 12px',
                          borderRadius: '99px',
                          border: `1px solid ${selectedDeparture === time ? (activeBus.color ?? DS.cyan) : DS.border}`,
                          background:
                            selectedDeparture === time
                              ? `${activeBus.color ?? DS.cyan}18`
                              : DS.card2,
                          color:
                            selectedDeparture === time ? (activeBus.color ?? DS.cyan) : DS.text,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                {activeBus.seats === 0 && (
                  <div
                    style={{
                      background: 'rgba(168,214,20,0.10)',
                      border: '1px solid rgba(168,214,20,0.28)',
                      borderRadius: r(16),
                      padding: '14px 16px',
                      color: DS.text,
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                    }}
                  >
                    This coach is full right now. Switch routes and keep the same corridor filters.
                  </div>
                )}
                {scheduleMode === 'schedule-later' && (
                  <input
                    type="date"
                    min={today}
                    value={tripDate}
                    onChange={event => {
                      setTripDate(event.target.value);
                      setBookingComplete(false);
                    }}
                    style={{
                      width: '100%',
                      height: 46,
                      borderRadius: r(14),
                      border: `1px solid ${DS.border}`,
                      background: DS.card2,
                      color: DS.text,
                      padding: '0 14px',
                      fontFamily: DS.F,
                    }}
                  />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        color: DS.sub,
                        fontSize: '0.76rem',
                        marginBottom: 8,
                      }}
                    >
                      Passengers
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: DS.card2,
                        border: `1px solid ${DS.border}`,
                        borderRadius: r(14),
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => {
                          setPassengers(value => Math.max(1, value - 1));
                          setBookingComplete(false);
                        }}
                        type="button"
                        style={{
                          width: 42,
                          height: 46,
                          border: 'none',
                          background: 'transparent',
                          color: DS.text,
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <div
                        style={{ flex: 1, textAlign: 'center', color: DS.text, fontWeight: 800 }}
                      >
                        {passengers}
                      </div>
                      <button
                        onClick={() => {
                          if (activeBus.seats > 0) {
                            setPassengers(value => Math.min(activeBus.seats, value + 1));
                            setBookingComplete(false);
                          }
                        }}
                        type="button"
                        disabled={activeBus.seats === 0 || passengers >= activeBus.seats}
                        style={{
                          width: 42,
                          height: 46,
                          border: 'none',
                          background: 'transparent',
                          color: DS.text,
                          fontSize: '1.1rem',
                          cursor:
                            activeBus.seats === 0 || passengers >= activeBus.seats
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            activeBus.seats === 0 || passengers >= activeBus.seats ? 0.45 : 1,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        color: DS.sub,
                        fontSize: '0.76rem',
                        marginBottom: 8,
                      }}
                    >
                      Seat preference
                    </label>
                    <select
                      value={seatPreference}
                      onChange={event => {
                        setSeatPreference(event.target.value as typeof seatPreference);
                        setBookingComplete(false);
                      }}
                      style={{
                        width: '100%',
                        height: 46,
                        borderRadius: r(14),
                        border: `1px solid ${DS.border}`,
                        background: DS.card2,
                        color: DS.text,
                        padding: '0 14px',
                        fontFamily: DS.F,
                      }}
                    >
                      <option value="window">Window</option>
                      <option value="aisle">Aisle</option>
                      <option value="front-zone">Front zone</option>
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(71,183,230,0.08), rgba(168,214,20,0.08))',
                    border: `1px solid ${DS.border}`,
                    borderRadius: r(16),
                    padding: '16px 16px 14px',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  {[
                    { label: 'Seat fare', value: `${activeBus.price} JOD x ${passengers}` },
                    {
                      label: 'Schedule days',
                      value: activeBus.scheduleDays ?? activeBus.frequency,
                    },
                    { label: 'Available on this coach', value: `${activeBus.seats} seats` },
                  ].map(row => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: DS.sub, fontSize: '0.78rem' }}>{row.label}</span>
                      <span style={{ color: DS.text, fontWeight: 700 }}>{row.value}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingTop: 10,
                      borderTop: `1px solid ${DS.border}`,
                    }}
                  >
                    <span style={{ color: DS.text, fontWeight: 800 }}>Total</span>
                    <span
                      style={{
                        color: activeBus.color ?? DS.cyan,
                        fontWeight: 900,
                        fontSize: '1.2rem',
                      }}
                    >
                      {totalPrice} JOD
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleBusBooking}
                  disabled={bookingDisabled}
                  type="button"
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: r(16),
                    border: 'none',
                    background: bookingDisabled
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))'
                      : `linear-gradient(135deg,${activeBus.color ?? DS.cyan},${DS.blue})`,
                    color: '#fff',
                    fontWeight: 900,
                    fontFamily: DS.F,
                    cursor: bookingDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    opacity: bookingDisabled ? 0.72 : 1,
                    boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
                    scrollMarginTop: 104,
                  }}
                >
                  {bookingBusy
                    ? 'Reserving seat...'
                    : activeBus.seats === 0
                      ? 'Try another departure'
                      : 'Reserve seat'}
                </button>
                {bookingError ? (
                  <div
                    style={{
                      borderRadius: r(14),
                      border: `1px solid rgba(255,120,120,0.30)`,
                      background: 'rgba(255,120,120,0.10)',
                      padding: '12px 14px',
                      color: DS.text,
                      fontSize: '0.82rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {bookingError}
                  </div>
                ) : null}
                <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.55 }}>
                  {activeBus.seats === 0
                    ? 'This coach is full right now. Pick another departure below and keep the same corridor details.'
                    : 'Your seat, boarding stop, and departure alerts stay linked in your account. If the schedule changes, Wasel updates you.'}
                </div>
                {activeBus.sourceUrl && (
                  <a
                    href={activeBus.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={BUS_TEST_IDS.officialScheduleLink}
                    style={{
                      color: DS.cyan,
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={14} />
                    {BUS_PAGE_COPY.officialScheduleLink(activeBus.lastVerifiedAt ?? tripDate)}
                  </a>
                )}
                {bookingComplete && (
                  <div
                    data-testid={BUS_TEST_IDS.bookingConfirmation}
                    style={{
                      background: 'rgba(107,181,21,0.10)',
                      border: '1px solid rgba(107,181,21,0.28)',
                      borderRadius: r(16),
                      padding: '14px 16px',
                    }}
                    >
                      <div
                        data-testid={BUS_TEST_IDS.bookingConfirmationTitle}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                        gap: 8,
                        color: DS.green,
                        fontWeight: 800,
                        marginBottom: 6,
                      }}
                      >
                        <CheckCircle2 size={16} />
                        {BUS_PAGE_COPY.bookingConfirmedTitle}
                      </div>
                    <div style={{ color: DS.text, fontSize: '0.86rem', lineHeight: 1.5 }}>
                      {passengers} seat{passengers > 1 ? 's are' : ' is'} reserved for{' '}
                      {departureLabel}. Ticket code {bookingTicketCode ?? 'pending'} was saved for
                      the {activeBus.from} to {activeBus.to} corridor. Saved in your account with
                      departure reminders.
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const ticket = createSupportTicket({
                            topic: 'bus_booking',
                            subject: `Bus help for ${activeBus.from} to ${activeBus.to}`,
                            detail: `Support requested for bus ticket ${bookingTicketCode ?? 'pending'} on ${departureLabel}.`,
                            relatedId: bookingTicketCode ?? activeBus.id,
                            routeLabel: `${activeBus.from} to ${activeBus.to}`,
                          });
                          notificationsAPI
                            .createNotification({
                              title: 'Bus support opened',
                              message: `Support ticket ${ticket.id} is following your bus booking.`,
                              type: 'support',
                              priority: 'high',
                              action_url: '/app/profile',
                            })
                            .catch(() => {});
                        }}
                        style={{
                          height: 38,
                          padding: '0 14px',
                          borderRadius: '99px',
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          color: DS.text,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Open support
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                border: `1px solid ${DS.border}`,
                borderRadius: r(22),
                padding: 18,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ color: DS.text, fontWeight: 800 }}>Live route view</div>
                  <div style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 4 }}>
                    See pickup, destination, and route direction before checkout.
                  </div>
                </div>
                <span style={{ ...pill(activeBus.color ?? DS.cyan), fontSize: '0.68rem' }}>
                  Map enabled
                </span>
              </div>
              <MapWrapper
                mode="live"
                center={routeCenter}
                pickupLocation={pickupCoord}
                dropoffLocation={dropoffCoord}
                driverLocation={midpoint(pickupCoord, dropoffCoord)}
                height={230}
                showMosques={false}
                showRadars={false}
              />
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {[
                  {
                    icon: <MapPin size={14} color={activeBus.color ?? DS.cyan} />,
                    label: 'Boarding',
                    value: activeBus.pickupPoint,
                  },
                  {
                    icon: <ArrowRight size={14} color={activeBus.color ?? DS.cyan} />,
                    label: 'Main stop',
                    value: activeBus.via.join(' - '),
                  },
                  {
                    icon: <Clock size={14} color={activeBus.color ?? DS.cyan} />,
                    label: 'ETA',
                    value: `${activeBus.arr} arrival - ${activeBus.duration}`,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: DS.card2,
                      border: `1px solid ${DS.border}`,
                      borderRadius: r(14),
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: r(10),
                        background: `${activeBus.color ?? DS.cyan}14`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 700 }}>
                        {item.label}
                      </div>
                      <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem' }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                border: `1px solid ${DS.border}`,
                borderRadius: r(22),
                padding: '18px 18px 16px',
              }}
            >
              <div style={{ color: DS.text, fontWeight: 800, marginBottom: 12 }}>
                Corridor snapshot
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {busRoutes.slice(0, 6).map(route => {
                  const times = getScheduleTimes(route);
                  return (
                    <div
                      key={`${route.id}-snapshot`}
                      className="sp-corridor-snapshot"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1.2fr) auto auto',
                        gap: 10,
                        alignItems: 'center',
                        background: DS.card2,
                        border: `1px solid ${DS.border}`,
                        borderRadius: r(14),
                        padding: '12px 14px',
                      }}
                    >
                      <div>
                        <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem' }}>
                          {route.from} to {route.to}
                        </div>
                        <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>
                          {route.company} - {times[0]} first / {times[times.length - 1]} last
                        </div>
                      </div>
                      <div
                        style={{
                          color: route.color ?? DS.cyan,
                          fontWeight: 800,
                          fontSize: '0.84rem',
                        }}
                      >
                        {route.price} JOD
                      </div>
                      <span
                        style={{
                          ...pill(DS.green),
                          fontSize: '0.64rem',
                        }}
                      >
                        Live
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                border: `1px solid ${DS.border}`,
                borderRadius: r(22),
                padding: '18px 18px 16px',
              }}
            >
              <div style={{ color: DS.text, fontWeight: 800, marginBottom: 8 }}>
                What to know before you go
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  'Jordan bus bookings only proceed when live inventory, fare, and operating details come back from the backend.',
                  'Departure time is selectable, and the page shows today-aware status such as Boarding soon or Closed today.',
                  'If live inventory is unavailable, the page stops and shows that bus service is unavailable.',
                ].map(item => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      color: DS.sub,
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <Shield size={15} color={DS.green} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                background: DS.card,
                border: `1px solid ${DS.border}`,
                borderRadius: r(22),
                padding: '18px 18px 16px',
              }}
            >
              <div style={{ color: DS.text, fontWeight: 800, marginBottom: 8 }}>
                Other live departures
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {otherLiveDepartures.length > 0 ? (
                  otherLiveDepartures.map(route => (
                    <button
                      key={`live-${route.id}`}
                      type="button"
                      onClick={() => {
                        setSelected(route.id);
                        setBookingComplete(false);
                        setBookingError(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        borderRadius: r(14),
                        border: `1px solid ${DS.border}`,
                        background: DS.card2,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        color: DS.text,
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                          {route.dep} departure
                        </div>
                        <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>
                          {route.summary}
                        </div>
                      </div>
                      <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.68rem' }}>
                        {route.seats} seats
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.55 }}>
                    No other live departures are available right now. Try again when the backend
                    refreshes or switch to a shared ride for the same corridor.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}

export default BusPage;
