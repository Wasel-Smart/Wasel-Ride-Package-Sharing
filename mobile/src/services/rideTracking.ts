/**
 * Ride Tracking Service - Real-time GPS tracking integration
 * Connects to backend via WebSocket for live updates
 */
import { apiClient } from '../lib/api';
import { waselMobileConfig } from '../lib/config';
import { Platform } from 'react-native';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface RideTracking {
  rideId: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleModel: string;
  licensePlate: string;
  status: 'matching' | 'driver_en_route' | 'driver_arrived' | 'in_progress';
  eta: string;
  distance: string;
  fare: string;
  driverLocation?: DriverLocation;
}

interface TrackingState {
  location: DriverLocation | null;
  eta: string | null;
  status: RideTracking['status'] | null;
  loading: boolean;
  error: string | null;
}

class RideTrackingService {
  private trackingStates = new Map<string, TrackingState>();
  private listeners = new Map<string, Set<(state: TrackingState) => void>>();

  connectToRide(rideId: string): { state: TrackingState; subscribe: (cb: (state: TrackingState) => void) => () => void } {
    const initialState: TrackingState = {
      location: null,
      eta: null,
      status: null,
      loading: true,
      error: null,
    };
    this.trackingStates.set(rideId, initialState);

    this.fetchLiveRide(rideId);

    return {
      state: initialState,
      subscribe: (callback: (state: TrackingState) => void) => {
        const rideListeners = new Set([callback]);
        this.listeners.set(rideId, rideListeners);
        callback(initialState);

        return () => {
          this.listeners.get(rideId)?.delete(callback);
        };
      },
    };
  }

  private async fetchLiveRide(rideId: string): Promise<void> {
    try {
      const response = await apiClient.get<RideTracking>(`rides/${rideId}/live`);
      if (response.data) {
        this.updateTrackingState(rideId, {
          location: response.data.driverLocation ?? null,
          eta: response.data.eta ?? null,
          status: response.data.status ?? null,
          loading: false,
          error: null,
        });
      } else {
        this.updateTrackingState(rideId, {
          location: null,
          eta: null,
          status: null,
          loading: false,
          error: response.error ?? 'Failed to load ride data',
        });
      }
    } catch (error) {
      this.updateTrackingState(rideId, {
        location: null,
        eta: null,
        status: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Tracking error',
      });
    }
  }

  private updateTrackingState(rideId: string, state: TrackingState): void {
    this.trackingStates.set(rideId, state);
    this.listeners.get(rideId)?.forEach(listener => listener(state));
  }

  disconnect(rideId: string): void {
    this.trackingStates.delete(rideId);
    this.listeners.delete(rideId);
  }
}

export const rideTracking = new RideTrackingService();