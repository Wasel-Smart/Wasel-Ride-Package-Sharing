/**
 * Mobile Ride Lifecycle Service
 * Manages ride requests, matching, and completion flow
 */

import { mobileAuth } from './auth';

export type RideStatus =
  | 'requested'
  | 'matched'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RideRequest {
  origin: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  seats: number;
  scheduledFor?: string;
  preferredVehicleType?: string;
  notes?: string;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  vehicleId?: string;
  origin: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: RideStatus;
  fare?: number;
  distance?: number;
  duration?: number;
  requestedAt: string;
  matchedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalRides: number;
  vehicleModel: string;
  vehiclePlate: string;
  photo?: string;
}

export class RideLifecycleService {
  private activeRide: Ride | null = null;
  private listeners = new Set<(ride: Ride | null) => void>();

  constructor() {}

  private getApiUrl(path: string): string {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('Mobile API URL is not configured');
    }
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = mobileAuth.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(this.getApiUrl(path), {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Mobile ride API request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async requestRide(request: RideRequest): Promise<{ ride?: Ride; error?: Error }> {
    const user = mobileAuth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // Call backend API
      const response = await fetch(this.getApiUrl('/v1/rides'), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          rider_id: user.id,
          origin_lat: request.origin.latitude,
          origin_lng: request.origin.longitude,
          origin_address: request.origin.address,
          dest_lat: request.destination.latitude,
          dest_lng: request.destination.longitude,
          dest_address: request.destination.address,
          seats: request.seats,
          scheduled_for: request.scheduledFor,
          preferred_vehicle_type: request.preferredVehicleType,
          notes: request.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const ride = this.mapDatabaseRide(data.ride);
      this.setActiveRide(ride);

      return { ride };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async cancelRide(rideId: string, reason?: string): Promise<{ error?: Error }> {
    try {
      const response = await fetch(
        this.getApiUrl(`/v1/rides/${encodeURIComponent(rideId)}/cancel`),
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ reason }),
        },
      );

      if (!response.ok) {
        throw new Error(`Cancel failed: ${response.statusText}`);
      }

      this.setActiveRide(null);
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  async rateRide(rideId: string, rating: number, feedback?: string): Promise<{ error?: Error }> {
    try {
      await this.request<void>(`/v1/rides/${encodeURIComponent(rideId)}/rating`, {
        method: 'POST',
        body: JSON.stringify({ rating, feedback }),
      });
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  async getActiveRide(): Promise<Ride | null> {
    if (this.activeRide) return this.activeRide;

    const user = mobileAuth.getUser();
    if (!user) return null;

    try {
      const data = await this.request<{ ride: unknown | null }>('/v1/rides/active');
      if (!data.ride) return null;

      const ride = this.mapDatabaseRide(data.ride);
      this.setActiveRide(ride);
      return ride;
    } catch (error) {
      console.error('[RideLifecycle] Error fetching active ride:', error);
      return null;
    }
  }

  async getDriverInfo(driverId: string): Promise<Driver | null> {
    try {
      const data = await this.request<{ driver: Driver | null }>(
        `/v1/drivers/${encodeURIComponent(driverId)}`,
      );
      return data.driver;
    } catch (error) {
      console.error('[RideLifecycle] Error fetching driver info:', error);
      return null;
    }
  }

  async getRideHistory(limit = 20): Promise<Ride[]> {
    const user = mobileAuth.getUser();
    if (!user) return [];

    try {
      const data = await this.request<{ rides: unknown[] }>(
        `/v1/rides/history?limit=${encodeURIComponent(String(limit))}`,
      );
      return data.rides.map(ride => this.mapDatabaseRide(ride));
    } catch (error) {
      console.error('[RideLifecycle] Error fetching ride history:', error);
      return [];
    }
  }

  subscribe(listener: (ride: Ride | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.activeRide); // Immediate call with current state

    return () => {
      this.listeners.delete(listener);
    };
  }

  private setActiveRide(ride: Ride | null): void {
    this.activeRide = ride;
    this.listeners.forEach(listener => listener(ride));
  }

  private mapDatabaseRide(data: any): Ride {
    return {
      id: data.id,
      riderId: data.rider_id,
      driverId: data.driver_id,
      vehicleId: data.vehicle_id,
      origin: {
        latitude: data.origin_lat,
        longitude: data.origin_lng,
        address: data.origin_address,
      },
      destination: {
        latitude: data.dest_lat,
        longitude: data.dest_lng,
        address: data.dest_address,
      },
      status: data.status,
      fare: data.fare,
      distance: data.distance,
      duration: data.duration,
      requestedAt: data.created_at,
      matchedAt: data.matched_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      cancelledAt: data.cancelled_at,
    };
  }
}

export const rideLifecycle = new RideLifecycleService();
