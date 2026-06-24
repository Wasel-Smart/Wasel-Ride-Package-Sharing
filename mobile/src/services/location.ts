/**
 * Mobile Location Tracking Service
 * Real-time location updates via WebSocket and geolocation
 */

import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { mobileAuth } from './auth';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  status: 'available' | 'busy' | 'offline';
  timestamp: number;
}

export class LocationTrackingService {
  private socket: Socket | null = null;
  private watchId: number | null = null;
  private isTracking = false;
  private listeners: Map<string, Set<(location: DriverLocation) => void>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  async initialize(): Promise<void> {
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'wss://wasel14.online/ws';
    const token = mobileAuth.getAccessToken();

    if (!token) {
      return;
    }

    this.connect(wsUrl, token);
  }

  private connect(wsUrl: string, token: string): void {
    if (this.destroyed) return;

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
    });

    this.socket.on('disconnect', (reason: string) => {
      if (reason === 'io server disconnect' && !this.destroyed) {
        void this.socket?.connect();
      }
    });

    this.socket.on('reconnect_failed', () => {
    });

    this.socket.on('connect_error', () => {
    });

    this.socket.on('driver:location', (data: DriverLocation) => {
      const listeners = this.listeners.get(data.driverId);
      if (listeners) {
        listeners.forEach(listener => listener(data));
      }
    });

    this.socket.on('drivers:nearby', (drivers: DriverLocation[]) => {
      drivers.forEach(driver => {
        const listeners = this.listeners.get(driver.driverId);
        if (listeners) {
          listeners.forEach(listener => listener(driver));
        }
      });
    });
  }

  async startTracking(
    onLocationUpdate: (location: LocationUpdate) => void,
    options: {
      interval?: number; // milliseconds
      distanceFilter?: number; // meters
    } = {},
  ): Promise<void> {
    if (this.isTracking) return;

    const { interval = 5000, distanceFilter = 10 } = options;

    // Request location permissions
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    this.watchId = Geolocation.watchPosition(
      position => {
        const location: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };

        onLocationUpdate(location);

        // Publish to server if driver mode
        if (this.socket?.connected) {
          this.socket.emit('location:update', location);
        }
      },
      error => {
        console.error('[LocationTracking] Error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter,
        interval,
        fastestInterval: interval / 2,
      },
    );

    this.isTracking = true;
    console.log('[LocationTracking] Started tracking');
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('[LocationTracking] Stopped tracking');
  }

  async getCurrentLocation(): Promise<LocationUpdate> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          });
        },
        error => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  }

  subscribeToDriver(driverId: string, callback: (location: DriverLocation) => void): () => void {
    const existing = this.listeners.get(driverId);
    if (!existing) {
      this.listeners.set(driverId, new Set([callback]));
    } else {
      existing.add(callback);
    }

    if (this.socket?.connected) {
      this.socket.emit('subscribe:driver', { driverId });
    }

    return () => {
      const current = this.listeners.get(driverId);
      if (current) {
        current.delete(callback);
        if (current.size === 0) {
          this.listeners.delete(driverId);
        }
      }
      if (this.socket?.connected) {
        this.socket.emit('unsubscribe:driver', { driverId });
      }
    };
  }

  subscribeToArea(
    latitude: number,
    longitude: number,
    radiusKm: number,
    callback: (driver: DriverLocation) => void,
  ): () => void {
    const areaKey = `area-${latitude}-${longitude}-${radiusKm}`;

    const listeners = this.listeners.get(areaKey);
    if (!listeners) {
      this.listeners.set(areaKey, new Set());
    }
    this.listeners.get(areaKey)!.add(callback);

    if (this.socket?.connected) {
      this.socket.emit('subscribe:area', { latitude, longitude, radiusKm });
    }

    return () => {
      const current = this.listeners.get(areaKey);
      if (current) {
        current.delete(callback);
        if (current.size === 0) {
          this.listeners.delete(areaKey);
          if (this.socket?.connected) {
            this.socket.emit('unsubscribe:area', { latitude, longitude, radiusKm });
          }
        }
      }
    };
  }

  disconnect(): void {
    this.stopTracking();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  private async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Wasel Location Permission',
            message: 'Wasel needs access to your location to find nearby rides',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true;
    } catch (error) {
      console.error('[LocationTracking] Permission error:', error);
      return false;
    }
  }
  async getCurrentPosition(): Promise<LocationUpdate> {
    return this.getCurrentLocation();
  }
}

export const locationTracking = new LocationTrackingService();
export const locationService = locationTracking;

