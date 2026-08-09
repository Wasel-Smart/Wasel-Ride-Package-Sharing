/**
 * Real-time geolocation streaming service
 * Uses WebSockets for live driver location updates
 */

import { createStructuredLogEntry } from './observability';
import { telemetry } from './telemetry';
import { sanitizeLogMessage, safeJSONParse } from '../utils/sanitization';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface DriverLocation extends GeoLocation {
  driverId: string;
  vehicleId: string;
  status: 'available' | 'on_trip' | 'offline';
}

export interface GeoUpdate {
  type: 'location_update' | 'status_change' | 'driver_nearby';
  payload: DriverLocation | DriverLocation[];
}

class GeoStreamService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private listeners: Map<string, Set<(data: GeoUpdate) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();

  constructor(private endpoint: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const spanId = telemetry.startSpan('geo_stream.connect');

      try {
        this.ws = new WebSocket(this.endpoint);

        this.ws.onopen = () => {
          console.log(
            createStructuredLogEntry('info', 'GeoStream connected', 'geo-stream', {
              endpoint: this.endpoint,
            }),
          );

          telemetry.endSpan(spanId, 'ok');
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          // Resubscribe to previous subscriptions
          this.subscriptions.forEach(sub => this.send({ type: 'subscribe', topic: sub }));

          resolve();
        };

        this.ws.onmessage = event => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = error => {
          console.error(
            createStructuredLogEntry('error', 'GeoStream error', 'geo-stream', {
              error: sanitizeLogMessage(String(error)),
            }),
          );
          telemetry.endSpan(spanId, 'error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log(
            createStructuredLogEntry('info', 'GeoStream disconnected', 'geo-stream', {
              reconnectAttempts: this.reconnectAttempts,
            }),
          );

          this.stopHeartbeat();

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
            this.reconnectAttempts++;

            setTimeout(() => {
              console.log(
                createStructuredLogEntry('info', 'Attempting to reconnect', 'geo-stream', {
                  attempt: this.reconnectAttempts,
                }),
              );
              this.connect();
            }, delay);
          }
        };
      } catch (error) {
        telemetry.endSpan(spanId, 'error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(topic: string, callback: (data: GeoUpdate) => void): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }

    const topicListeners = this.listeners.get(topic);
    topicListeners?.add(callback);
    this.subscriptions.add(topic);

    // Send subscription message to server
    this.send({ type: 'subscribe', topic });

    telemetry.recordMetric('geo_stream.subscription', 1, 'count', { topic });

    // Return unsubscribe function
    return () => {
      this.listeners.get(topic)?.delete(callback);
      if (this.listeners.get(topic)?.size === 0) {
        this.listeners.delete(topic);
        this.subscriptions.delete(topic);
        this.send({ type: 'unsubscribe', topic });
      }
    };
  }

  // Subscribe to drivers near a location
  subscribeToArea(
    lat: number,
    lng: number,
    radiusKm: number,
    callback: (drivers: DriverLocation[]) => void,
  ): () => void {
    const topic = `area:${lat},${lng}:${radiusKm}`;
    return this.subscribe(topic, update => {
      if (update.type === 'location_update' || update.type === 'driver_nearby') {
        callback(Array.isArray(update.payload) ? update.payload : [update.payload]);
      }
    });
  }

  // Subscribe to a specific driver's location
  subscribeToDriver(driverId: string, callback: (location: DriverLocation) => void): () => void {
    const topic = `driver:${driverId}`;
    return this.subscribe(topic, update => {
      if (!Array.isArray(update.payload)) {
        callback(update.payload);
      }
    });
  }

  // Publish driver location (for driver app)
  publishLocation(location: DriverLocation): void {
    this.send({
      type: 'publish',
      topic: 'location_update',
      data: location,
    });

    telemetry.recordMetric('geo_stream.location_published', 1, 'count', {
      driverId: location.driverId,
    });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn(
        createStructuredLogEntry('warning', 'Cannot send, WebSocket not open', 'geo-stream', {
          readyState: this.ws?.readyState,
        }),
      );
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = safeJSONParse(data, { type: '__invalid__', payload: null }) as GeoUpdate | { type: string; payload: unknown };

      const ALLOWED_GEO_TYPES = new Set<string>(['location_update', 'status_change', 'driver_nearby']);
      if (!ALLOWED_GEO_TYPES.has(message.type) || typeof message.payload !== 'object' || message.payload === null) {
        return;
      }

      const geoMessage = message as GeoUpdate;
      const sanitizedMessage: GeoUpdate = {
        type: geoMessage.type,
        payload: Array.isArray(geoMessage.payload)
          ? geoMessage.payload.map(p => ({
              driverId: typeof p.driverId === 'string' ? p.driverId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) : '',
              vehicleId: typeof p.vehicleId === 'string' ? p.vehicleId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) : '',
              lat: typeof p.lat === 'number' ? Math.max(-90, Math.min(90, p.lat)) : 0,
              lng: typeof p.lng === 'number' ? Math.max(-180, Math.min(180, p.lng)) : 0,
              heading: typeof p.heading === 'number' ? Math.max(0, Math.min(360, p.heading)) : 0,
              speed: typeof p.speed === 'number' ? Math.max(0, Math.min(360, p.speed)) : 0,
              timestamp: typeof p.timestamp === 'number' ? p.timestamp : Date.now(),
              status: ['available', 'on_trip', 'offline'].includes(p.status) ? p.status : 'offline',
            }))
          : {
              driverId: typeof geoMessage.payload.driverId === 'string' ? geoMessage.payload.driverId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) : '',
              vehicleId: typeof geoMessage.payload.vehicleId === 'string' ? geoMessage.payload.vehicleId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) : '',
              lat: typeof geoMessage.payload.lat === 'number' ? Math.max(-90, Math.min(90, geoMessage.payload.lat)) : 0,
              lng: typeof geoMessage.payload.lng === 'number' ? Math.max(-180, Math.min(180, geoMessage.payload.lng)) : 0,
              heading: typeof geoMessage.payload.heading === 'number' ? Math.max(0, Math.min(360, geoMessage.payload.heading)) : 0,
              speed: typeof geoMessage.payload.speed === 'number' ? Math.max(0, Math.min(360, geoMessage.payload.speed)) : 0,
              timestamp: typeof geoMessage.payload.timestamp === 'number' ? geoMessage.payload.timestamp : Date.now(),
              status: ['available', 'on_trip', 'offline'].includes(geoMessage.payload.status) ? geoMessage.payload.status : 'offline',
            },
      };

      const listeners = this.listeners.get(sanitizedMessage.type) || new Set();
      listeners.forEach(callback => callback(sanitizedMessage));

      telemetry.recordMetric('geo_stream.message_received', 1, 'count', {
        type: sanitizedMessage.type,
      });
    } catch (error) {
      console.error(
        createStructuredLogEntry('error', 'Failed to parse geo message', 'geo-stream', {
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
          data: sanitizeLogMessage(data),
        }),
      );
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Singleton instance — only created when VITE_GEO_STREAM_URL is configured.
// The WebSocket server is a separate infrastructure component; without the env
// var the service stays dormant rather than connecting to a phantom endpoint.
const geoStreamUrl = import.meta.env.VITE_GEO_STREAM_URL as string | undefined;

export const geoStream = geoStreamUrl
  ? new GeoStreamService(geoStreamUrl)
  : null;

// Auto-connect in browser only when the URL is configured
if (typeof window !== 'undefined' && geoStream) {
  geoStream.connect().catch(error => {
    console.error('Failed to connect to GeoStream:', sanitizeLogMessage(error));
  });
} else if (typeof window !== 'undefined' && !geoStreamUrl) {
  if (import.meta.env.DEV) {
    console.info('[GeoStream] VITE_GEO_STREAM_URL is not set — real-time driver location is disabled.');
  }
}

/**
 * React hook for using geo stream.
 * Returns null-safe no-ops when VITE_GEO_STREAM_URL is not configured.
 */
export function useGeoStream() {
  const noop = () => () => {};
  const noopPublish = () => {};
  return {
    subscribeToArea: geoStream ? geoStream.subscribeToArea.bind(geoStream) : noop,
    subscribeToDriver: geoStream ? geoStream.subscribeToDriver.bind(geoStream) : noop,
    publishLocation: geoStream ? geoStream.publishLocation.bind(geoStream) : noopPublish,
  };
}
