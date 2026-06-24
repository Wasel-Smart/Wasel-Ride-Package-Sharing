import api from '../utils/api';

export interface BusRoute {
  id: string;
  name: string;
  origin_city: string;
  destination_city: string;
  intermediate_stops?: string[];
  amenities?: string[];
}

export interface BusSchedule {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  available_seats: number;
  price_jod: number;
}

export interface BusBooking {
  id: string;
  schedule_id: string;
  seats: number;
  total_amount: number;
  status: string;
}

export async function searchBusRoutes(originCity?: string, destinationCity?: string) {
  const params = new URLSearchParams();
  if (originCity) params.set('originCity', originCity);
  if (destinationCity) params.set('destinationCity', destinationCity);
  const query = params.toString();
  const response = await api.get(`/bus/routes${query ? `?${query}` : ''}`);
  return response as { data: BusRoute[] };
}

export async function getRouteSchedules(routeId: string, date?: string) {
  const query = date ? `?date=${date}` : '';
  const response = await api.get(`/bus/routes/${routeId}/schedules${query}`);
  return response as { data: BusSchedule[] };
}

export async function bookBusSeat(scheduleId: string, seats: number) {
  const response = await api.post('/bus/bookings', { scheduleId, seats });
  return response as { data: BusBooking };
}

export async function cancelBusBooking(bookingId: string) {
  const response = await api.patch(`/bus/bookings/${bookingId}/cancel`, {});
  return response as { data: BusBooking };
}
