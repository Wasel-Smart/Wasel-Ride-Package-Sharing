import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
  NotFoundError,
} from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../../runtime/http-health';
import { logger } from '@wasel/backend-shared/logging/logger';
import { z } from 'zod';
import { eventBroker } from '../../../src/platform/event-broker-redis-production.js';

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
        retryStrategy: times => Math.min(times * config.redis.retryDelayMs, 5000),
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

interface MobilityCorridor {
  id: string;
  origin_city: string;
  destination_city: string;
  seats_total: number;
  seats_booked: number;
  cargo_total_kg: number;
  cargo_booked_kg: number;
  demand_index: number;
  price_per_seat: number;
  price_per_kg: number;
}

function buildMobilitySnapshot(corridors: MobilityCorridor[]): {
  corridors: Array<{
    id: string;
    route: string;
    seatsAvailable: number;
    cargoAvailableKg: number;
    demandIndex: number;
    dynamicSeatPrice: number;
    dynamicCargoPrice: number;
  }>;
} {
  return {
    corridors: corridors.map(c => ({
      id: c.id,
      route: `${c.origin_city} → ${c.destination_city}`,
      seatsAvailable: Math.max(0, c.seats_total - c.seats_booked),
      cargoAvailableKg: Math.max(0, c.cargo_total_kg - c.cargo_booked_kg),
      demandIndex: c.demand_index,
      dynamicSeatPrice: c.price_per_seat,
      dynamicCargoPrice: c.price_per_kg,
    })),
  };
}

function advanceCorridorAfterBooking(input: {
  corridor: MobilityCorridor;
  type: 'seat' | 'cargo';
  quantity: number;
  timestamp: string;
}): MobilityCorridor {
  const next = { ...input.corridor };
  const factor = input.type === 'seat' ? 1.05 : 1.03;

  if (input.type === 'seat') {
    next.seats_booked += input.quantity;
  } else {
    next.cargo_booked_kg += input.quantity;
  }

  next.demand_index = Math.min(100, next.demand_index * factor);
  next.price_per_seat = Number((next.price_per_seat * factor).toFixed(3));
  next.price_per_kg = Number((next.price_per_kg * factor).toFixed(3));

  return next;
}

