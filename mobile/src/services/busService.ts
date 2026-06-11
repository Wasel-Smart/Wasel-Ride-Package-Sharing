/**
 * Mobile Bus Service
 * Handles bus route fetching and booking
 */

import { mobileAuth } from './auth';

export interface BusRoute {
  routeId: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  operator: string;
}

export interface BusSearchParams {
  origin: string;
  destination: string;
  date?: string;
}

class BusService {
  private getApiUrl(path: string): string {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://wasel14.online';
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = mobileAuth.getAccessToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async searchRoutes(params: BusSearchParams): Promise<BusRoute[]> {
    const queryParams = new URLSearchParams({
      ...(params.origin && { origin: params.origin }),
      ...(params.destination && { destination: params.destination }),
      ...(params.date && { date: params.date }),
    });

    const response = await fetch(
      this.getApiUrl(`/v1/bus/routes?${queryParams.toString()}`),
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Bus API responded with ${response.status}`);
    }

    const data = await response.json();
    return (data.routes ?? data) as BusRoute[];
  }

  async bookRoute(routeId: string): Promise<{ bookingId: string }> {
    const response = await fetch(this.getApiUrl('/v1/bus/bookings'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ routeId }),
    });

    if (!response.ok) {
      throw new Error(`Booking failed with ${response.status}`);
    }

    return response.json();
  }
}

export const busService = new BusService();
