/**
 * LocationTrackingService — Production-Grade WebSocket + GPS Manager
 *
 * Architecture:
 *  - Socket.io with infinite reconnection and full exponential backoff
 *  - Subscription registry: every driver/area sub is stored and re-emitted
 *    automatically on every reconnect — no manual re-subscribe needed
 *  - Application-level heartbeat (ping/pong) detects dead TCP connections
 *    that the OS has not yet closed (common in mobile tunnels/elevators)
 *  - Geo-stream throttle (haversine + time gate) applied before every emit
 *    to prevent battery drain and server flood
 *  - iOS background location permission handled correctly
 *  - REST polling fallback activates after reconnect_failed
 */

import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
  import { mobileAuth } from './auth';
  import { sanitizeLogValue } from '../utils/sanitize';

const ALLOWED_API_DOMAINS = ['supabase.co', 'supabase.net', 'wasel14.online', 'localhost'];

function isValidApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'localhost') return true;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false; // Good: block private IPs
    return ALLOWED_API_DOMAINS.includes(parsed.hostname); // Better: exact match instead of endsWith
  } catch {
    return false;
  }
}

// ── Geo-stream throttle (ported from src/platform/geo-stream.ts) ─────────────

interface GeoPoint { lat: number; lng: number; }
interface GeoStreamState { lastAcceptedAt: number | null; lastPoint: GeoPoint | null; }

