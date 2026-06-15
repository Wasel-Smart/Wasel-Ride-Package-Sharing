/**
 * Ride Matching Service - Production
 * Structured logging, env-driven config, resilient pools, input validation
 */
import postgres from 'postgres';
import Redis from 'ioredis';
import type { CoordinateInput } from './shared/src/validation/schemas.js';
import { logger } from './shared/src/logging/logger.js';
import { ValidationError, DatabaseError } from './shared/src/errors/app-errors.js';
import { eventBroker } from './shared/platform/event-broker-redis-production.js';
import { startRuntimeHealthServer } from './runtime/http-health.js';

const config = (() => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is required');
  return {
    database: {
      url: dbUrl,
      max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      idle: parseInt(process.env.DB_POOL_IDLE ?? '20', 10),
      timeout: parseInt(process.env.DB_POOL_TIMEOUT ?? '10', 10),
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES ?? '10', 10),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY_MS ?? '1000', 10),
    },
  };
})();

class PostgresPool {
  private static instance: ReturnType<typeof postgres> | null = null;
  static get connection() {
    if (!PostgresPool.instance) {
      PostgresPool.instance = postgres(config.database.url, {
        max: config.database.max,
        idle_timeout: config.database.idle * 1000,
        connect_timeout: config.database.timeout * 1000,
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
          return Math.min(times * config.redis.retryDelay, 5000);
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
  private readonly MAX_RADIUS_KM = 10;

  validateOrigin(origin: CoordinateInput) {
    if (!Number.isFinite(origin.lat) || origin.lat < -90 || origin.lat > 90) throw new ValidationError(`Invalid latitude: ${origin.lat}`);
    if (!Number.isFinite(origin.lng) || origin.lng < -180 || origin.lng > 180) throw new ValidationError(`Invalid longitude: ${origin.lng}`);
  }

  async findNearbyDrivers(origin: CoordinateInput, seats: number, radiusKm = 5) {
    this.validateOrigin(origin);
    if (!Number.isInteger(seats) || seats < 1 || seats > 8) throw new ValidationError(`Seat count must be 1-8: ${seats}`);

    try {
      const sql = PostgresPool.connection;
      const drivers = await sql<{
        driverId: string; vehicleId: string; lng: string; lat: string;
        availableSeats: string; rating: string; status: string;
      }>`
        SELECT
          d.driver_id as "driverId", d.vehicle_id as "vehicleId",
          ST_X(d.location::geometry) as lng, ST_Y(d.location::geometry) as lat,
          d.available_seats as "availableSeats",
          COALESCE(p.rating, 4.5) as rating, d.status
        FROM driver_availability d
        LEFT JOIN profiles p ON d.driver_id = p.id
        WHERE d.status = 'available'
          AND d.available_seats >= ${seats}
          AND ST_DWithin(
            d.location::geography,
            ST_MakePoint(${origin.lng}, ${origin.lat})::geography,
            ${radiusKm * 1000}
          )
        ORDER BY ST_Distance(d.location::geography, ST_MakePoint(${origin.lng}, ${origin.lat})::geography)
        LIMIT 20
      `;
      logger.info({ count: drivers.length, origin: { lat: origin.lat, lng: origin.lng }, seats }, 'Nearby drivers found');
      return drivers.map(d => ({
        driverId: d.driverId, vehicleId: d.vehicleId,
        location: { lat: Number(d.lat), lng: Number(d.lng) },
        availableSeats: Number(d.availableSeats), rating: Number(d.rating), status: d.status,
      }));
    } catch (error) {
      logger.error({ err: error, origin, seats }, 'PostGIS driver search failed');
      throw new DatabaseError('Driver search failed', error instanceof Error ? error : undefined);
    }
  }

  scoreDrivers(drivers: { location: CoordinateInput; rating: number }[], origin: CoordinateInput) {
    return drivers.map(driver => {
      const distance = this.distanceKm(driver.location, origin);
      return { ...driver, score: Math.max(0, 1 - distance / this.MAX_RADIUS_KM) * 0.6 + driver.rating / 5.0 * 0.4 };
    });
  }

  async executeMatch(rideId: string, candidates: { score: number; driverId: string; vehicleId: string; location: CoordinateInput }[], origin: CoordinateInput) {
    if (candidates.length === 0) return null;
    const top = candidates.sort((a, b) => b.score - a.score)[0];
    const reserved = await this.reserveDriver(top.driverId, rideId);
    if (!reserved) {
      logger.warn({ rideId, driverId: top.driverId }, 'Race condition — driver taken');
      return null;
    }
    logger.info({ rideId, driverId: top.driverId }, 'Match executed');
    return {
      rideId, driverId: top.driverId, vehicleId: top.vehicleId, matchScore: top.score,
      estimatedArrival: Math.ceil(this.distanceKm(top.location, origin) * 3),
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
      logger.error({ err: error, driverId, rideId }, 'Reservation failed');
      return false;
    }
  }

  private distanceKm(p1: CoordinateInput, p2: CoordinateInput) {
    const R = 6371;
    const dLat = this.toRad(p2.lat - p1.lat), dLng = this.toRad(p2.lng - p1.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(p1.lat)) * Math.cos(this.toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) { return deg * Math.PI / 180; }
}

export class RideMatchingService {
  private readonly engine = new MatchingEngine();
  private unsubscribe: (() => Promise<void>) | null = null;
  private healthServer: { close(): Promise<void> } | null = null;
  private ready = false;

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
      { groupName: 'ride-matching-service', consumerName: `matching-worker-${process.env.HOSTNAME ?? 'local'}`, blockMs: 5000, count: 10 },
    );
    this.ready = true;
    logger.info('RideMatchingService started');
  }

  async stop() {
    this.ready = false;
    if (this.unsubscribe) await this.unsubscribe();
    if (this.healthServer) await this.healthServer.close();
    await PostgresPool.disconnect();
    await RedisPool.disconnect();
    logger.info('RideMatchingService stopped');
  }

  async handleRideRequest(event: { id: string; payload: unknown; traceId?: string }) {
    const startMs = Date.now();
    try {
      const request = event.payload as { rideId: string; origin: CoordinateInput; seats: number };
      if (!event.payload || typeof event.payload !== 'object') throw new ValidationError('Invalid ride request');
      const { rideId, origin, seats } = request;
      if (!rideId || !origin) throw new ValidationError('Missing rideId or origin');

      const drivers = await this.engine.findNearbyDrivers(origin, seats, 5);
      const scored = this.engine.scoreDrivers(drivers, origin);
      const match = await this.engine.executeMatch(rideId, scored, origin);

      if (!match) {
        logger.warn({ eventId: event.id, rideId }, 'Match failed — no drivers');
        return;
      }

      await eventBroker.publish({
        id: `evt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        type: 'rides.assigned',
        payload: {
          rideId: match.rideId, driverId: match.driverId, vehicleId: match.vehicleId,
          matchedAt: new Date().toISOString(), estimatedArrival: match.estimatedArrival,
        },
        producer: 'ride-matching-service', traceId: event.traceId, occurredAt: new Date().toISOString(),
      });
      logger.info({ eventId: event.id, rideId, durationMs: Date.now() - startMs }, 'Matched successfully');
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Ride processing error');
      throw err;
    }
  }

  async healthCheck() {
    try {
      await PostgresPool.connection.sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1].endsWith('service-production.ts')) {
  const service = new RideMatchingService();
  process.on('SIGTERM', async () => {
    logger.info({ service: 'ride-matching' }, 'SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });
  service.start().catch(err => {
    logger.error({ err }, 'Fatal error');
    process.exit(1);
  });
}
