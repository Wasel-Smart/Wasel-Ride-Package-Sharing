import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import { AppError, ValidationError, NotFoundError, } from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../runtime/http-health';
import { CoordinateSchema } from '@wasel/backend-shared/validation/schemas';
import { logger } from '@wasel/backend-shared/logging/logger';
import { z } from 'zod';
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
const CreatePackageSchema = z.object({
    senderId: z.string().uuid(),
    recipientName: z.string().min(1),
    recipientPhone: z.string().regex(/^\+962\d{9}$/, 'Invalid Jordanian phone number').optional(),
    origin: CoordinateSchema,
    destination: CoordinateSchema,
    priceJod: z.number().positive().optional(),
    notes: z.string().optional(),
});
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
    app.get('/ready', async (_req, res) => {
        const ready = await Promise.all([
            RedisPool.connection.ping().then(() => true).catch(() => false),
            PostgresPool.connection `SELECT 1`.then(() => true).catch(() => false),
        ]).then(results => results.every(Boolean));
        res.json({ status: ready ? 'ready' : 'not_ready' });
    });
    app.get('/metrics', async (_req, res) => {
        res.json({
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    });
    app.post('/v1/packages', async (req, res) => {
        const parsed = CreatePackageSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid package request', { issues: parsed.error.issues });
        }
        const { senderId, recipientName, recipientPhone, origin, destination, priceJod, notes } = parsed.data;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const trackingCode = `PKG-${Math.floor(100000 + Math.random() * 900000)}`;
        const [pkg] = await sql `
      INSERT INTO packages (
        sender_id, recipient_name, recipient_phone,
        origin, destination, status, escrow_status, price_jod, notes,
        created_at, updated_at
      ) VALUES (
        ${senderId}, ${recipientName}, ${recipientPhone ?? null},
        ${JSON.stringify(origin)}, ${JSON.stringify(destination)}, 'created', 'pending', ${priceJod ?? null}, ${notes ?? null},
        ${now}, ${now}
      )
      RETURNING *
    `;
        logger.info({ packageId: pkg.id, trackingCode }, 'Package created');
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
        logger.info({ packageId: pkg.id, driverId }, 'Package assigned');
        res.json({ package: pkg });
    });
    const LocationSchema = z.object({
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
    });
    app.post('/v1/packages/:id/location', async (req, res) => {
        const { id } = req.params;
        const parsed = LocationSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid coordinates', { issues: parsed.error.issues });
        }
        const { lat, lng } = parsed.data;
        const now = new Date().toISOString();
        logger.info({ packageId: id, lat, lng }, 'Package location updated');
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
        logger.info({ packageId: pkg.id }, 'Package delivered');
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
        logger.info({ packageId: pkg.id, reason }, 'Package cancelled');
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
                return await Promise.all([
                    RedisPool.connection.ping().then(() => true).catch(() => false),
                    PostgresPool.connection `SELECT 1`.then(() => true).catch(() => false),
                ]).then(results => results.every(Boolean));
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
