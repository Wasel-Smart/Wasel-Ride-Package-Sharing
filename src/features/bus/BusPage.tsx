import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import {
  BusBookingForm,
  BusMap,
  BusRouteList,
  BusSchedule,
} from './components';

const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان', Aqaba: 'العقبة', Irbid: 'إربد', Petra: 'البتراء', 'Wadi Rum': 'وادي رم',
};
const cityLabel = (city: string, ar: boolean) => (ar ? CITY_LABELS_AR[city] ?? city : city);

const JOURNEY_PRESETS = [
  { from: 'Amman', to: 'Aqaba', label: 'Amman to Aqaba' },
  { from: 'Amman', to: 'Irbid', label: 'Amman to Irbid' },
  { from: 'Amman', to: 'Petra', label: 'Amman to Petra' },
  { from: 'Amman', to: 'Wadi Rum', label: 'Amman to Wadi Rum' },
  { from: 'Irbid', to: 'Amman', label: 'Irbid to Amman' },
];
const DEFAULT_BUS_ROUTE = ((): BusRoute => {
  const route =
    getOfficialBusRoutes({ from: 'Amman', to: 'Aqaba' })[0] ?? getOfficialBusRoutes()[0];
  if (!route) throw new Error('Default bus route is unavailable');
  return route;
})();

function getTodayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isExactRoute(route: BusRoute, from: string, to: string) {
  return route.from === from && route.to === to;
}

function getScheduleTimes(route: BusRoute) {
  return route.departureTimes?.length ? route.departureTimes : [route.dep];
}

function toMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function getRouteStatus(route: BusRoute, tripDate: string, today: string, ar: boolean) {
  if (tripDate !== today) {
    return {
      label: ar ? 'مجدولة' : 'Scheduled',
      detail: route.scheduleDays ?? (ar ? 'جدول منشور' : 'Published schedule'),
      color: DS.cyan,
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const times = getScheduleTimes(route)
    .map(toMinutes)
    .sort((a, b) => a - b);
  const next = times.find(minutes => minutes >= currentMinutes);

  if (next === undefined) {
    return { label: ar ? 'مغلق اليوم' : 'Closed today', detail: ar ? 'لا توجد مغادرات أخرى اليوم' : 'No more departures left today', color: DS.gold };
  }

  const minutesAway = next - currentMinutes;
  if (minutesAway <= 15) {
    return { label: ar ? 'الصعود قريباً' : 'Boarding soon', detail: ar ? `${minutesAway} دقيقة للمغادرة` : `${minutesAway} min to departure`, color: DS.green };
  }
  if (minutesAway <= 60) {
    return {
      label: ar ? 'مغادرة خلال الساعة' : 'Departing this hour',
      detail: ar ? `${minutesAway} دقيقة للمغادرة` : `${minutesAway} min to departure`,
      color: DS.cyan,
    };
  }

  return {
    label: ar ? 'لاحقاً اليوم' : 'Later today',
    detail: ar ? `${minutesAway} دقيقة للمغادرة التالية` : `${minutesAway} min to the next departure`,
    color: DS.cyan,
  };
}

export function BusPage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const local = (english: string, arabic: string) => (ar ? arabic : english);
  const today = getTodayIsoDate();
  const [origin, setOrigin] = useState('Amman');
  const [destination, setDestination] = useState('Aqaba');
  const [tripDate, setTripDate] = useState(today);
  const [passengers, setPassengers] = useState(1);
  const [scheduleMode, setScheduleMode] = useState<'depart-now' | 'schedule-later'>(
    'schedule-later',
  );
  const [seatPreference, setSeatPreference] = useState<'window' | 'aisle' | 'front-zone'>('window');
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>(() =>
    getOfficialBusRoutes({ from: 'Amman', to: 'Aqaba' }),
  );
  const [selected, setSelected] = useState(() => DEFAULT_BUS_ROUTE.id);
  const [selectedDeparture, setSelectedDeparture] = useState(() => DEFAULT_BUS_ROUTE.dep);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesInfo, setRoutesInfo] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingSource, setBookingSource] = useState<'server' | 'local' | null>(null);
  const [bookingTicketCode, setBookingTicketCode] = useState<string | null>(null);

  useEffect(() => {
    if (tripDate < today) setTripDate(today);
  }, [today, tripDate]);

  useEffect(() => {
    let cancelled = false;
    async function loadBusRoutes() {
      const fallbackRoutes = getOfficialBusRoutes({
        from: origin,
        to: destination,
        seats: passengers,
      });
      const fallbackPrimaryRoute = fallbackRoutes[0] ?? DEFAULT_BUS_ROUTE;
      if (origin === destination) {
        setBusRoutes(fallbackRoutes);
        setSelected(fallbackPrimaryRoute.id);
        setRoutesInfo('Choose two different cities.');
        setRoutesLoading(false);
        return;
      }
      setRoutesLoading(true);
      setRoutesInfo(null);
      try {
        const liveRoutes = await fetchBusRoutes({
          from: origin,
          to: destination,
          date: tripDate,
          seats: passengers,
        });
        if (cancelled) return;
        const exactLiveRoutes = liveRoutes.filter(route =>
          isExactRoute(route, origin, destination),
        );
        const nextRoutes = exactLiveRoutes.length ? exactLiveRoutes : liveRoutes;
        const nextPrimaryRoute = nextRoutes[0] ?? fallbackPrimaryRoute;
        if (nextRoutes.length) {
          setBusRoutes(nextRoutes);
          setSelected(prev =>
            nextRoutes.some(route => route.id === prev) ? prev : nextPrimaryRoute.id,
          );
          setRoutesInfo(
            nextPrimaryRoute.dataSource === 'live'
              ? 'Live departures loaded.'
              : `Official schedule shown. Verified ${nextPrimaryRoute.lastVerifiedAt ?? today}.`,
          );
        } else {
          setBusRoutes(fallbackRoutes);
          setSelected(prev =>
            fallbackRoutes.some(route => route.id === prev) ? prev : fallbackPrimaryRoute.id,
          );
          setRoutesInfo(
            fallbackRoutes.some(route => isExactRoute(route, origin, destination))
              ? `Official schedule shown. Verified ${fallbackPrimaryRoute.lastVerifiedAt ?? today}.`
              : 'No exact route yet. Showing close matches.',
          );
        }
      } catch {
        if (cancelled) return;
        setBusRoutes(fallbackRoutes);
        setSelected(prev =>
          fallbackRoutes.some(route => route.id === prev) ? prev : fallbackPrimaryRoute.id,
        );
        setRoutesInfo(
          `Live routes unavailable. Official schedule shown. Verified ${fallbackPrimaryRoute.lastVerifiedAt ?? today}.`,
        );
      } finally {
        if (!cancelled) setRoutesLoading(false);
      }
    }
    loadBusRoutes();
    return () => {
      cancelled = true;
    };
  }, [destination, origin, passengers, tripDate]);

  const activeBus =
    busRoutes.find(route => route.id === selected) ?? busRoutes[0] ?? DEFAULT_BUS_ROUTE;
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
    routesLoading ||
    origin === destination ||
    activeBus.seats === 0 ||
    passengers > activeBus.seats;
  const departureTimes = getScheduleTimes(activeBus);
  const departureKey = departureTimes.join('|');
  const departureLabel = scheduleMode === 'depart-now'
    ? local(`Next departure today at ${selectedDeparture}`, `المغادرة التالية اليوم الساعة ${selectedDeparture}`)
    : local(`${tripDate} at ${selectedDeparture}`, `${tripDate} الساعة ${selectedDeparture}`);
  const activeStatus = getRouteStatus(activeBus, tripDate, today, ar);
  const fallbackBuses = busRoutes
    .filter(route => route.id !== activeBus.id && route.seats > 0)
    .slice(0, 2);
  const selectedSourceLabel = activeBus.dataSource === 'live'
    ? local('Live operator feed', 'تحديث مباشر من المشغّل')
    : local('Official schedule', 'الجدول الرسمي');
  const selectedSourceDetail =
    activeBus.dataSource === 'live'
      ? 'Departure times and seat counts are coming from the live route response.'
      : `Published route data is active. Last verified ${activeBus.lastVerifiedAt ?? today}.`;
  const exactCoverageText =
    exactRouteCount > 0
      ? `${exactRouteCount} exact departures currently match ${origin} to ${destination}.`
      : 'No exact departure returned, so the closest verified corridor alternatives are shown.';

  useEffect(() => {
    setPassengers(value => (activeBus.seats > 0 ? Math.min(value, activeBus.seats) : 1));
  }, [activeBus.id, activeBus.seats]);

  useEffect(() => {
    setSelectedDeparture(departureTimes[0] ?? activeBus.dep);
  }, [activeBus.dep, activeBus.id, departureKey]);

  async function handleBusBooking() {
    if (bookingDisabled) return;
    setBookingBusy(true);
    setBookingComplete(false);
    try {
      const result = await createBusBooking({
        tripId: activeBus.id,
        seatsRequested: passengers,
        pickupStop: activeBus.pickupPoint,
        dropoffStop: activeBus.dropoffPoint,
        scheduleDate: scheduleMode === 'depart-now' ? today : tripDate,
        departureTime: selectedDeparture,
        seatPreference,
        scheduleMode,
        totalPrice,
      });
      setBookingSource(result.source);
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
      setRoutesInfo(
        result.source === 'local'
          ? 'Seat saved locally while secure booking reconnects.'
          : 'Seat confirmed and saved to your account.',
      );
    } catch (error) {
      setBookingSource(null);
      setBookingTicketCode(null);
      setRoutesInfo(
        error instanceof Error
          ? error.message
          : 'Bus booking could not be confirmed right now. Please try again shortly.',
      );
    } finally {
      setBookingBusy(false);
    }
  }

  const openBusSupport = () => {
    void (async () => {
      const ticket = await createSupportTicket(user?.id, {
        topic: 'bus_booking',
        subject: `Bus help for ${activeBus.from} to ${activeBus.to}`,
        detail: `Support requested for bus ticket ${bookingTicketCode ?? 'pending'} on ${departureLabel}.`,
        relatedId: bookingTicketCode ?? activeBus.id,
        routeLabel: `${activeBus.from} to ${activeBus.to}`,
      });
      setRoutesInfo(`Support opened: ${ticket.id}.`);
      notificationsAPI
        .createNotification({
          title: 'Bus support opened',
          message: `Support ticket ${ticket.id} is following your bus booking.`,
          type: 'support',
          priority: 'high',
          action_url: '/app/profile',
        })
        .catch(() => {});
    })();
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji={<Bus size={24} />}
          title={tx('busPage.book_a_bus')}
          sub={tx('busPage.see_schedules_fares_and_seats')}
          color={DS.green}
        />
        <CoreExperienceBanner
          title={tx('busPage.official_schedules_first')}
          detail={tx('busPage.choose_a_route_and_book_the_best_departure')}
          tone={DS.green}
        />

        <div
          style={{
            background: C.card,
            border: `1px solid ${DS.border}`,
            borderRadius: r(22),
            padding: 18,
            marginBottom: 18,
            boxShadow: SH.card,
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
              <div style={{ color: C.text, fontWeight: 900, letterSpacing: 0 }}>
                {tx('busPage.trip_details')}
              </div>
              <div style={{ color: DS.sub, fontSize: '0.82rem', marginTop: 4 }}>
                {tx('busPage.choose_route_and_date')}
              </div>
            </div>
            <button
              onClick={() => {
                setOrigin(destination);
                setDestination(origin);
                setBookingComplete(false);
                setBookingSource(null);
              }}
              type="button"
              style={{
                height: 42,
                padding: '0 16px',
                borderRadius: '99px',
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: SH.sm,
              }}
            >
              <ArrowLeftRight size={16} />
              {tx('busPage.swap_cities')}
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
                {tx('common.from')}
              </label>
              <select
                value={origin}
                onChange={event => {
                  setOrigin(event.target.value);
                  setBookingComplete(false);
                  setBookingSource(null);
                }}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: r(14),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  padding: '0 14px',
                  fontFamily: DS.F,
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city}>
                    {cityLabel(city, ar)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}
              >
                {tx('common.to')}
              </label>
              <select
                value={destination}
                onChange={event => {
                  setDestination(event.target.value);
                  setBookingComplete(false);
                  setBookingSource(null);
                }}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: r(14),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  padding: '0 14px',
                  fontFamily: DS.F,
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city}>
                    {cityLabel(city, ar)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}
              >
                {tx('busPage.travel_date')}
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
                  color: C.text,
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
                    setBookingSource(null);
                  }}
                  style={{
                    borderRadius: r(14),
                    border: `1px solid ${active ? DS.green : DS.border}`,
                    background: active ? `${DS.green}12` : DS.card2,
                    padding: '10px 14px',
                    color: C.text,
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  {cityLabel(preset.from, ar)} {ar ? 'إلى' : 'to'} {cityLabel(preset.to, ar)}
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
              label: local('Routes', 'المسارات'),
              value: `${exactRouteCount}/${busRoutes.length}`,
              detail: local('Exact matches first', 'المطابقات الدقيقة أولاً'),
              icon: <Route size={18} />,
              color: DS.green,
            },
            {
              label: local('Seats', 'المقاعد'),
              value: `${totalOpenSeats}`,
              detail: local('Visible now', 'المتاح الآن'),
              icon: <Users size={18} />,
              color: activeBus.color ?? DS.cyan,
            },
            {
              label: local('Best fare', 'أفضل سعر'),
              value: `${Math.min(...busRoutes.map(route => route.price))} JOD`,
              detail: local('Lowest on screen', 'الأقل في النتائج'),
              icon: <CreditCard size={18} />,
              color: DS.cyan,
            },
            {
              label: local('Operators', 'المشغّلون'),
              value: `${operatorCount}`,
              detail: local('Shown now', 'المعروض الآن'),
              icon: <TimerReset size={18} />,
              color: DS.gold,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: C.card,
                border: `1px solid ${DS.border}`,
                borderRadius: r(18),
                padding: '18px 18px 16px',
                boxShadow: SH.card,
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
              <div style={{ color: C.text, fontWeight: 700, fontSize: '0.86rem' }}>
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
            role="status"
            aria-live="polite"
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
            {routesLoading ? local('Refreshing departures...', 'يتم تحديث مواعيد المغادرة...') : routesInfo}
          </div>
        )}

        <div
          className="sp-2col"
          style={{
            marginBottom: 18,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(280px, 0.85fr)',
            gap: 14,
          }}
        >
          <div
            style={{
              borderRadius: r(20),
              padding: '18px 18px 16px',
              background: `linear-gradient(135deg, ${C.greenDim}, ${C.elevated})`,
              border: `1px solid ${activeStatus.color}22`,
              boxShadow: SH.card,
              display: 'grid',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    color: activeStatus.color,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {tx('busPage.departure_plan')}
                </div>
                <div style={{ color: C.text, fontSize: '1.08rem', fontWeight: 900, marginTop: 6 }}>
                  {cityLabel(activeBus.from, ar)} {tx('busPage.to')}
                  {cityLabel(activeBus.to, ar)}
                </div>
              </div>
              <span style={{ ...pill(activeStatus.color), fontSize: '0.68rem' }}>
                {activeStatus.label}
              </span>
            </div>

            <div style={{ color: DS.sub, fontSize: '0.84rem', lineHeight: 1.65 }}>
              {departureLabel}. {selectedSourceDetail}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ ...pill(activeBus.color ?? DS.cyan), fontSize: '0.68rem' }}>
                {selectedSourceLabel}
              </span>
              <span style={{ ...pill(DS.green), fontSize: '0.68rem' }}>
                {activeBus.serviceLevel === 'Standard' ? local('Standard', 'عادية') : activeBus.serviceLevel} | {activeBus.company}
              </span>
              <span style={{ ...pill(DS.gold), fontSize: '0.68rem' }}>
                {activeBus.dep} {tx('busPage.to_2')}
                {activeBus.arr}
              </span>
            </div>

            <div style={{ color: DS.muted, fontSize: '0.78rem', lineHeight: 1.6 }}>
              {exactCoverageText}
            </div>
          </div>

          <div
            style={{
              borderRadius: r(20),
              padding: '18px 18px 16px',
              background: DS.card,
              border: `1px solid ${DS.border}`,
              boxShadow: SH.card,
              display: 'grid',
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  color: DS.gold,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                }}
              >
                {tx('busPage.fallback_departures')}
              </div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: '1rem', marginTop: 6 }}>
                {fallbackBuses.length > 0
                  ? local('Keep one calmer alternative visible', 'احتفظ ببديل مناسب ظاهرًا')
                  : local('Selected departure is currently the clearest fit', 'المغادرة المختارة هي الأنسب حاليًا')}
              </div>
            </div>

            {fallbackBuses.length > 0 ? (
              fallbackBuses.map(route => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    setSelected(route.id);
                    setBookingComplete(false);
                    setBookingSource(null);
                  }}
                  style={{
                    textAlign: 'left',
                    borderRadius: r(14),
                    border: `1px solid ${route.color ?? DS.cyan}24`,
                    background: C.elevated,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: C.text, fontWeight: 800, fontSize: '0.84rem' }}>
                      {route.company}
                    </span>
                    <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.64rem' }}>
                      {route.dep}
                    </span>
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.78rem' }}>
                    {route.from} {tx('busPage.to_3')}
                    {route.to} | {route.price} JOD | {route.seats} {tx('busPage.seats')}
                  </div>
                </button>
              ))
            ) : (
              <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
                {tx(
                  'busPage.no_fallback_departure_is_currently_cleaner_than_the_selected_route_you_can_continue_with_the_booking_plan_below',
                )}
              </div>
            )}
          </div>
        </div>

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
            {busRoutes.map((route, index) => {
              const isSelected = selected === route.id;
              const soldOut = route.seats === 0;
              const exactMatch = isExactRoute(route, origin, destination);
              const routeStatus = getRouteStatus(route, tripDate, today, ar);
              return (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    background: DS.card,
                    borderRadius: r(20),
                    border: `1px solid ${isSelected ? (route.color ?? DS.cyan) : DS.border}`,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 10px 30px ${route.color ?? DS.cyan}12` : 'none',
                    opacity: soldOut ? 0.8 : 1,
                  }}
                  onClick={() => {
                    setSelected(String(route.id));
                    setBookingComplete(false);
                    setBookingSource(null);
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
                              color: C.text,
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              letterSpacing: 0,
                            }}
                          >
                            {route.from} {tx('busPage.to_4')}
                            {route.to}
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
                              {tx('busPage.selected_route')}
                            </span>
                          )}
                          {!exactMatch && (
                            <span style={{ ...pill(DS.gold), fontSize: '0.64rem' }}>
                              {tx('busPage.closest_alternative')}
                            </span>
                          )}
                          {route.dataSource === 'official' && (
                            <span style={{ ...pill(DS.cyan), fontSize: '0.64rem' }}>
                              {tx('busPage.official_schedule')}
                            </span>
                          )}
                          <span style={{ ...pill(routeStatus.color), fontSize: '0.64rem' }}>
                            {routeStatus.label}
                          </span>
                          {soldOut && (
                            <span style={{ ...pill(DS.gold), fontSize: '0.64rem' }}>
                              {tx('busPage.sold_out')}
                            </span>
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
                          {tx('busPage.jod_seat')}
                        </div>
                        <span
                          style={{
                            ...pill(soldOut ? DS.gold : route.seats > 5 ? DS.green : DS.gold),
                            marginTop: 6,
                            fontSize: '0.65rem',
                          }}
                        >
                          {soldOut
                            ? local('No seats left', 'لا توجد مقاعد متبقية')
                            : local(`${route.seats} seats left`, `${route.seats} مقاعد متبقية`)}
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
                          label: local('Pickup', 'الانطلاق'),
                          value: route.pickupPoint,
                          icon: <MapPin size={13} color={route.color ?? DS.cyan} />,
                        },
                        {
                          label: local('Schedule', 'الجدول'),
                          value: route.scheduleDays ?? route.frequency,
                          icon: <Calendar size={13} color={route.color ?? DS.cyan} />,
                        },
                        {
                          label: local('Status', 'الحالة'),
                          value: routeStatus.detail,
                          icon: <Award size={13} color={route.color ?? DS.cyan} />,
                        },
                      ].map(item => (
                        <div
                          key={item.label}
                          style={{
                            background: C.elevated,
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
                              color: C.text,
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
                        <span style={pill(DS.sub)}>
                          +{getScheduleTimes(route).length - 6} {tx('busPage.more')}
                        </span>
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
                          {tx('busPage.via')}
                          {stop}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
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
                background: C.card,
                border: `1px solid ${activeBus.color ?? DS.cyan}30`,
                borderRadius: r(22),
                overflow: 'hidden',
                boxShadow: `0 16px 42px ${activeBus.color ?? DS.cyan}10`,
              }}
            >
              <div
                style={{
                  padding: '22px 22px 18px',
                  background: `linear-gradient(135deg, ${DS.navy}, ${activeBus.color ?? DS.cyan}22)`,
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
                    <div style={{ color: C.text, fontWeight: 900, fontSize: '1.15rem' }}>
                      {tx('busPage.reserve_your_seat')}
                    </div>
                    <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 4 }}>
                      {activeBus.from} {tx('busPage.to_5')}
                      {activeBus.to} - {activeBus.company} - {activeBus.serviceLevel ?? 'Standard'}
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
                            : C.elevated,
                        color: C.text,
                        fontWeight: 700,
                      }}
                    >
                      {mode === 'depart-now' ? local('Depart now', 'غادر الآن') : local('Book later', 'احجز لاحقًا')}
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
                      letterSpacing: 0,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    {tx('busPage.departure_plan_2')}
                  </div>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem' }}>
                    {departureLabel}
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 4 }}>
                    {tx('busPage.board_at')}
                    {activeBus.pickupPoint} {tx('busPage.arrive_at')}
                    {activeBus.dropoffPoint}.
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
                    {tx('busPage.departure_time')}
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
                          color: C.text,
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
                      background: C.goldDim,
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: r(16),
                      padding: '14px 16px',
                      color: C.text,
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {tx(
                      'busPage.this_coach_is_full_right_now_switch_routes_and_keep_the_same_corridor_filters',
                    )}
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
                      color: C.text,
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
                      {tx('trips.passengers')}
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
                          color: C.text,
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <div style={{ flex: 1, textAlign: 'center', color: C.text, fontWeight: 800 }}>
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
                          color: C.text,
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
                      {tx('busPage.seat_preference')}
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
                        color: C.text,
                        padding: '0 14px',
                        fontFamily: DS.F,
                      }}
                    >
                      <option value="window">{tx('busPage.window')}</option>
                      <option value="aisle">{tx('busPage.aisle')}</option>
                      <option value="front-zone">{tx('busPage.front_zone')}</option>
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${C.cyanDim}, ${C.goldDim})`,
                    border: `1px solid ${DS.border}`,
                    borderRadius: r(16),
                    padding: '16px 16px 14px',
                    boxShadow: SH.card,
                  }}
                >
                  {[
                    { label: local('Seat fare', 'سعر المقعد'), value: `${activeBus.price} JOD × ${passengers}` },
                    {
                      label: local('Schedule days', 'أيام التشغيل'),
                      value: activeBus.scheduleDays ?? activeBus.frequency,
                    },
                    { label: local('Available on this coach', 'المتاح في هذه الحافلة'), value: local(`${activeBus.seats} seats`, `${activeBus.seats} مقعدًا`) },
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
                      <span style={{ color: C.text, fontWeight: 700 }}>{row.value}</span>
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
                    <span style={{ color: C.text, fontWeight: 800 }}>{tx('common.total')}</span>
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
                  data-testid="bus-confirm-booking"
                  onClick={handleBusBooking}
                  disabled={bookingDisabled}
                  type="button"
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: r(16),
                    border: 'none',
                    background: bookingDisabled
                      ? C.elevated
                      : `linear-gradient(135deg,${activeBus.color ?? DS.cyan},${DS.blue})`,
                    color: C.text,
                    fontWeight: 900,
                    fontFamily: DS.F,
                    cursor: bookingDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    opacity: bookingDisabled ? 0.72 : 1,
                    boxShadow: SH.card,
                  }}
                >
                  {bookingBusy
                    ? 'Reserving seat...'
                    : activeBus.seats === 0
                      ? local('Try another departure', 'جرّب مغادرة أخرى')
                      : local('Reserve seat', 'احجز المقعد')}
                </button>
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
                    {tx('busPage.official_schedule_verified')}
                    {activeBus.lastVerifiedAt}
                  </a>
                )}
                {bookingComplete && (
                  <div
                    style={{
                      background: C.greenDim,
                      border: `1px solid ${C.greenDim}`,
                      borderRadius: r(16),
                      padding: '14px 16px',
                    }}
                  >
                    <div
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
                      {tx('busPage.seat_confirmed')}
                    </div>
                    <div style={{ color: C.text, fontSize: '0.86rem', lineHeight: 1.5 }}>
                      {passengers} {tx('busPage.seat')}
                      {ar ? ' محجوزة لـ ' : passengers > 1 ? 's are reserved for ' : ' is reserved for '}
                      {departureLabel}
                      {tx('busPage.ticket_code')}
                      {bookingTicketCode ?? 'pending'} {tx('busPage.was_saved_for_the')}
                      {activeBus.from} {tx('busPage.to_6')}
                      {activeBus.to}{' '}
                      {tx('busPage.corridor_saved_in_your_account_with_departure_reminders')}
                      {bookingSource === 'local'
                        ? ' Secure confirmation will sync when the booking backend reconnects.'
                        : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={openBusSupport}
                        style={{
                          height: 38,
                          padding: '0 14px',
                          borderRadius: '99px',
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          color: C.text,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {tx('busPage.open_support')}
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
                  <div style={{ color: C.text, fontWeight: 800 }}>
                    {tx('busPage.live_route_view')}
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 4 }}>
                    {tx('busPage.see_pickup_destination_and_route_direction_before_checkout')}
                  </div>
                </div>
                <span style={{ ...pill(activeBus.color ?? DS.cyan), fontSize: '0.68rem' }}>
                  {tx('busPage.map_enabled')}
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
                    label: 'الصعود',
                    value: activeBus.pickupPoint,
                  },
                  {
                    icon: <ArrowRight size={14} color={activeBus.color ?? DS.cyan} />,
                    label: 'الموقف الرئيسي',
                    value: activeBus.via.join(' - '),
                  },
                  {
                    icon: <Clock size={14} color={activeBus.color ?? DS.cyan} />,
                    label: 'وقت الوصول',
                    value: `${activeBus.arr} وصول - ${activeBus.duration}`,
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
                      <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
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
              <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
                {tx('busPage.corridor_snapshot')}
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
                        <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
                          {route.from} {tx('busPage.to_7')}
                          {route.to}
                        </div>
                        <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>
                          {route.company} - {times[0]} {tx('busPage.first')}
                          {times[times.length - 1]} {tx('busPage.last')}
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
                          ...pill(route.dataSource === 'official' ? DS.cyan : DS.green),
                          fontSize: '0.64rem',
                        }}
                      >
                        {route.dataSource === 'official' ? 'رسمي' : 'مباشر'}
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
              <div style={{ color: C.text, fontWeight: 800, marginBottom: 8 }}>
                {tx('busPage.what_to_know_before_you_go')}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  'خطوط الأردن تستخدم الآن مواعيد وأسعار وأيام تشغيل رسمية من المزودين بدل قائمة تجريبية فقط.',
                  'وقت المغادرة قابل للاختيار، والصفحة تعرض حالة اليوم مثل الصعود قريباً أو مغلق اليوم.',
                  'إذا ما توفر مخزون مباشر، واصل يرجع للجدول الرسمي الموثق بدل إخفاء الخط.',
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
              <div style={{ color: C.text, fontWeight: 800, marginBottom: 8 }}>
                {tx('busPage.if_this_coach_fills_up')}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {fallbackBuses.length > 0 ? (
                  fallbackBuses.map(route => (
                    <button
                      key={`fallback-${route.id}`}
                      type="button"
                      onClick={() => {
                        setSelected(route.id);
                        setBookingComplete(false);
                        setBookingSource(null);
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
                        color: C.text,
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                          {route.dep} {tx('busPage.departure')}
                        </div>
                        <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>
                          {route.summary}
                        </div>
                      </div>
                      <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.68rem' }}>
                        {route.seats} {tx('busPage.seats_2')}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.55 }}>
                    {tx(
                      'busPage.more_departures_will_appear_here_as_the_corridor_refreshes_if_the_route_is_urgent_try_another_coach_or_a_shared_ride_on_the_same_day',
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ServiceFlowPlaybook focusService="bus" />
      </PageShell>
    </Protected>
  );
}

export default BusPage;
