import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bus, MapPin, Calendar, Award } from 'lucide-react';
import type { BusRoute } from '../../../services/bus';
import { C } from '../../../utils/wasel-ds';
import { DS, r, pill } from '../../shared/pageShared';
import { tx } from '../../../locales/tx';

function getScheduleTimes(route: BusRoute) {
  return route.departureTimes?.length ? route.departureTimes : [route.dep];
}

function toMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function isExactRoute(route: BusRoute, from: string, to: string) {
  return route.from === from && route.to === to;
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
    .sort((a: number, b: number) => a - b);
  const next = times.find((minutes: number) => minutes >= currentMinutes);

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

export function BusRouteList({
  routes,
  selectedId,
  onSelect,
  origin,
  destination,
  tripDate,
  today,
  ar,
  onBookingComplete,
}: {
  routes: BusRoute[];
  selectedId: string;
  onSelect: (id: string) => void;
  origin: string;
  destination: string;
  tripDate: string;
  today: string;
  ar: boolean;
  onBookingComplete: () => void;
}) {
  const sorted = useMemo(() => {
    const exact = routes.filter(route => isExactRoute(route, origin, destination));
    const close = routes.filter(route => !isExactRoute(route, origin, destination) && route.seats > 0);
    return [...exact, ...close];
  }, [routes, origin, destination]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sorted.map((route, index) => {
        const isSelected = selectedId === route.id;
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
              onSelect(String(route.id));
              onBookingComplete();
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0 }}>
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
                      ? 'No seats left'
                      : `${route.seats} seats left`}
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
                  .map((time: string) => (
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
                {route.amenities.map((amenity: string) => (
                  <span key={amenity} style={pill(route.color ?? DS.cyan)}>
                    {amenity}
                  </span>
                ))}
                {route.via.map((stop: string) => (
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
  );
}
