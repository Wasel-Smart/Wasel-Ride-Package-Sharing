/**
 * Mobile Ride Lifecycle Service
 * Manages ride requests, matching, and completion flow
 */

import { mobileAuth } from './auth';
import { offlineService } from './offline';

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
  tripId?: string;
  driverId?: string;
  driverName?: string;
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
  rating?: number;
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

export interface RawRideRecord {
  id?: string;
  trip_id?: string;
  rider_id?: string;
  driver_id?: string;
  driver_name?: string;
  vehicle_id?: string;
  rating?: number;
  origin_address?: string;
  origin_city?: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_address?: string;
  destination_city?: string;
  dest_lat?: number;
  dest_lng?: number;
  from?: string;
  to?: string;
  status?: string;
  trip_status?: string;
  fare?: number;
  price_per_seat?: number;
  distance?: number;
  duration?: number;
  created_at?: string;
  departure_time?: string;
  matched_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
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

  private toTripCreatePayload(request: RideRequest): Record<string, unknown> {
    const scheduledAt = request.scheduledFor
      ? new Date(request.scheduledFor)
      : new Date(Date.now() + 60 * 60 * 1000);

    return {
      from: request.origin.address,
      to: request.destination.address,
      date: scheduledAt.toISOString().slice(0, 10),
      time: scheduledAt.toISOString().slice(11, 16),
      seats: request.seats,
      notes: request.notes,
    };
  }

  private getAuthHeaders(): Record<string, string> {
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

    const payload = this.toTripCreatePayload(request);
    const queuedPayload = {
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
    };

    // If offline, queue the action
    if (!offlineService.isDeviceOnline()) {
      await offlineService.queueOfflineAction({
        type: 'RIDE_REQUEST',
        payload: queuedPayload,
      });
      return { error: new Error('Ride request queued for sync when online') };
    }

    try {
      // Call backend API
      const response = await fetch(this.getApiUrl('/trips'), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json() as { ride?: unknown } & Record<string, unknown>;
      const ride = this.mapDatabaseRide((data.ride ?? data) as RawRideRecord);
      this.setActiveRide(ride);

      // Cache the ride
      await offlineService.cacheActiveRide(ride);

      return { ride };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async cancelRide(rideId: string, reason?: string): Promise<{ error?: Error }> {
    // If offline, queue the action
    if (!offlineService.isDeviceOnline()) {
      await offlineService.queueOfflineAction({
        type: 'RIDE_CANCEL',
        payload: { rideId, reason },
      });
      this.setActiveRide(null);
      return {};
    }

    try {
      const response = await fetch(
        this.getApiUrl('/cancellations/bookings'),
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ bookingId: rideId, reason: reason ?? 'Cancelled from mobile' }),
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

  async rateRide(
    rideId: string,
    rating: number,
    feedback?: string,
    tags?: string[],
    driverId?: string,
    tripId?: string,
  ): Promise<{ error?: Error }> {
    const payload = {
      bookingId: rideId,
      rating,
      review: feedback,
      tags,
      driverId,
      tripId,
    };

    // If offline, queue the action
    if (!offlineService.isDeviceOnline()) {
      await offlineService.queueOfflineAction({
        type: 'RIDE_RATING',
        payload,
      });
      return {};
    }

    try {
      await this.request<void>('/ratings', {
        method: 'POST',
        body: JSON.stringify(payload),
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

    // If offline, try to get cached ride
    if (!offlineService.isDeviceOnline()) {
      const cached = await offlineService.getCachedActiveRide<Ride>();
      if (cached) {
        this.setActiveRide(cached);
        return cached;
      }
      return null;
    }

    try {
      const data = await this.request<{ ride: unknown | null }>('/v1/rides/active');
      if (!data.ride) return null;

      const ride = this.mapDatabaseRide(data.ride as RawRideRecord);
      this.setActiveRide(ride);
      
      // Cache the ride
      await offlineService.cacheActiveRide(ride);
      
      return ride;
    } catch (error) {
      console.error('[RideLifecycle] Error fetching active ride:', error);
      
      // Fallback to cache on error
      const cached = await offlineService.getCachedActiveRide<Ride>();
      if (cached) {
        this.setActiveRide(cached);
        return cached;
      }
      
      return null;
    }
  }

  async getDriverInfo(driverId: string): Promise<Driver | null> {
    // If offline, try to get cached driver info
    if (!offlineService.isDeviceOnline()) {
      return await offlineService.getCachedDriverInfo<Driver>(driverId);
    }

    try {
      const data = await this.request<{ driver: Driver | null }>(
        `/v1/drivers/${encodeURIComponent(driverId)}`,
      );
      
      if (data.driver) {
        // Cache driver info
        await offlineService.cacheDriverInfo(driverId, data.driver);
      }
      
      return data.driver;
    } catch (error) {
      console.error('[RideLifecycle] Error fetching driver info:', error);
      
      // Fallback to cache on error
      return await offlineService.getCachedDriverInfo<Driver>(driverId);
    }
  }

  async getRideHistory(limit = 20): Promise<Ride[]> {
    const user = mobileAuth.getUser();
    if (!user) return [];

    // If offline, return cached history
    if (!offlineService.isDeviceOnline()) {
      const cached = await offlineService.getCachedRideHistory<Ride>();
      return cached || [];
    }

    try {
      const data = await this.request<{ rides: unknown[] }>(
        `/v1/rides/history?limit=${encodeURIComponent(String(limit))}`,
      );
      const rides = data.rides.map(ride => this.mapDatabaseRide(ride as RawRideRecord));
      
      // Cache ride history
      await offlineService.cacheRideHistory(rides);
      
      return rides;
    } catch (error) {
      console.error('[RideLifecycle] Error fetching ride history:', error);
      
      // Fallback to cache on error
      const cached = await offlineService.getCachedRideHistory<Ride>();
      return cached || [];
    }
  }

  async canRateRide(rideId: string): Promise<boolean> {
    if (!rideId) return false;
    try {
      const data = await this.request<{ canRate?: boolean; error?: string }>(
        `/ratings/bookings/${encodeURIComponent(rideId)}/eligibility`,
      );
      if (data.error) return false;
      return Boolean(data.canRate);
    } catch {
      // On error, do not block the user from attempting to rate.
      return true;
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

  private mapDatabaseRide(data: RawRideRecord): Ride {
    const originAddress = data.origin_address ?? data.origin_city ?? data.from ?? '';
    const destinationAddress = data.dest_address ?? data.destination_city ?? data.to ?? '';
    const status = (data.status ?? data.trip_status ?? 'requested') as RideStatus;
    return {
      id: data.id ?? data.trip_id ?? '',
      riderId: data.rider_id ?? mobileAuth.getUser()?.id ?? '',
      tripId: data.trip_id,
      driverId: data.driver_id,
      driverName: data.driver_name,
      vehicleId: data.vehicle_id,
      rating: data.rating,
      origin: {
        latitude: data.origin_lat ?? 0,
        longitude: data.origin_lng ?? 0,
        address: originAddress,
      },
      destination: {
        latitude: data.dest_lat ?? 0,
        longitude: data.dest_lng ?? 0,
        address: destinationAddress,
      },
      status,
      fare: data.fare ?? data.price_per_seat,
      distance: data.distance,
      duration: data.duration,
      requestedAt: data.created_at ?? data.departure_time ?? new Date().toISOString(),
      matchedAt: data.matched_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      cancelledAt: data.cancelled_at,
    };
  }
}

export const rideLifecycle = new RideLifecycleService();
