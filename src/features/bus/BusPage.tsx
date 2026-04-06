import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { MapWrapper } from '../../components/MapWrapper';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { createBusBooking, fetchBusRoutes, getOfficialBusRoutes, type BusRoute } from '../../services/bus';
import { createSupportTicket } from '../../services/supportInbox';
import { notificationsAPI } from '../../services/notifications.js';
import {
  routeEndpointsAreDistinct,
  routeMatchesLocationPair,
} from '../../utils/jordanLocations';
import {
  CITIES,
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
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';

const JOURNEY_PRESETS = [
  { from: 'Amman', to: 'Aqaba', label: 'Amman to Aqaba' },
  { from: 'Amman', to: 'Irbid', label: 'Amman to Irbid' },
  { from: 'Amman', to: 'Petra', label: 'Amman to Petra' },
  { from: 'Amman', to: 'Wadi Rum', label: 'Amman to Wadi Rum' },
  { from: 'Irbid', to: 'Amman', label: 'Irbid to Amman' },
];

function getTodayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isExactRoute(route: BusRoute, from: string, to: string) {
  return routeMatchesLocationPair(route.from, route.to, from, to, { allowReverse: false });
}

function getScheduleTimes(route: BusRoute) {
  return route.departureTimes?.length ? route.departureTimes : [route.dep];
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function getRouteStatus(route: BusRoute, tripDate: string, today: string) {
  if (tripDate !== today) {
    return { label: 'Scheduled', detail: route.scheduleDays ?? 'Published schedule', color: DS.cyan };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const times = getScheduleTimes(route).map(toMinutes).sort((a, b) => a - b);
  const next = times.find((minutes) => minutes >= currentMinutes);

  if (next === undefined) {
    return { label: 'Closed today', detail: 'No more departures left today', color: DS.gold };
  }

  const minutesAway = next - currentMinutes;
  if (minutesAway <= 15) {
    return { label: 'Boarding soon', detail: `${minutesAway} min to departure`, color: DS.green };
  }
  if (minutesAway <= 60) {
    return { label: 'Departing this hour', detail: `${minutesAway} min to departure`, color: DS.cyan };
  }

  return { label: 'Later today', detail: `${minutesAway} min to the next departure`, color: DS.cyan };
}

export function BusPage() {
  const { user } = useLocalAuth();
  const today = getTodayIsoDate();
  const [origin, setOrigin] = useState('Amman');
  const [destination, setDestination] = useState('Aqaba');
  const [tripDate, setTripDate] = useState(today);
  const [passengers, setPassengers] = useState(1);
  const [scheduleMode, setScheduleMode] = useState<'depart-now' | 'schedule-later'>('schedule-later');
  const [seatPreference, setSeatPreference] = useState<'window' | 'aisle' | 'front-zone'>('window');
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>(() => getOfficialBusRoutes({ from: 'Amman', to: 'Aqaba' }));
  const [selected, setSelected] = useState(() => getOfficialBusRoutes({ from: 'Amman', to: 'Aqaba' })[0]?.id ?? '');
  const [selectedDeparture, setSelectedDeparture] = useState(() => getOfficialBusRoutes({ from: 'Amman', to: 'Aqaba' })[0]?.dep ?? '07:00');
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
      const fallbackRoutes = getOfficialBusRoutes({ from: origin, to: destination, seats: passengers });
      if (!routeEndpointsAreDistinct(origin, destination)) {
        setBusRoutes(fallbackRoutes);
        setSelected(fallbackRoutes[0]?.id ?? '');
        setRoutesInfo('Choose two different locations to preview the right coach corridor.');
        setRoutesLoading(false);
        return;
      }
      setRoutesLoading(true);
      setRoutesInfo(null);
      try {
        const liveRoutes = await fetchBusRoutes({ from: origin, to: destination, date: tripDate, seats: passengers });
        if (cancelled) return;
        const exactLiveRoutes = liveRoutes.filter((route) => isExactRoute(route, origin, destination));
        const nextRoutes = exactLiveRoutes.length ? exactLiveRoutes : liveRoutes;
        if (nextRoutes.length) {
          setBusRoutes(nextRoutes);
          setSelected((prev) => (nextRoutes.some((route) => route.id === prev) ? prev : nextRoutes[0].id));
          setRoutesInfo(
            nextRoutes[0]?.dataSource === 'live'
              ? 'Live bus inventory is synced for this corridor.'
              : `Showing official Jordan schedule data verified on ${nextRoutes[0]?.lastVerifiedAt ?? today}.`,
          );
        } else {
          setBusRoutes(fallbackRoutes);
          setSelected((prev) => (fallbackRoutes.some((route) => route.id === prev) ? prev : fallbackRoutes[0]?.id ?? ''));
          setRoutesInfo(fallbackRoutes.some((route) => isExactRoute(route, origin, destination)) ? `Showing official Jordan schedules verified on ${fallbackRoutes[0]?.lastVerifiedAt ?? today}.` : 'No exact coach found yet. Showing the closest official corridors.');
        }
      } catch {
        if (cancelled) return;
        setBusRoutes(fallbackRoutes);
        setSelected((prev) => (fallbackRoutes.some((route) => route.id === prev) ? prev : fallbackRoutes[0]?.id ?? ''));
        setRoutesInfo(`Live route API is unavailable. Showing official Jordan schedules verified on ${fallbackRoutes[0]?.lastVerifiedAt ?? today}.`);
      } finally {
        if (!cancelled) setRoutesLoading(false);
      }
    }
    loadBusRoutes();
    return () => { cancelled = true; };
  }, [destination, origin, passengers, tripDate]);

  const activeBus = busRoutes.find((route) => route.id === selected) ?? busRoutes[0] ?? getOfficialBusRoutes()[0];
  const pickupCoord = resolveCityCoord(activeBus.from);
  const dropoffCoord = resolveCityCoord(activeBus.to);
  const routeCenter = midpoint(pickupCoord, dropoffCoord);
  const totalPrice = activeBus.price * passengers;
  const totalOpenSeats = busRoutes.reduce((sum, route) => sum + route.seats, 0);
  const exactRouteCount = busRoutes.filter((route) => isExactRoute(route, origin, destination)).length;
  const operatorCount = new Set(busRoutes.map((route) => route.company)).size;
  const bookingDisabled = bookingBusy || routesLoading || !routeEndpointsAreDistinct(origin, destination) || activeBus.seats === 0 || passengers > activeBus.seats;
  const departureTimes = getScheduleTimes(activeBus);
  const departureKey = departureTimes.join('|');
  const departureLabel = scheduleMode === 'depart-now' ? `Next departure today at ${selectedDeparture}` : `${tripDate} at ${selectedDeparture}`;
  const activeStatus = getRouteStatus(activeBus, tripDate, today);
  const fallbackBuses = busRoutes.filter((route) => route.id !== activeBus.id && route.seats > 0).slice(0, 2);

  useEffect(() => {
    setPassengers((value) => (activeBus.seats > 0 ? Math.min(value, activeBus.seats) : 1));
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
        passengerName: user?.name,
        passengerEmail: user?.email,
      });
      setBookingSource(result.source);
      setBookingTicketCode(result.ticketCode);
      setBookingComplete(true);
      notificationsAPI.createNotification({
        title: 'Bus seat confirmed',
        message: `${activeBus.from} to ${activeBus.to} is confirmed. Ticket ${result.ticketCode}.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/bus',
      }).catch(() => {});
    } finally {
      setBookingBusy(false);
    }
  }

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="🚌" title="Wasel Bus" sub="Official Jordan intercity schedules, route-aware booking, and provider-backed fare visibility." color={DS.green} />
        <CoreExperienceBanner title="Jordan-wide bus schedules with provider-backed fares" detail="Wasel Bus now uses official intercity coach schedules as the baseline network across Jordan, while still allowing live inventory to take over when a real bus feed is available." tone={DS.green} />

        {Boolean((globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner) && <div style={{ marginBottom: 18 }}>
          <StakeholderSignalBanner
            eyebrow="Wasel · bus comms"
            title="Bus booking now shows the same shared context as the rest of the app"
            detail="Passengers, operators, and support can now read one clearer coach story with route status, fallback choices, ticket state, and official schedule context all in one place."
            stakeholders={[
              { label: 'Visible routes', value: String(busRoutes.length), tone: 'teal' },
              { label: 'Operators', value: String(operatorCount), tone: 'blue' },
              { label: 'Open seats', value: String(totalOpenSeats), tone: 'green' },
              { label: 'Fallback options', value: String(fallbackBuses.length), tone: 'amber' },
            ]}
            statuses={[
              { label: 'Active route', value: `${activeBus.from} to ${activeBus.to}`, tone: 'teal' },
              { label: 'Route status', value: activeStatus.label, tone: activeStatus.label === 'Boarding soon' ? 'green' : activeStatus.label === 'Closed today' ? 'amber' : 'blue' },
              { label: 'Ticket state', value: bookingComplete ? 'Reserved' : 'Open', tone: bookingComplete ? 'green' : 'slate' },
            ]}
            lanes={[
              { label: 'Passenger lane', detail: 'Schedule, seat preference, and ticket state all stay tied to one route record.' },
              { label: 'Operator lane', detail: 'Official schedules, provider visibility, and route status make coach supply easier to trust.' },
              { label: 'Support lane', detail: 'When a booking changes or fills up, fallback departures and support handoff stay close by.' },
            ]}
          />
        </div>}

        <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${DS.border}`, borderRadius: r(22), padding: 18, marginBottom: 18, boxShadow: '0 14px 34px rgba(0,0,0,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, letterSpacing: '-0.02em' }}>Plan your trip</div>
              <div style={{ color: DS.sub, fontSize: '0.82rem', marginTop: 4 }}>Pick your cities first so live inventory and fallback schedules stay relevant.</div>
            </div>
            <button onClick={() => { setOrigin(destination); setDestination(origin); setBookingComplete(false); setBookingSource(null); }} type="button" style={{ height: 42, padding: '0 16px', borderRadius: '99px', border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 18px rgba(0,0,0,0.14)' }}>
              <ArrowLeftRight size={16} />
              Swap cities
            </button>
          </div>
          <div className="sp-search-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}>From</label>
              <select value={origin} onChange={(event) => { setOrigin(event.target.value); setBookingComplete(false); setBookingSource(null); }} style={{ width: '100%', height: 46, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', padding: '0 14px', fontFamily: DS.F }}>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}>To</label>
              <select value={destination} onChange={(event) => { setDestination(event.target.value); setBookingComplete(false); setBookingSource(null); }} style={{ width: '100%', height: 46, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', padding: '0 14px', fontFamily: DS.F }}>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}>Travel date</label>
              <input type="date" min={today} value={tripDate} onChange={(event) => { setTripDate(event.target.value); setBookingComplete(false); }} style={{ width: '100%', height: 46, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', padding: '0 14px', fontFamily: DS.F }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {JOURNEY_PRESETS.map((preset) => {
              const active = origin === preset.from && destination === preset.to;
              return (
                <button key={preset.label} type="button" onClick={() => { setOrigin(preset.from); setDestination(preset.to); setBookingComplete(false); setBookingSource(null); }} style={{ borderRadius: r(14), border: `1px solid ${active ? DS.green : DS.border}`, background: active ? `${DS.green}12` : DS.card2, padding: '10px 14px', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {[ 
            { label: 'Matching routes', value: `${exactRouteCount}/${busRoutes.length}`, detail: 'Exact corridor coaches first', icon: <Route size={18} />, color: DS.green },
            { label: 'Open seats', value: `${totalOpenSeats}`, detail: 'Across the visible schedules', icon: <Users size={18} />, color: activeBus.color ?? DS.cyan },
            { label: 'Best fare', value: `${Math.min(...busRoutes.map((route) => route.price))} JOD`, detail: 'Lowest official fare on screen', icon: <CreditCard size={18} />, color: DS.cyan },
            { label: 'Operators', value: `${operatorCount}`, detail: 'Visible schedule providers', icon: <TimerReset size={18} />, color: DS.gold },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${DS.border}`, borderRadius: r(18), padding: '18px 18px 16px', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ width: 42, height: 42, borderRadius: r(12), background: `${item.color}16`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: 14 }}>{item.icon}</div>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        {(routesLoading || routesInfo) && <div style={{ marginBottom: 16, background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(14), padding: '12px 14px', color: DS.sub, fontSize: '0.8rem' }}>{routesLoading ? 'Syncing live bus routes...' : routesInfo}</div>}

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {busRoutes.map((route, index) => {
              const isSelected = selected === route.id;
              const soldOut = route.seats === 0;
              const exactMatch = isExactRoute(route, origin, destination);
              const routeStatus = getRouteStatus(route, tripDate, today);
              return (
                <motion.div key={route.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{ background: DS.card, borderRadius: r(20), border: `1px solid ${isSelected ? (route.color ?? DS.cyan) : DS.border}`, overflow: 'hidden', cursor: 'pointer', boxShadow: isSelected ? `0 10px 30px ${route.color ?? DS.cyan}12` : 'none', opacity: soldOut ? 0.8 : 1 }} onClick={() => { setSelected(String(route.id)); setBookingComplete(false); setBookingSource(null); }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg,${route.color ?? DS.cyan},transparent)` }} />
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: r(12), background: `${route.color ?? DS.cyan}15`, border: `1.5px solid ${route.color ?? DS.cyan}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bus size={22} color={route.color ?? DS.cyan} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{route.from} to {route.to}</div>
                          <div style={{ color: DS.sub, fontSize: '0.82rem', marginTop: 3 }}>{route.company} - {route.serviceLevel ?? 'Standard'} - {route.duration}</div>
                          <div style={{ color: DS.muted, fontSize: '0.78rem', marginTop: 8, lineHeight: 1.55 }}>{route.summary}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                          {isSelected && <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.64rem' }}>Selected route</span>}
                          {!exactMatch && <span style={{ ...pill(DS.gold), fontSize: '0.64rem' }}>Closest alternative</span>}
                          {route.dataSource === 'official' && <span style={{ ...pill(DS.cyan), fontSize: '0.64rem' }}>Official schedule</span>}
                          <span style={{ ...pill(routeStatus.color), fontSize: '0.64rem' }}>{routeStatus.label}</span>
                          {soldOut && <span style={{ ...pill(DS.gold), fontSize: '0.64rem' }}>Sold out</span>}
                        </div>
                        <div style={{ color: route.color ?? DS.cyan, fontWeight: 900, fontSize: '1.6rem' }}>{route.price}</div>
                        <div style={{ color: DS.muted, fontSize: '0.62rem', fontWeight: 600 }}>JOD/seat</div>
                        <span style={{ ...pill(soldOut ? DS.gold : route.seats > 5 ? DS.green : DS.gold), marginTop: 6, fontSize: '0.65rem' }}>{soldOut ? 'No seats left' : `${route.seats} seats left`}</span>
                      </div>
                    </div>
                    <div className="sp-bus-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginTop: 16 }}>
                      {[{ label: 'Pickup', value: route.pickupPoint, icon: <MapPin size={13} color={route.color ?? DS.cyan} /> }, { label: 'Schedule', value: route.scheduleDays ?? route.frequency, icon: <Calendar size={13} color={route.color ?? DS.cyan} /> }, { label: 'Status', value: routeStatus.detail, icon: <Award size={13} color={route.color ?? DS.cyan} /> }].map((item) => (
                        <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${DS.border}`, borderRadius: r(12), padding: '12px 13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: DS.muted, fontSize: '0.68rem', fontWeight: 700, marginBottom: 4 }}>{item.icon}{item.label}</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.35 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                      {getScheduleTimes(route).slice(0, 6).map((time) => <span key={time} style={pill(route.color ?? DS.cyan)}>{time}</span>)}
                      {getScheduleTimes(route).length > 6 && <span style={pill(DS.sub)}>+{getScheduleTimes(route).length - 6} more</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                      {route.amenities.map((amenity) => <span key={amenity} style={pill(route.color ?? DS.cyan)}>{amenity}</span>)}
                      {route.via.map((stop) => <span key={stop} style={pill(DS.sub)}>Via {stop}</span>)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="sp-side-column" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 16 }}>
            <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${(activeBus.color ?? DS.cyan)}30`, borderRadius: r(22), overflow: 'hidden', boxShadow: `0 16px 42px ${activeBus.color ?? DS.cyan}10` }}>
              <div style={{ padding: '22px 22px 18px', background: `linear-gradient(135deg, ${DS.navy}, ${activeBus.color ?? DS.cyan}22)` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.15rem' }}>Reserve your seat</div>
                    <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 4 }}>{activeBus.from} to {activeBus.to} - {activeBus.company} - {activeBus.serviceLevel ?? 'Standard'}</div>
                  </div>
                  <span style={{ ...pill(activeStatus.color), fontSize: '0.7rem' }}>{activeStatus.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['depart-now', 'schedule-later'] as const).map((mode) => <button key={mode} onClick={() => { setScheduleMode(mode); setBookingComplete(false); }} type="button" style={{ height: 38, padding: '0 14px', borderRadius: '99px', border: 'none', cursor: 'pointer', background: scheduleMode === mode ? (mode === 'depart-now' ? DS.gradC : DS.gradG) : 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700 }}>{mode === 'depart-now' ? 'Depart now' : 'Book later'}</button>)}
                </div>
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(16), padding: '14px 16px' }}>
                  <div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Departure plan</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>{departureLabel}</div>
                  <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 4 }}>Board at {activeBus.pickupPoint} - arrive at {activeBus.dropoffPoint}.</div>
                  <div style={{ color: activeStatus.color, fontSize: '0.78rem', marginTop: 6, fontWeight: 700 }}>{activeStatus.detail}</div>
                </div>
                <div>
                  <label style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}>Departure time</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {departureTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => { setSelectedDeparture(time); setBookingComplete(false); }}
                        style={{
                          height: 36,
                          padding: '0 12px',
                          borderRadius: '99px',
                          border: `1px solid ${selectedDeparture === time ? (activeBus.color ?? DS.cyan) : DS.border}`,
                          background: selectedDeparture === time ? `${activeBus.color ?? DS.cyan}18` : DS.card2,
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                {activeBus.seats === 0 && <div style={{ background: 'rgba(199,255,26,0.10)', border: '1px solid rgba(199,255,26,0.28)', borderRadius: r(16), padding: '14px 16px', color: '#fff', fontSize: '0.84rem', lineHeight: 1.5 }}>This coach is full right now. Switch routes and keep the same corridor filters.</div>}
                {scheduleMode === 'schedule-later' && <input type="date" min={today} value={tripDate} onChange={(event) => { setTripDate(event.target.value); setBookingComplete(false); }} style={{ width: '100%', height: 46, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', padding: '0 14px', fontFamily: DS.F }} />}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}>Passengers</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(14), overflow: 'hidden' }}>
                      <button onClick={() => { setPassengers((value) => Math.max(1, value - 1)); setBookingComplete(false); }} type="button" style={{ width: 42, height: 46, border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>-</button>
                      <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 800 }}>{passengers}</div>
                      <button onClick={() => { if (activeBus.seats > 0) { setPassengers((value) => Math.min(activeBus.seats, value + 1)); setBookingComplete(false); } }} type="button" disabled={activeBus.seats === 0 || passengers >= activeBus.seats} style={{ width: 42, height: 46, border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: activeBus.seats === 0 || passengers >= activeBus.seats ? 'not-allowed' : 'pointer', opacity: activeBus.seats === 0 || passengers >= activeBus.seats ? 0.45 : 1 }}>+</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: DS.sub, fontSize: '0.76rem', marginBottom: 8 }}>Seat preference</label>
                    <select value={seatPreference} onChange={(event) => { setSeatPreference(event.target.value as typeof seatPreference); setBookingComplete(false); }} style={{ width: '100%', height: 46, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', padding: '0 14px', fontFamily: DS.F }}>
                      <option value="window">Window</option>
                      <option value="aisle">Aisle</option>
                      <option value="front-zone">Front zone</option>
                    </select>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(22,199,242,0.08), rgba(199,255,26,0.08))', border: `1px solid ${DS.border}`, borderRadius: r(16), padding: '16px 16px 14px', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}>
                  {[{ label: 'Seat fare', value: `${activeBus.price} JOD x ${passengers}` }, { label: 'Schedule days', value: activeBus.scheduleDays ?? activeBus.frequency }, { label: 'Available on this coach', value: `${activeBus.seats} seats` }].map((row) => <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}><span style={{ color: DS.sub, fontSize: '0.78rem' }}>{row.label}</span><span style={{ color: '#fff', fontWeight: 700 }}>{row.value}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTop: `1px solid ${DS.border}` }}><span style={{ color: '#fff', fontWeight: 800 }}>Total</span><span style={{ color: activeBus.color ?? DS.cyan, fontWeight: 900, fontSize: '1.2rem' }}>{totalPrice} JOD</span></div>
                </div>
                <button data-testid="bus-confirm-booking" onClick={handleBusBooking} disabled={bookingDisabled} type="button" style={{ width: '100%', height: 52, borderRadius: r(16), border: 'none', background: bookingDisabled ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))' : `linear-gradient(135deg,${activeBus.color ?? DS.cyan},${DS.blue})`, color: '#fff', fontWeight: 900, fontFamily: DS.F, cursor: bookingDisabled ? 'not-allowed' : 'pointer', fontSize: '0.95rem', opacity: bookingDisabled ? 0.72 : 1, boxShadow: '0 14px 28px rgba(0,0,0,0.18)' }}>{bookingBusy ? 'Reserving seat...' : activeBus.seats === 0 ? 'Try another departure' : 'Reserve seat'}</button>
                <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.55 }}>
                  {activeBus.seats === 0
                    ? 'This coach is full right now. Pick another departure below and keep the same corridor details.'
                    : 'Your seat, boarding stop, and departure alerts stay linked in your account. If the schedule changes, Wasel updates you.'}
                </div>
                {activeBus.sourceUrl && (
                  <a href={activeBus.sourceUrl} target="_blank" rel="noreferrer" style={{ color: DS.cyan, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <ExternalLink size={14} />
                    Official schedule, verified {activeBus.lastVerifiedAt}
                  </a>
                )}
                {bookingComplete && <div style={{ background: 'rgba(96,197,54,0.10)', border: '1px solid rgba(96,197,54,0.28)', borderRadius: r(16), padding: '14px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: DS.green, fontWeight: 800, marginBottom: 6 }}><CheckCircle2 size={16} />Seat confirmed</div><div style={{ color: '#fff', fontSize: '0.86rem', lineHeight: 1.5 }}>{passengers} seat{passengers > 1 ? 's are' : ' is'} reserved for {departureLabel}. Ticket code {bookingTicketCode ?? 'pending'} was saved for the {activeBus.from} to {activeBus.to} corridor.{bookingSource === 'local' ? ' Saved locally while server sync completes.' : ' Saved in your account with departure reminders.'}</div><div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:10 }}><button type="button" onClick={() => { const ticket = createSupportTicket({ topic: 'bus_booking', subject: `Bus help for ${activeBus.from} to ${activeBus.to}`, detail: `Support requested for bus ticket ${bookingTicketCode ?? 'pending'} on ${departureLabel}.`, relatedId: bookingTicketCode ?? activeBus.id, routeLabel: `${activeBus.from} to ${activeBus.to}` }); notificationsAPI.createNotification({ title: 'Bus support opened', message: `Support ticket ${ticket.id} is following your bus booking.`, type: 'support', priority: 'high', action_url: '/app/profile' }).catch(() => {}); }} style={{ height:38, padding:'0 14px', borderRadius:'99px', border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontWeight:700, cursor:'pointer' }}>Open support</button></div></div>}
              </div>
            </div>

            <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(22), padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div><div style={{ color: '#fff', fontWeight: 800 }}>Live route view</div><div style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 4 }}>See pickup, destination, and route direction before checkout.</div></div>
                <span style={{ ...pill(activeBus.color ?? DS.cyan), fontSize: '0.68rem' }}>Map enabled</span>
              </div>
              <MapWrapper mode="live" center={routeCenter} pickupLocation={pickupCoord} dropoffLocation={dropoffCoord} driverLocation={midpoint(pickupCoord, dropoffCoord)} height={230} showMosques={false} showRadars={false} />
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {[{ icon: <MapPin size={14} color={activeBus.color ?? DS.cyan} />, label: 'Boarding', value: activeBus.pickupPoint }, { icon: <ArrowRight size={14} color={activeBus.color ?? DS.cyan} />, label: 'Main stop', value: activeBus.via.join(' - ') }, { icon: <Clock size={14} color={activeBus.color ?? DS.cyan} />, label: 'ETA', value: `${activeBus.arr} arrival - ${activeBus.duration}` }].map((item) => <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(14), padding: '12px 14px' }}><div style={{ width: 34, height: 34, borderRadius: r(10), background: `${activeBus.color ?? DS.cyan}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div><div><div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 700 }}>{item.label}</div><div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{item.value}</div></div></div>)}
              </div>
            </div>

            <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(22), padding: '18px 18px 16px' }}>
              <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>Corridor snapshot</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {busRoutes.slice(0, 6).map((route) => {
                  const times = getScheduleTimes(route);
                  return (
                    <div key={`${route.id}-snapshot`} className="sp-corridor-snapshot" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) auto auto', gap: 10, alignItems: 'center', background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(14), padding: '12px 14px' }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{route.from} to {route.to}</div>
                        <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>{route.company} - {times[0]} first / {times[times.length - 1]} last</div>
                      </div>
                      <div style={{ color: route.color ?? DS.cyan, fontWeight: 800, fontSize: '0.84rem' }}>{route.price} JOD</div>
                      <span style={{ ...pill(route.dataSource === 'official' ? DS.cyan : DS.green), fontSize: '0.64rem' }}>{route.dataSource === 'official' ? 'Official' : 'Live'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(22), padding: '18px 18px 16px' }}>
              <div style={{ color: '#fff', fontWeight: 800, marginBottom: 8 }}>What to know before you go</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  'Jordan corridors now use official provider schedules, fares, and operating days instead of a demo-only list.',
                  'Departure time is selectable, and the page shows today-aware status such as Boarding soon or Closed today.',
                  'If live inventory is unavailable, Wasel falls back to the verified official schedule instead of hiding the corridor.',
                ].map((item) => <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: DS.sub, fontSize: '0.8rem', lineHeight: 1.5 }}><Shield size={15} color={DS.green} style={{ flexShrink: 0, marginTop: 2 }} /><span>{item}</span></div>)}
              </div>
            </div>
            <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(22), padding: '18px 18px 16px' }}>
              <div style={{ color: '#fff', fontWeight: 800, marginBottom: 8 }}>If this coach fills up</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {fallbackBuses.length > 0 ? fallbackBuses.map((route) => (
                  <button key={`fallback-${route.id}`} type="button" onClick={() => { setSelected(route.id); setBookingComplete(false); setBookingSource(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer', color: '#fff' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{route.dep} departure</div>
                      <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>{route.summary}</div>
                    </div>
                    <span style={{ ...pill(route.color ?? DS.cyan), fontSize: '0.68rem' }}>{route.seats} seats</span>
                  </button>
                )) : <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.55 }}>More departures will appear here as the corridor refreshes. If the route is urgent, try another coach or a shared ride on the same day.</div>}
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

