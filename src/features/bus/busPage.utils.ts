import type { BusRoute } from '../../modules/bus/bus.types';
import { routeMatchesLocationPair } from '../../utils/jordanLocations';

export const JOURNEY_PRESETS = [
  { from: 'Amman', to: 'Aqaba', label: 'Amman to Aqaba' },
  { from: 'Amman', to: 'Irbid', label: 'Amman to Irbid' },
  { from: 'Amman', to: 'Petra', label: 'Amman to Petra' },
  { from: 'Amman', to: 'Wadi Rum', label: 'Amman to Wadi Rum' },
  { from: 'Irbid', to: 'Amman', label: 'Irbid to Amman' },
] as const;

export type BusRouteStatus = {
  label: string;
  detail: string;
  color: string;
};

export function getTodayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function isExactRoute(route: BusRoute, from: string, to: string) {
  return routeMatchesLocationPair(route.from, route.to, from, to, { allowReverse: false });
}

export function getScheduleTimes(route: BusRoute) {
  return route.departureTimes?.length ? route.departureTimes : [route.dep];
}

export function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function getRouteStatus(
  route: BusRoute,
  tripDate: string,
  today: string,
  colors: { cyan: string; gold: string; green: string },
): BusRouteStatus {
  if (tripDate !== today) {
    return {
      label: 'Scheduled',
      detail: route.scheduleDays ?? 'Published schedule',
      color: colors.cyan,
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const times = getScheduleTimes(route)
    .map(toMinutes)
    .sort((a, b) => a - b);
  const next = times.find(minutes => minutes >= currentMinutes);

  if (next === undefined) {
    return { label: 'Closed today', detail: 'No more departures left today', color: colors.gold };
  }

  const minutesAway = next - currentMinutes;
  if (minutesAway <= 15) {
    return { label: 'Boarding soon', detail: `${minutesAway} min to departure`, color: colors.green };
  }
  if (minutesAway <= 60) {
    return {
      label: 'Departing this hour',
      detail: `${minutesAway} min to departure`,
      color: colors.cyan,
    };
  }

  return {
    label: 'Later today',
    detail: `${minutesAway} min to the next departure`,
    color: colors.cyan,
  };
}
