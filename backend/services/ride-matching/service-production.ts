/**
 * Ride Matching Service - Production Implementation
 * Structured logging, env-driven config, resilient pool management, SQL-injection safe
 */
import postgres from 'postgres';
import Redis from 'ioredis';
import { loadConfig } from '../shared/src/config/app.config.js';
import { logger } from '../shared/src/logging/logger.js';
import { ValidationError, DatabaseError, ExternalServiceError } from '../shared/src/errors/app-errors.js';
import type { CoordinateInput } from '../shared/src/validation/schemas.js';
import { eventBroker } from './shared/platform/event-broker-redis-production.js';
import { startRuntimeHealthServer } from '../runtime/http-health.js';
import type { EventBrokerAdapter } from './shared/platform/event-broker-redis-production.js';
import type { RuntimeHealthServer } from '../runtime/http-health.js';

const config = loadConfig();

class PostgresPool {
  private static instance: ReturnType<typeof postgres> | null = null;

  static get connection() {
    if (!PostgresPool.instance) {
      PostgresPool.instance = postgres(config.database.url, {
        max: config.database.maxConnections,
        idle_timeout: config.database.idleTimeoutSeconds * 1000,
        connect_timeout: config.database.connectionTimeoutSeconds * 1000,
      });
    }
    return PostgresPool.instance;
  }

  static async disconnect() {
    if (PostgresPool.instance) {
      await PostgresPool.instance.end();
      PostgresPool.instance = null;
    }
  }
}

class RedisPool {
  private static instance: Redis | null = null;

  static get connection() {
    if (!RedisPool.instance) {
      RedisPool.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        tls: config.redis.tls ? {} : undefined,
        maxRetries: config.redis.maxRetries,
        retryStrategy: (times: number) => {
          if (times > config.redis.maxRetries) return null;
          return Math.min(times * config.redis.retryDelayMs, 5000);
        },
        enableReadyCheck: true,
        enableOfflineQueue: false,
      });
    }
    return RedisPool.instance;
  }

  static async disconnect() {
    if (RedisPool.instance) {
      await RedisPool.instance.quit();
      RedisPool.instance = null;
    }
  }
}

class MatchingEngine {
  private readonly MAX_SEARCH_RADIUS_KM = 10;
  private readonly MIN_DRIVER_RATING = 4.0;

  validateCoordinate(coord: CoordinateInput): void {
    if (!Number.isFinite(coord.lat) || coord.lat < -90 || coord.lat > 90) {
      throw new ValidationError(`Invalid latitude: ${coord.lat}`, { lat: coord.lat });
    }
    if (!Number.isFinite(coord.lng) || coord.lng < -180 || coord.lng > 180) {
      throw new ValidationError(`Invalid longitude: ${coord.lng}`, { lng: coord.lng });
    }
  }

  async findNearbyDrivers(origin: CoordinateInput, seats: number, radiusKm = 5) {
    this.validateCoordinate(origin);
    if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
      throw new ValidationError(`Seat count must be 1-8: ${seats}`);
    }

