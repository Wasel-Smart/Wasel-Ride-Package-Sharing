import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import type { DomainEventEnvelope, DomainEventPayloadMap } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis-production';
import { startRuntimeHealthServer, type RuntimeHealthServer } from '../runtime/http-health';
import { startSpan, getActiveSpan } from '../shared/opentelemetry';
import { getLogger } from '../shared/structured-logger';
import { SpanStatusCode, type Span } from '@opentelemetry/api';

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const logger = getLogger('ride-matching');

type RidesRequestedPayload = DomainEventPayloadMap['rides.requested'];
type RidesAssignedPayload = DomainEventPayloadMap['rides.assigned'];

interface RideRequest {
  rideId: string;
  riderId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  requestedAt: string;
  seats: number;
  preferredVehicleType?: string;
}

interface Driver {
  driverId: string;
  vehicleId: string;
  location: { lat: number; lng: number };
  availableSeats: number;
  rating: number;
  status: 'available' | 'busy';
}

interface DriverRow {
  driverId: string;
  vehicleId: string;
  lng: number | string;
  lat: number | string;
  availableSeats: number;
  rating: number;
  status: 'available' | 'busy';
}

interface MatchResult {
  rideId: string;
  driverId: string;
  vehicleId: string;
  matchScore: number;
  estimatedArrival: number;
}

class MatchingEngine {
  private readonly MAX_SEARCH_RADIUS_KM = 10;
  private readonly MIN_DRIVER_RATING = 4.0;

  async findNearbyDrivers(
    origin: { lat: number; lng: number },
    seats: number,
    radiusKm: number = 5,
  ): Promise<Driver[]> {
    const span = getActiveSpan();
    span?.setAttribute('search.origin.lat', origin.lat);
    span?.setAttribute('search.origin.lng', origin.lng);
    span?.setAttribute('search.radius_km', radiusKm);
    span?.setAttribute('search.seats_required', seats);

    try {
      const drivers = await sql<DriverRow[]>`
        SELECT 
          d.driver_id as "driverId",
          d.vehicle_id as "vehicleId",
          ST_X(d.location::geometry) as lng,
          ST_Y(d.location::geometry) as lat,
          d.available_seats as "availableSeats",
          COALESCE(p.rating, 4.5) as rating,
          d.status
        FROM driver_availability d
        LEFT JOIN profiles p ON d.driver_id = p.id
        WHERE d.status = 'available'
          AND d.available_seats >= ${seats}
          AND ST_DWithin(
            d.location::geography,
            ST_MakePoint(${origin.lng}, ${origin.lat})::geography,
            ${radiusKm * 1000}
          )
        ORDER BY ST_Distance(
          d.location::geography,
          ST_MakePoint(${origin.lng}, ${origin.lat})::geography
        )
        LIMIT 20
      `;

      if (span) {
        span.setAttribute('search.drivers_found', drivers.length);
      }

      return drivers.map(d => ({
        driverId: d.driverId,
        vehicleId: d.vehicleId,
        location: { lat: Number(d.lat), lng: Number(d.lng) },
        availableSeats: Number(d.availableSeats),
        rating: Number(d.rating),
        status: d.status,
      }));
    } catch (error) {
      logger.error({ error }, 'PostGIS query error');
      if (span && error instanceof Error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      }
      throw error;
    }
  }

  async scoreDrivers(
    drivers: Driver[],
    request: RideRequest,
  ): Promise<Array<Driver & { score: number }>> {
    return drivers.map(driver => {
      const distance = this.calculateDistance(driver.location, request.origin);
      const ratingScore = driver.rating / 5.0;
      const proximityScore = Math.max(0, 1 - distance / this.MAX_SEARCH_RADIUS_KM);
      
      const score = proximityScore * 0.6 + ratingScore * 0.4;

      return { ...driver, score };
    });
  }

  async executeMatch(
    request: RideRequest,
    candidates: Array<Driver & { score: number }>,
  ): Promise<MatchResult | null> {
    if (candidates.length === 0) return null;

    const topDriver = candidates.sort((a, b) => b.score - a.score)[0];

    const reserved = await this.reserveDriver(topDriver.driverId, request.rideId);
    if (!reserved) return null;

    return {
      rideId: request.rideId,
      driverId: topDriver.driverId,
      vehicleId: topDriver.vehicleId,
      matchScore: topDriver.score,
      estimatedArrival: Math.ceil(this.calculateDistance(topDriver.location, request.origin) * 3),
    };
  }

  private async reserveDriver(driverId: string, rideId: string): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE driver_availability
        SET 
          status = 'reserved',
          reserved_for_ride_id = ${rideId},
          reserved_at = NOW()
        WHERE driver_id = ${driverId} 
          AND status = 'available'
        RETURNING driver_id
      `;

      return result.length > 0;
    } catch (error) {
      logger.error({ error, driverId, rideId }, 'Driver reservation failed');
      return false;
    }
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    const R = 6371;
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

export class RideMatchingService {
  private engine = new MatchingEngine();
  private unsubscribe?: () => Promise<void>;
  private healthServer?: RuntimeHealthServer;
  private ready = false;

  async start(): Promise<void> {
    logger.info('Starting ride-matching service...');

    this.healthServer = startRuntimeHealthServer({
      serviceName: 'ride-matching-service',
      isReady: () => this.ready,
      isHealthy: () => this.healthCheck(),
    });

    this.unsubscribe = await eventBroker.subscribe(
      'rides.requested',
      this.handleRideRequest.bind(this),
      {
        groupName: 'ride-matching-service',
        consumerName: `matching-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 5000,
        count: 10,
      },
    );

    this.ready = true;
    logger.info('Ride-matching service started');
  }

  async stop(): Promise<void> {
    this.ready = false;
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
    if (this.healthServer) {
      await this.healthServer.close();
    }
    await sql.end();
    logger.info('Ride-matching service stopped');
  }

  private async handleRideRequest(event: DomainEventEnvelope<'rides.requested'>): Promise<void> {
    const span = getActiveSpan();
    span?.setAttribute('event.id', event.id);

    const request: RidesRequestedPayload = event.payload;

    const drivers = await this.engine.findNearbyDrivers(request.origin, request.seats, 5);

    if (drivers.length === 0) {
      logger.info({ rideId: request.rideId }, 'No drivers found');
      return;
    }

    const scored = await this.engine.scoreDrivers(drivers, request);
    const match = await this.engine.executeMatch(request, scored);

    if (!match) {
      logger.info({ rideId: request.rideId }, 'Match failed');
      return;
    }

    const assignedPayload: RidesAssignedPayload = {
      rideId: match.rideId,
      driverId: match.driverId,
      vehicleId: match.vehicleId,
      matchedAt: new Date().toISOString(),
      estimatedArrival: match.estimatedArrival,
    };

    await eventBroker.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'rides.assigned',
      payload: assignedPayload,
      producer: 'ride-matching-service',
      traceId: event.traceId,
      occurredAt: new Date().toISOString(),
    });

    logger.info({ rideId: match.rideId, driverId: match.driverId }, 'Ride matched successfully');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const service = new RideMatchingService();
  
  process.on('SIGTERM', async () => {
    console.log('[RideMatchingService] SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  service.start().catch(error => {
    console.error('[RideMatchingService] Fatal error:', error);
    process.exit(1);
  });
}
