import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import { AppError, ValidationError, NotFoundError, } from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../runtime/http-health';
import { CoordinateSchema } from '@wasel/backend-shared/validation/schemas';
import { eventBroker } from '../../../../src/platform/event-broker-redis-production.js';
import { logger } from '@wasel/backend-shared/logging/logger';
const config = loadConfig();
class PostgresPool {
    static instance = null;
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
    static instance = null;
    static get connection() {
        if (!RedisPool.instance) {
            RedisPool.instance = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                tls: config.redis.tls ? {} : undefined,
                maxRetries: config.redis.maxRetries,
                retryStrategy: (times) => {
                    if (times > config.redis.maxRetries)
                        return null;
                    return Math.min(times * config.redis.retryDelayMs, 5000);
                },
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
function createApp() {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(createRateLimitMiddleware(RedisPool.connection, {
        windowMs: 60_000,
        maxRequests: 100,
    }));
    app.get('/health', async (_req, res) => {
        const redisHealthy = await RedisPool.connection.ping().then(() => true).catch(() => false);
        const dbHealthy = await PostgresPool.connection `SELECT 1`.then(() => true).catch(() => false);
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            checks: { redis: redisHealthy, database: dbHealthy },
        });
    });
    app.post('/v1/packages', async (req, res) => {
        const { senderId, recipientName, recipientPhone, origin, destination, priceJod, } = req.body;
        if (!senderId || !recipientName || !origin || !destination) {
            throw new ValidationError('Missing required fields');
        }
        const coordResult = CoordinateSchema.safeParse(origin);
        if (!coordResult.success) {
            throw new ValidationError('Invalid origin coordinates');
        }
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const trackingCode = `PKG-${Math.floor(100000 + Math.random() * 900000)}`;
        const [pkg] = await sql `
      INSERT INTO packages (
        sender_id, recipient_name, recipient_phone,
        origin, destination, status, escrow_status, price_jod,
        created_at, updated_at
      ) VALUES (
        ${senderId}, ${recipientName}, ${recipientPhone},
        ${origin}, ${destination}, 'created', 'pending', ${priceJod},
        ${now}, ${now}
      )
      RETURNING *
    `;
        await eventBroker.publish({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type: 'packages.created',
            payload: {
                packageId: pkg.id,
                trackingCode: pkg.tracking_code,
                origin: pkg.origin,
                destination: pkg.destination,
            },
            producer: 'package-delivery-service',
            traceId: req.headers['x-trace-id'],
            occurredAt: now,
        });
        res.status(201).json({ package: pkg });
    });
    app.get('/v1/packages/:id', async (req, res) => {
        const { id } = req.params;
        if (!id)
            throw new ValidationError('Package ID required');
        const sql = PostgresPool.connection;
        const [pkg] = await sql `
      SELECT * FROM packages WHERE id = ${id}
    `;
        if (!pkg)
            throw new NotFoundError('Package not found');
        res.json({ package: pkg });
    });
    app.patch('/v1/packages/:id/assign', async (req, res) => {
        const { id } = req.params;
        const { driverId, vehicleId } = req.body;
        if (!id || !driverId)
            throw new ValidationError('Missing required fields');
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [pkg] = await sql `
      UPDATE packages
      SET status = 'assigned', assigned_driver_id = ${driverId}, assigned_vehicle_id = ${vehicleId}, updated_at = ${now}
      WHERE id = ${id} AND status = 'created'
      RETURNING *
    `;
        if (!pkg)
            throw new NotFoundError('Package not found or already assigned');
        await eventBroker.publish({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type: 'packages.assigned',
            payload: {
                packageId: pkg.id,
                rideId: driverId,
                driverId: driverId,
            },
            producer: 'package-delivery-service',
            occurredAt: now,
        });
        res.json({ package: pkg });
    });
    app.post('/v1/packages/:id/location', async (req, res) => {
        const { id } = req.params;
        const { lat, lng } = req.body;
        if (!id || lat === undefined || lng === undefined) {
            throw new ValidationError('Package ID and location required');
        }
        const coordResult = CoordinateSchema.safeParse({ lat, lng });
        if (!coordResult.success) {
            throw new ValidationError('Invalid coordinates');
        }
        const now = new Date().toISOString();
        await eventBroker.publish({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type: 'packages.location-updated',
            payload: {
                packageId: id,
                latitude: lat,
                longitude: lng,
            },
            producer: 'package-delivery-service',
            occurredAt: now,
        });
        res.json({ success: true });
    });
    app.post('/v1/packages/:id/deliver', async (req, res) => {
        const { id } = req.params;
        if (!id)
            throw new ValidationError('Package ID required');
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [pkg] = await sql `
      UPDATE packages
      SET status = 'delivered', escrow_status = 'released', updated_at = ${now}
      WHERE id = ${id} AND status IN ('picked_up', 'in_transit')
      RETURNING *
    `;
        if (!pkg)
            throw new NotFoundError('Package not in deliverable state');
        await eventBroker.publish({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type: 'packages.delivered',
            payload: {
                packageId: pkg.id,
                paymentReleased: true,
            },
            producer: 'package-delivery-service',
            occurredAt: now,
        });
        res.json({ package: pkg });
    });
    app.post('/v1/packages/:id/cancel', async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        if (!id)
            throw new ValidationError('Package ID required');
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [pkg] = await sql `
      UPDATE packages
      SET status = 'cancelled', escrow_status = 'refunded', updated_at = ${now}
      WHERE id = ${id} AND status IN ('created', 'assigned')
      RETURNING *
    `;
        if (!pkg)
            throw new NotFoundError('Package not in cancellable state');
        await eventBroker.publish({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type: 'PackageCancelled',
            payload: {
                packageId: pkg.id,
                rideId: pkg.assigned_driver_id,
            },
            producer: 'package-delivery-service',
            occurredAt: now,
        });
        res.json({ package: pkg });
    });
    app.use((error, _req, res, _next) => {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                error: error.message,
                code: error.code,
                context: error.context,
            });
            return;
        }
        logger.error('Unhandled error in package-delivery-service', { err: error });
        res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    });
    return app;
}
async function start() {
    const app = createApp();
    const server = app.listen(config.port, () => {
        console.log(`Package Delivery Service listening on port ${config.port}`);
    });
    const healthServer = startRuntimeHealthServer({
        serviceName: 'package-delivery-service',
        isReady: () => true,
        isHealthy: async () => {
            try {
                await Promise.all([
                    RedisPool.connection.ping(),
                    PostgresPool.connection `SELECT 1`,
                ]);
                return true;
            }
            catch {
                return false;
            }
        },
    });
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down');
        server.close(() => {
            console.log('Server closed');
        });
        await healthServer.close();
        await PostgresPool.disconnect();
        await RedisPool.disconnect();
        process.exit(0);
    });
}
start().catch(err => {
    console.error('Failed to start package-delivery-service:', err);
    process.exit(1);
});
