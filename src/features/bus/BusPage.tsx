import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Bus,
  CreditCard,
  Route,
  TimerReset,
  Users,
} from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import {
  createBusBooking,
  fetchBusRoutes,
  getOfficialBusRoutes,
  type BusRoute,
} from '../../services/bus';
import { createSupportTicket } from '../../services/supportInbox';
import { notificationsAPI } from '../../services/notifications.js';
import {
  CITIES,
  CoreExperienceBanner,
  DS,
  midpoint,
  PageShell,
  Protected,
  r,
  resolveCityCoord,
  SectionHead,
} from '../shared/pageShared';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { C, SH } from '../../utils/wasel-ds';
import { tx } from '../../locales/tx';
import { useLanguage } from '../../contexts/LanguageContext';
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
  const fallbackBuses = busRoutes
    .filter(route => route.id !== activeBus.id && route.seats > 0)
    .slice(0, 2);

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
          <BusRouteList
            routes={busRoutes}
            selectedId={selected}
            onSelect={(id) => { setSelected(id); setBookingComplete(false); setBookingSource(null); }}
            origin={origin}
            destination={destination}
            tripDate={tripDate}
            today={today}
            ar={ar}
            onBookingComplete={() => setBookingComplete(false)}
          />
          <BusBookingForm
            activeBus={activeBus}
            scheduleMode={scheduleMode}
            setScheduleMode={setScheduleMode}
            selectedDeparture={selectedDeparture}
            setSelectedDeparture={setSelectedDeparture}
            departureTimes={departureTimes}
            passengers={passengers}
            setPassengers={setPassengers}
            seatPreference={seatPreference}
            setSeatPreference={setSeatPreference}
            tripDate={tripDate}
            today={today}
            totalPrice={totalPrice}
            bookingDisabled={bookingDisabled}
            bookingBusy={bookingBusy}
            bookingComplete={bookingComplete}
            bookingTicketCode={bookingTicketCode}
            bookingSource={bookingSource}
            handleBusBooking={handleBusBooking}
            openBusSupport={openBusSupport}
            ar={ar}
          />
        </div>

        <BusMap
          activeBus={{
            from: activeBus.from,
            to: activeBus.to,
            pickupPoint: activeBus.pickupPoint,
            dropoffPoint: activeBus.dropoffPoint,
            via: activeBus.via,
            dep: activeBus.dep,
            arr: activeBus.arr,
            duration: activeBus.duration,
            color: activeBus.color,
          }}
          routeCenter={routeCenter}
          pickupCoord={pickupCoord}
          dropoffCoord={dropoffCoord}
        />

        <BusSchedule
          busRoutes={busRoutes}
          origin={origin}
          destination={destination}
          onSelect={(id) => { setSelected(id); setBookingComplete(false); setBookingSource(null); }}
          onBookingComplete={() => setBookingComplete(false)}
        />

        <ServiceFlowPlaybook focusService="bus" />
      </PageShell>
    </Protected>
  );
}