    try {
      const sql = PostgresPool.connection;
      const drivers = await sql<{
        driverId: string;
        vehicleId: string;
        lng: string;
        lat: string;
        availableSeats: string;
        rating: string;
        status: string;
      }>`
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
      logger.info({ count: drivers.length, origin, seats }, 'Nearby drivers found');
      return drivers.map(d => ({
        driverId: d.driverId,
        vehicleId: d.vehicleId,
        location: { lat: Number(d.lat), lng: Number(d.lng) },
        availableSeats: Number(d.availableSeats),
        rating: Number(d.rating),
        status: d.status,
      }));
    } catch (error) {
      logger.error({ err: error, origin, seats }, 'PostGIS query failed');
      throw new DatabaseError('Driver search failed', error instanceof Error ? error : undefined);
    }
  }

  async scoreDrivers(drivers: { location: CoordinateInput; rating: number }[], request: { origin: CoordinateInput }) {
    return drivers.map(driver => {
      const distance = this.calculateDistance(driver.location, request.origin);
      const ratingScore = driver.rating / 5.0;
      const proximityScore = Math.max(0, 1 - distance / this.MAX_SEARCH_RADIUS_KM);
      return { ...driver, score: proximityScore * 0.6 + ratingScore * 0.4 };
    });
  }

  async executeMatch(request: { rideId: string }, candidates: { score: number; driverId: string; vehicleId: string; location: CoordinateInput }[]) {
    if (candidates.length === 0) {
      logger.info({ rideId: request.rideId }, 'No matching candidates');
      return null;
    }
    const topDriver = candidates.sort((a, b) => b.score - a.score)[0];
    const reserved = await this.reserveDriver(topDriver.driverId, request.rideId);
    if (!reserved) {
      logger.warn({ rideId: request.rideId, driverId: topDriver.driverId }, 'Driver reservation failed — race condition');
      return null;
    }
    logger.info({ rideId: request.rideId, driverId: topDriver.driverId }, 'Match executed');
    return {
      rideId: request.rideId,
      driverId: topDriver.driverId,
      vehicleId: topDriver.vehicleId,
      matchScore: topDriver.score,
      estimatedArrival: Math.ceil(this.calculateDistance(topDriver.location, request.origin) * 3),
    };
  }

  async reserveDriver(driverId: string, rideId: string) {
    try {
      const sql = PostgresPool.connection;
      const result = await sql`
        UPDATE driver_availability
        SET status = 'reserved', reserved_for_ride_id = ${rideId}, reserved_at = NOW()
        WHERE driver_id = ${driverId} AND status = 'available'
        RETURNING driver_id
      `;
      return result.length > 0;
    } catch (error) {
      logger.error({ err: error, driverId, rideId }, 'Driver reservation failed');
      return false;
    }
  }

  calculateDistance(point1: CoordinateInput, point2: CoordinateInput): number {
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

  private toRad(degrees: number) {
    return (degrees * Math.PI) / 180;
  }
}

  async start() {
    logger.info('RideMatchingService starting');
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
        consumerName: `matching-worker-${process.env.HOSTNAME ?? 'local'}`,
        blockMs: 5000,
        count: 10,
      },
    );
    this.ready = true;
    logger.info({ service: 'ride-matching-service' }, 'Service started');
  }
    logger.info('RideMatchingService starting');
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
        consumerName: `matching-worker-${process.env.HOSTNAME ?? 'local'}`,
        blockMs: 5000,
        count: 10,
      },
    );
    this.ready = true;
    logger.info({ service: 'ride-matching-service' }, 'Service started');
  }

  async stop() {
    this.ready = false;
    if (this.unsubscribe) await this.unsubscribe();
    if (this.healthServer) await this.healthServer.close();
    await PostgresPool.disconnect();
    await RedisPool.disconnect();
    logger.info({ service: 'ride-matching-service' }, 'Service stopped');
  }

  async handleRideRequest(event: { id: string; payload: unknown; traceId?: string }) {
    const startTimeMs = Date.now();
    logger.info({ eventId: event.id }, 'Processing ride request');
    try {
      const request = event.payload;
      if (!request || typeof request !== 'object') {
        throw new ValidationError('Invalid ride request payload');
      }
      const { rideId, origin, destination, seats } = request as {
        rideId: string;
        origin: CoordinateInput;
        destination: CoordinateInput;
        seats: number;
      };
      if (!rideId || !origin || !seats) {
        throw new ValidationError('Missing required fields: rideId, origin, seats');
      }

      const drivers = await this.engine.findNearbyDrivers(origin, Number(seats), 5);
      const scored = await this.engine.scoreDrivers(drivers, request);
      const match = await this.engine.executeMatch(request, scored);

      if (!match) {
        logger.warn({ eventId: event.id, rideId: request.rideId }, 'Match failed — no drivers');
        return;
      }

      await eventBroker.publish({
        id: `evt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        type: 'rides.assigned',
        payload: {
          rideId: match.rideId,
          driverId: match.driverId,
          vehicleId: match.vehicleId,
          matchedAt: new Date().toISOString(),
          estimatedArrival: match.estimatedArrival,
        },
        producer: 'ride-matching-service',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
      });
      logger.info({ eventId: event.id, rideId: request.rideId, durationMs: Date.now() - startTimeMs }, 'Matched');
    } catch (error) {
      logger.error({ err: error, eventId: event.id }, 'Ride processing error');
      throw error;
    }
  }

  async healthCheck() {
    try {
      await PostgresPool.connection.sql<[{ pg_sleep: string }]>`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1].endsWith('ride-matching-service.ts')) {
  const service = new RideMatchingService();
  process.on('SIGTERM', async () => {
    logger.info({ service: 'ride-matching-service' }, 'SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });
  service.start().catch(error => {
    logger.error({ err: error }, 'Fatal startup error');
    process.exit(1);
  });
}
