/**
 * Real-time geolocation streaming service
 * Uses WebSockets for live driver location updates
 */

import { createStructuredLogEntry } from './observability';
import { telemetry } from './telemetry';

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
          this.subscriptions.forEach((sub) => this.send({ type: 'subscribe', topic: sub }));

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error(
            createStructuredLogEntry('error', 'GeoStream error', 'geo-stream', {
              error: String(error),
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

    this.listeners.get(topic)!.add(callback);
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
    return this.subscribe(topic, (update) => {
      if (update.type === 'location_update' || update.type === 'driver_nearby') {
        callback(Array.isArray(update.payload) ? update.payload : [update.payload]);
      }
    });
  }

  // Subscribe to a specific driver's location
  subscribeToDriver(driverId: string, callback: (location: DriverLocation) => void): () => void {
    const topic = `driver:${driverId}`;
    return this.subscribe(topic, (update) => {
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

  private send(data: any): void {
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
      const message: GeoUpdate = JSON.parse(data);

      // Route message to appropriate listeners
      const listeners = this.listeners.get(message.type) || new Set();
      listeners.forEach((callback) => callback(message));

      telemetry.recordMetric('geo_stream.message_received', 1, 'count', {
        type: message.type,
      });
    } catch (error) {
      console.error(
        createStructuredLogEntry('error', 'Failed to parse geo message', 'geo-stream', {
          error: error instanceof Error ? error.message : String(error),
          data,
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

// Singleton instance
export const geoStream = new GeoStreamService(
  import.meta.env.VITE_GEO_STREAM_URL || 'wss://api.wasel.jo/geo',
);

// Auto-connect in browser
if (typeof window !== 'undefined') {
  geoStream.connect().catch((error) => {
    console.error('Failed to connect to GeoStream:', error);
  });
}

/**
 * React hook for using geo stream
 */
export function useGeoStream() {
  return {
    subscribeToArea: geoStream.subscribeToArea.bind(geoStream),
    subscribeToDriver: geoStream.subscribeToDriver.bind(geoStream),
    publishLocation: geoStream.publishLocation.bind(geoStream),
  };
}