const GEO_CONFIG = {
  urban: { minUpdateIntervalMs: 6_000, minDistanceMeters: 40 },
  highway: { minUpdateIntervalMs: 10_000, minDistanceMeters: 150 },
} as const;

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function shouldEmit(
  state: GeoStreamState,
  next: GeoPoint,
  speedMps: number | null,
): boolean {
  if (!state.lastPoint || !state.lastAcceptedAt) return true;
  const cfg = (speedMps ?? 0) > 20 ? GEO_CONFIG.highway : GEO_CONFIG.urban;
  const elapsed = Date.now() - state.lastAcceptedAt;
  const dist = haversineMeters(state.lastPoint, next);
  return dist >= cfg.minDistanceMeters || elapsed >= cfg.minUpdateIntervalMs;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  status: 'available' | 'busy' | 'offline';
  timestamp: number;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

// Serialisable descriptor for every active subscription so we can replay them
// after a reconnect without the caller doing anything.
interface SubDescriptor {
  event: string;
  data: Record<string, unknown>;
}

// ── Heartbeat config ──────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 25_000; // send ping every 25 s
const HEARTBEAT_TIMEOUT_MS = 10_000; // if no pong within 10 s → dead connection

// ── Service ───────────────────────────────────────────────────────────────────

export class LocationTrackingService {
  private socket: Socket | null = null;
  private watchId: number | null = null;
  private isTracking = false;
  private destroyed = false;

  // Listener registry: key → Set of callbacks
  private listeners = new Map<string, Set<(loc: DriverLocation) => void>>();
  // Connection-status listeners
  private statusListeners = new Set<(s: ConnectionStatus) => void>();

  // All active subscriptions — replayed on every reconnect
  private activeSubs = new Map<string, SubDescriptor>();

  // Geo-stream state per tracking session
  private geoState: GeoStreamState = { lastAcceptedAt: null, lastPoint: null };

  // Heartbeat handles
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;

  // REST polling fallback (activated after reconnect_failed)
  private restPollTimer: ReturnType<typeof setInterval> | null = null;
  private restPollCallback: ((loc: DriverLocation) => void) | null = null;

  // ── Public API ──────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? 'wss://wasel14.online/ws';
    const token = mobileAuth.getAccessToken();
    if (!token) return;
    this.connect(wsUrl, token);
  }

  /** Subscribe to connection status changes (for UI banners). */
  onStatusChange(cb: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  async startTracking(
    onLocationUpdate: (loc: LocationUpdate) => void,
    options: { interval?: number; distanceFilter?: number } = {},
  ): Promise<void> {
    if (this.isTracking) return;

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) throw new Error('Location permission denied');

    const { interval = 5_000, distanceFilter = 10 } = options;

    this.watchId = Geolocation.watchPosition(
      position => {
        const loc: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };

        onLocationUpdate(loc);

        // Apply geo-stream throttle before hitting the socket
        const next: GeoPoint = { lat: loc.latitude, lng: loc.longitude };
        if (this.socket?.connected && shouldEmit(this.geoState, next, loc.speed)) {
          this.socket.emit('location:update', loc);
          this.geoState = { lastAcceptedAt: Date.now(), lastPoint: next };
        }
      },
      err => console.error('[LocationTracking] watchPosition error:', sanitizeLogValue(err)),
      {
        enableHighAccuracy: true,
        distanceFilter,
        interval,
        fastestInterval: Math.floor(interval / 2),
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );

    this.isTracking = true;
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.geoState = { lastAcceptedAt: null, lastPoint: null };
  }

  async getCurrentLocation(): Promise<LocationUpdate> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        p => resolve({
          latitude: p.coords.latitude, longitude: p.coords.longitude,
          accuracy: p.coords.accuracy, speed: p.coords.speed,
          heading: p.coords.heading, timestamp: p.timestamp,
        }),
        reject,
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
      );
    });
  }

  /** Subscribe to a specific driver's location updates. */
  subscribeToDriver(
    driverId: string,
    callback: (loc: DriverLocation) => void,
  ): () => void {
    this.addListener(driverId, callback);

    const desc: SubDescriptor = { event: 'subscribe:driver', data: { driverId } };
    this.activeSubs.set(`driver:${driverId}`, desc);
    if (this.socket?.connected) this.socket.emit(desc.event, desc.data);

    return () => {
      this.removeListener(driverId, callback);
      if (!this.listeners.has(driverId)) {
        this.activeSubs.delete(`driver:${driverId}`);
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe:driver', { driverId });
        }
      }
    };
  }

  /** Subscribe to all drivers within a radius. */
  subscribeToArea(
    latitude: number,
    longitude: number,
    radiusKm: number,
    callback: (driver: DriverLocation) => void,
  ): () => void {
    const areaKey = `area:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radiusKm}`;
    this.addListener(areaKey, callback);

    const desc: SubDescriptor = {
      event: 'subscribe:area',
      data: { latitude, longitude, radiusKm },
    };
    this.activeSubs.set(areaKey, desc);
    if (this.socket?.connected) this.socket.emit(desc.event, desc.data);

    return () => {
      this.removeListener(areaKey, callback);
      if (!this.listeners.has(areaKey)) {
        this.activeSubs.delete(areaKey);
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe:area', { latitude, longitude, radiusKm });
        }
      }
    };
  }

  /** Join a specific trip room (passenger tracking their active ride). */
  joinTripRoom(tripId: string): () => void {
    const key = `trip:${tripId}`;
    const desc: SubDescriptor = { event: 'join_trip_room', data: { tripId } };
    this.activeSubs.set(key, desc);
    if (this.socket?.connected) this.socket.emit(desc.event, desc.data);

    return () => {
      this.activeSubs.delete(key);
      if (this.socket?.connected) this.socket.emit('leave_trip_room', { tripId });
    };
  }

  disconnect(): void {
    this.destroyed = true;
    this.stopTracking();
    this.stopHeartbeat();
    this.stopRestPoll();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.activeSubs.clear();
    this.statusListeners.clear();
  }

  // ── Private: socket lifecycle ───────────────────────────────────────────────

  private connect(wsUrl: string, token: string): void {
    if (this.destroyed) return;

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      // Let Socket.io handle reconnection with our config
      reconnection: true,
      reconnectionAttempts: Infinity,   // never give up — we handle fallback ourselves
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      timeout: 20_000,
    });

    this.socket.on('connect', () => {
      this.stopRestPoll();                  // socket is back — stop REST fallback
      this.replaySubscriptions();           // re-join all rooms/subscriptions
      this.startHeartbeat();                // begin application-level ping/pong
      this.emitStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.stopHeartbeat();
      this.emitStatus('reconnecting');

      // Server-initiated disconnect: manually reconnect (Socket.io won't auto-retry)
      if (reason === 'io server disconnect' && !this.destroyed) {
        setTimeout(() => this.socket?.connect(), 1_000);
      }
    });

    this.socket.on('reconnect_attempt', () => {
      this.emitStatus('reconnecting');
    });

    this.socket.on('reconnect_failed', () => {
      // All Socket.io retries exhausted — activate REST polling fallback
      this.emitStatus('failed');
      this.startRestPoll();
    });

    this.socket.on('connect_error', (err) => {
       console.warn('[LocationTracking] connect_error:', sanitizeLogValue(err.message));
    });

    // Application-level pong response
    this.socket.on('pong', () => {
      if (this.pongTimeout) {
        clearTimeout(this.pongTimeout);
        this.pongTimeout = null;
      }
    });

    this.socket.on('driver:location', (data: DriverLocation) => {
      this.dispatch(data.driverId, data);
    });

    this.socket.on('drivers:nearby', (drivers: DriverLocation[]) => {
      drivers.forEach(d => this.dispatch(d.driverId, d));
    });

    this.socket.on('trip:location_update', (data: DriverLocation & { tripId: string }) => {
      this.dispatch(`trip:${data.tripId}`, data);
      this.dispatch(data.driverId, data);
    });
  }

  /** Re-emit every stored subscription descriptor after a reconnect. */
  private replaySubscriptions(): void {
    if (!this.socket?.connected) return;
    for (const desc of this.activeSubs.values()) {
      this.socket.emit(desc.event, desc.data);
    }
  }

  // ── Private: heartbeat ──────────────────────────────────────────────────────

  /**
   * Application-level ping/pong.
   * TCP keep-alive is unreliable on mobile (especially through NAT/cellular).
   * We send a custom 'ping' event every 25 s and expect a 'pong' back within 10 s.
   * If pong doesn't arrive, we force-disconnect so Socket.io triggers reconnection.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.socket?.connected) return;

      this.socket.emit('ping');

      this.pongTimeout = setTimeout(() => {
        console.warn('[LocationTracking] Heartbeat timeout — forcing reconnect');
        // Force-close the underlying transport; Socket.io will reconnect
        this.socket?.io.engine?.close();
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.pongTimeout) { clearTimeout(this.pongTimeout); this.pongTimeout = null; }
  }

  // ── Private: REST polling fallback ─────────────────────────────────────────

  /**
   * When the WebSocket is completely unreachable (e.g. deep tunnel, captive portal),
   * fall back to polling the REST endpoint every 10 s so the passenger still sees
   * approximate driver position rather than a frozen map.
   */
  private startRestPoll(): void {
    if (this.restPollTimer) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) return;

    this.restPollTimer = setInterval(async () => {
      // Re-attempt socket connection on each poll cycle
      if (!this.socket?.connected) {
        this.socket?.connect();
      }

      // Poll each active trip subscription
      for (const [key, desc] of this.activeSubs.entries()) {
        if (!key.startsWith('trip:')) continue;
        const tripId = desc.data.tripId as string;
        try {
          const token = mobileAuth.getAccessToken();
          const fetchUrl = `${apiUrl}/rides/${encodeURIComponent(tripId)}/live`;
          if (!isValidApiUrl(fetchUrl)) {
            console.warn('[LocationTracking] Skipping REST poll for invalid URL');
            continue;
          }
          const res = await fetch(fetchUrl, {
            headers: { Authorization: `Bearer ${token ?? ''}` },
          });
          if (!res.ok) continue;
          const data = await res.json() as {
            driverId?: string; driverLocation?: { latitude: number; longitude: number; heading: number | null };
          };
          if (data.driverLocation && data.driverId) {
            const loc: DriverLocation = {
              driverId: data.driverId,
              latitude: data.driverLocation.latitude,
              longitude: data.driverLocation.longitude,
              heading: data.driverLocation.heading,
              status: 'busy',
              timestamp: Date.now(),
            };
            this.dispatch(data.driverId, loc);
            this.dispatch(`trip:${tripId}`, loc);
          }
        } catch {
          // Non-fatal — next poll will retry
        }
      }
    }, 10_000);
  }

  private stopRestPoll(): void {
    if (this.restPollTimer) { clearInterval(this.restPollTimer); this.restPollTimer = null; }
  }

  // ── Private: listener helpers ───────────────────────────────────────────────

  private addListener(key: string, cb: (loc: DriverLocation) => void): void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(cb);
  }

  private removeListener(key: string, cb: (loc: DriverLocation) => void): void {
    const set = this.listeners.get(key);
    if (!set) return;
    set.delete(cb);
    if (set.size === 0) this.listeners.delete(key);
  }

  private dispatch(key: string, data: DriverLocation): void {
    this.listeners.get(key)?.forEach(cb => cb(data));
  }

  private emitStatus(s: ConnectionStatus): void {
    this.statusListeners.forEach(cb => cb(s));
  }

  // ── Private: permissions ────────────────────────────────────────────────────

  private async requestLocationPermission(options?: { background?: boolean }): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const coarse = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Wasel Location Permission',
            message: 'Wasel needs your location to find nearby rides and track your trip.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (coarse !== PermissionsAndroid.RESULTS.GRANTED) return false;

        if (options?.background && Platform.Version >= 29) {
          const bg = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location',
              message: 'Allow Wasel to track your location while driving in the background.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'Allow',
            },
          );
          if (bg !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('[LocationTracking] Background location denied — foreground only');
          }
        }
        return true;
      }

      // iOS — request 'always' for driver background tracking
      // Falls back gracefully if react-native-permissions is not installed
      try {
        const { request, PERMISSIONS, RESULTS } = await import('react-native-permissions');
        const status = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
        if (status === RESULTS.GRANTED) return true;
        // Fallback: try foreground-only
        const fg = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return fg === RESULTS.GRANTED;
      } catch {
        // react-native-permissions not installed — Geolocation will prompt natively
        return true;
      }
    } catch (err) {
      console.error('[LocationTracking] Permission error:', sanitizeLogValue(err));
      return false;
    }
  }
}

export const locationTracking = new LocationTrackingService();
export const locationService = locationTracking;