function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.use(
    createRateLimitMiddleware(RedisPool.connection, {
      windowMs: 60_000,
      maxRequests: 100,
    }),
  );

  app.get('/health', async (_req, res) => {
    const redisHealthy = await RedisPool.connection.ping().then(() => true).catch(() => false);
    const dbHealthy = await PostgresPool.connection`SELECT 1`.then(() => true).catch(() => false);
    res.json({ status: 'ok', timestamp: new Date().toISOString(), checks: { redis: redisHealthy, database: dbHealthy } });
  });

  app.get('/ready', async (_req, res) => ({ status: 'ready' }));

  app.get('/metrics', async (_req, res) => ({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.get('/v1/mobility-os/snapshot', async (req, res) => {
    const sql = PostgresPool.connection;

    const [corridors] = await sql`
      SELECT * FROM mobility_corridors ORDER BY demand_index DESC
    `;

    res.json(buildMobilitySnapshot((corridors ?? []) as unknown as MobilityCorridor[]));
  });

  app.post('/v1/mobility-os/booking/create', async (req, res) => {
    const { corridorId, type, quantity, userId } = req.body;
    if (!corridorId || !type || quantity <= 0) {
      throw new ValidationError('Invalid booking request');
    }

    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [corridor] = await sql`
      SELECT * FROM mobility_corridors WHERE id = ${corridorId}
    `;

    if (!corridor) {
      throw new NotFoundError('Corridor not found');
    }

    const updated = advanceCorridorAfterBooking({
      corridor: corridor as unknown as MobilityCorridor,
      type: type === 'cargo' ? 'cargo' : 'seat',
      quantity,
      timestamp: now,
    });

    await sql`
      UPDATE mobility_corridors
      SET seats_booked = ${updated.seats_booked},
          cargo_booked_kg = ${updated.cargo_booked_kg},
          demand_index = ${updated.demand_index},
          price_per_seat = ${updated.price_per_seat},
          price_per_kg = ${updated.price_per_kg}
      WHERE id = ${corridorId}
    `;

    await eventBroker.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      type: 'mobility.booking-created',
      payload: { corridorId, type, quantity, userId },
      producer: 'mobility-os-service',
      occurredAt: now,
    });

    res.status(201).json({ success: true, corridor: updated });
  });

  app.get('/v1/mobility-os/live-rows', async (req, res) => {
    const sql = PostgresPool.connection;

    const [trips, bookings, packages] = await Promise.all([
      sql`SELECT trip_id as id, origin_city as origin, destination_city as destination, available_seats, price_per_seat, trip_status as status FROM trips WHERE trip_status IN ('open', 'in_progress')`,
      sql`SELECT booking_id as id, passenger_id as passenger, driver_id as driver, status, amount FROM bookings WHERE status = 'confirmed'`,
      sql`SELECT id, sender_id as sender, recipient_name as recipient, status, price_jod as amount FROM packages WHERE status IN ('created', 'in_transit')`,
    ]);

    res.json({
      trips: trips ?? [],
      bookings: bookings ?? [],
      packages: packages ?? [],
      fetchedAt: new Date().toISOString(),
    });
  });

  app.get('/v1/trips/search', async (req, res) => {
    const sql = PostgresPool.connection;
    const { from, to, date, seats } = req.query as Record<string, string>;

    let query = sql`
      SELECT trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity
      FROM trips WHERE trip_status IN ('open', 'in_progress') AND deleted_at IS NULL
    `;

    if (from) query = sql`SELECT * FROM (${query}) WHERE origin_city ILIKE ${'%' + from + '%'}`;
    if (to) query = sql`SELECT * FROM (${query}) WHERE destination_city ILIKE ${'%' + to + '%'}`;
    if (seats) query = sql`SELECT * FROM (${query}) WHERE available_seats >= ${Number(seats)}`;
    if (date) {
      const fromDate = `${date}T00:00:00`;
      const toDate = `${date}T23:59:59.999`;
      query = sql`SELECT * FROM (${query}) WHERE departure_time >= ${fromDate} AND departure_time <= ${toDate}`;
    }

    const [trips] = await query;

    res.json(trips ?? []);
  });

  app.post('/v1/trips/calculate-price', async (req, res) => {
    const { type, distance_km, base_price, weight } = req.body;
    const distance = Math.max(1, Number(distance_km ?? 8));
    const base = Math.max(1, Number(base_price ?? (type === 'package' ? 3.5 : 2.5)));
    const packageCharge = type === 'package' ? Math.max(0, Number(weight ?? 0.5) - 1) * 0.35 : 0;
    const distanceCharge = distance * (type === 'package' ? 0.22 : 0.18);

    res.json({
      price: Number((base + distanceCharge + packageCharge).toFixed(3)),
      currency: 'JOD',
      breakdown: {
        base,
        distance: Number(distanceCharge.toFixed(3)),
        package: Number(packageCharge.toFixed(3)),
      },
    });
  });

  app.post('/v1/trips', async (req, res) => {
    const { driverId, from, to, date, time, seats, price, acceptsPackages, packageCapacity } = req.body;
    const sql = PostgresPool.connection;
    const now = new Date().toISOString();
    const departureTime = new Date(`${date}T${time}:00`).toISOString();

    const [trip] = await sql`
      INSERT INTO trips (driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, created_at, updated_at)
      VALUES (${driverId}, ${from}, ${to}, ${departureTime}, ${seats ?? 1}, ${price ?? 0}, 'open', ${acceptsPackages ?? false}, ${packageCapacity ? (packageCapacity === 'large' ? 3 : packageCapacity === 'medium' ? 2 : 1) : 0}, ${now}, ${now})
      RETURNING *
    `;

    res.status(201).json({ trip });
  });

  app.get('/v1/trips/user/{userId}', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [trips] = await sql`
      SELECT * FROM trips WHERE driver_id = ${userId} AND deleted_at IS NULL ORDER BY departure_time DESC
    `;

    res.json(trips ?? []);
  });

  app.get('/v1/trips/{tripId}/bookings', async (req, res) => {
    const { tripId } = req.params;
    const sql = PostgresPool.connection;

    const [bookings] = await sql`
      SELECT * FROM bookings WHERE trip_id = ${tripId} ORDER BY created_at DESC
    `;

    res.json(bookings ?? []);
  });

  app.get('/v1/trips/{tripId}', async (req, res) => {
    const { tripId } = req.params;
    const sql = PostgresPool.connection;

    const [trip] = await sql`
      SELECT * FROM trips WHERE trip_id = ${tripId} AND deleted_at IS NULL
    `;

    if (!trip) throw new NotFoundError('Trip not found');
    res.json(trip);
  });

  app.post('/v1/bookings', async (req, res) => {
    const { tripId, passengerId, seatsRequested, totalPrice, status } = req.body;
    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [booking] = await sql`
      INSERT INTO bookings (trip_id, passenger_id, seats_requested, total_price, status, created_at, updated_at)
      VALUES (${tripId}, ${passengerId}, ${seatsRequested ?? 1}, ${totalPrice}, ${status ?? 'confirmed'}, ${now}, ${now})
      RETURNING *
    `;

    res.status(201).json({ booking });
  });

  app.get('/v1/bookings/user/{userId}', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [bookings] = await sql`
      SELECT * FROM bookings WHERE passenger_id = ${userId} ORDER BY created_at DESC
    `;

    res.json(bookings ?? []);
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    logger.error('Mobility OS service error', { err: error });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

async function start() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Mobility OS Service listening on port ${config.port}`);
  });

  const healthServer = startRuntimeHealthServer({
    serviceName: 'mobility-os-service',
    isReady: () => true,
    isHealthy: async () => {
      try {
        return await Promise.all([
          RedisPool.connection.ping().then(() => true).catch(() => false),
          PostgresPool.connection`SELECT 1`.then(() => true).catch(() => false),
        ]).then(results => results.every(Boolean));
      } catch {
        return false;
      }
    },
  });

  process.on('SIGTERM', async () => {
    server.close(() => console.log('Server closed'));
    await healthServer.close();
    await PostgresPool.disconnect();
    await RedisPool.disconnect();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start mobility-os-service:', err);
  process.exit(1);
});