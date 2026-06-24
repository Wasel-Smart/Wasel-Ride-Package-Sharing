import api from '../utils/api';

export interface Trip {
  id: string;
  mode: string;
  status: string;
  origin_name: string;
  destination_name: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number | null;
  allows_packages: boolean;
  driver_name?: string;
  driver_rating?: number;
}

export interface TripSearchFilters {
  originCity?: string;
  destinationCity?: string;
  departureDate?: string;
  seats?: number;
  page?: number;
  limit?: number;
}

export async function searchTrips(filters: TripSearchFilters = {}) {
  const params = new URLSearchParams();
  if (filters.originCity) params.set('originCity', filters.originCity);
  if (filters.destinationCity) params.set('destinationCity', filters.destinationCity);
  if (filters.departureDate) params.set('departureDate', filters.departureDate);
  if (filters.seats) params.set('seats', String(filters.seats));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const response = await api.get(`/trips/search${query ? `?${query}` : ''}`);
  return response as { data: Trip[]; meta: { total: number; page: number; limit: number } };
}

export async function getTripDetails(tripId: string) {
  const response = await api.get(`/trips/${tripId}`);
  return response as { data: Trip & { bookings: unknown[] } };
}

export async function createTrip(input: {
  mode: 'carpooling' | 'on_demand' | 'scheduled' | 'package' | 'return';
  originCity: string;
  originCoords: { lat: number; lng: number };
  destinationCity: string;
  destinationCoords: { lat: number; lng: number };
  departureTime: string;
  availableSeats: number;
  pricePerSeat?: number;
  allowPackages?: boolean;
  packageCapacityKg?: number;
  notes?: string;
}) {
  const response = await api.post('/trips', input);
  return response as { data: Trip };
}

export async function bookTrip(tripId: string, seats: number, pricePaid: number) {
  const response = await api.post(`/trips/${tripId}/book`, { seats, pricePaid });
  return response as { data: unknown };
}

export async function updateTripStatus(tripId: string, status: string) {
  const response = await api.patch(`/trips/${tripId}/status`, { status });
  return response as { data: Trip };
}
