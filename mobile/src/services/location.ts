/**
 * Mobile Location Tracking Service
 * Real-time location updates via WebSocket and geolocation
 */

import Geolocation from 'react-native-geolocation-service';
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
  private listeners = new Map<string, (location: DriverLocation) => void>();

  async initialize(): Promise<void> {
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'wss://wasel.jo/ws';
    const token = mobileAuth.getAccessToken();

    if (!token) {
      console.error('[LocationTracking] No auth token available');
      return;
    }

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[LocationTracking] WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[LocationTracking] WebSocket disconnected');
    });

    this.socket.on('driver:location', (data: DriverLocation) => {
      const listener = this.listeners.get(data.driverId);
      if (listener) {
        listener(data);
      }
    });

    this.socket.on('drivers:nearby', (drivers: DriverLocation[]) => {
      drivers.forEach(driver => {
        const listener = this.listeners.get(driver.driverId);
        if (listener) {
          listener(driver);
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
    this.listeners.set(driverId, callback);

    if (this.socket?.connected) {
      this.socket.emit('subscribe:driver', { driverId });
    }

    return () => {
      this.listeners.delete(driverId);
      if (this.socket?.connected) {
        this.socket.emit('unsubscribe:driver', { driverId });
      }
    };
  }

  subscribeToArea(
    latitude: number,
    longitude: number,
    radiusKm: number,
    callback: (drivers: DriverLocation[]) => void,
  ): () => void {
    const areaKey = `area-${latitude}-${longitude}-${radiusKm}`;
    
    const handler = (drivers: DriverLocation[]) => {
      callback(drivers);
    };

    this.listeners.set(areaKey, handler as any);

    if (this.socket?.connected) {
      this.socket.emit('subscribe:area', { latitude, longitude, radiusKm });
    }

    return () => {
      this.listeners.delete(areaKey);
      if (this.socket?.connected) {
        this.socket.emit('unsubscribe:area', { latitude, longitude, radiusKm });
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
      const { PermissionsAndroid, Platform } = require('react-native');
      
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

      // iOS: Permissions handled via Info.plist
      return true;
    } catch (error) {
      console.error('[LocationTracking] Permission error:', error);
      return false;
    }
  }
}

export const locationTracking = new LocationTrackingService();
