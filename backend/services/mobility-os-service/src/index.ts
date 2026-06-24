import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
} from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../../runtime/http-health';
import { logger } from '@wasel/backend-shared/logging/logger';

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

  app.get('/health', () => ({ status: 'ok' }));

  app.get('/v1/mobility-os/snapshot', async (req, res) => {
    const sql = PostgresPool.connection;
    const { data: corridors, error } = await sql.query(
      'SELECT * FROM mobility_corridors ORDER BY demand_index DESC',
    );

    if (error) {
      throw new Error(error.message);
    }

    res.json(buildMobilitySnapshot(corridors as unknown as MobilityCorridor[]));
  });

  app.post('/v1/mobility-os/booking/create', async (req, res) => {
    const { corridorId, type, quantity, timestamp, userId } = req.body;
    if (!corridorId || !type || quantity <= 0) {
      throw new ValidationError('Invalid booking request');
    }

    const sql = PostgresPool.connection;

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
      timestamp: timestamp ?? new Date().toISOString(),
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

    res.status(201).json({ success: true, corridor: updated });
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