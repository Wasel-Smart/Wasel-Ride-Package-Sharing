/**
 * Ride Tracking Service - Real-time GPS tracking integration
 * Connects to backend via WebSocket for live updates
 */
import { apiClient } from '../lib/api';
import { mobileAuth } from '../services/auth';
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
  driverLocation?: DriverLocation;
  estimatedArrival?: string; // ISO timestamp
  status: 'matching' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed';
}

interface TrackingState {
  location: DriverLocation | null;
  eta: string | null;
  status: RideTracking['status'] | null;
  loading: boolean;
  error: string | null;
}

class RideTrackingService {
  private socket: WebSocket | null = null;
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

    this.fetchInitialTracking(rideId);
    this.connectWebSocket(rideId);

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

  private async fetchInitialTracking(rideId: string): Promise<void> {
    try {
      const response = await apiClient.get<RideTracking>(`rides/${rideId}/tracking`);
      if (response.data) {
        this.updateTrackingState(rideId, {
          location: response.data.driverLocation ?? null,
          eta: response.data.estimatedArrival ?? null,
          status: response.data.status ?? null,
          loading: false,
          error: null,
        });
      } else {
        this.updateTrackingState(rideId, {
          loading: false,
          error: response.error ?? 'Failed to load tracking',
        });
      }
    } catch (error) {
      this.updateTrackingState(rideId, {
        loading: false,
        error: error instanceof Error ? error.message : 'Tracking error',
      });
    }
  }

  private connectWebSocket(rideId: string): void {
    const token = mobileAuth.getAccessToken();
    if (!token) return;

    const wsUrl = waselMobileConfig.wsUrl?.replace(/^http/, 'ws');
    if (!wsUrl) return;

    try {
      this.socket = new WebSocket(`${wsUrl}/rides/${rideId}/tracking?token=${token}`);

      this.socket.onopen = () => {
        console.log(`[RideTracking] Connected for ride ${rideId}`);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: 'location_update' | 'status_change' | 'eta_update';
            payload: Record<string, unknown>;
          };

          const currentState = this.trackingStates.get(rideId);
          if (!currentState) return;

          const newState = { ...currentState };

          switch (data.type) {
            case 'location_update':
              newState.location = {
                latitude: data.payload.lat as number,
                longitude: data.payload.lng as number,
                heading: data.payload.heading as number | undefined,
                speed: data.payload.speed as number | undefined,
                timestamp: new Date().toISOString(),
              };
              break;
            case 'status_change':
              newState.status = data.payload.status as RideTracking['status'];
              break;
            case 'eta_update':
              newState.eta = data.payload.eta as string;
              break;
          }

          this.updateTrackingState(rideId, newState);
        } catch (error) {
          console.error('[RideTracking] Failed to parse message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('[RideTracking] WebSocket error:', error);
        this.updateTrackingState(rideId, {
          loading: false,
          error: 'Connection error',
        });
      };

      this.socket.onclose = () => {
        console.log(`[RideTracking] Disconnected for ride ${rideId}`);
        this.socket = null;
      };
    } catch (error) {
      console.error('[RideTracking] Failed to create WebSocket:', error);
    }
  }

  private updateTrackingState(rideId: string, state: TrackingState): void {
    this.trackingStates.set(rideId, state);
    this.listeners.get(rideId)?.forEach(listener => listener(state));
  }

  disconnect(rideId: string): void {
    this.trackingStates.delete(rideId);
    this.listeners.delete(rideId);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const rideTracking = new RideTrackingService();