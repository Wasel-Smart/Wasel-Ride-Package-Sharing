import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import { AppError, ValidationError, NotFoundError, } from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../runtime/http-health';
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
    app.get('/ready', async (_req, res) => ({ status: 'ready' }));
    app.get('/metrics', async (_req, res) => ({
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));
    app.get('/v1/:userId/wallet', async (req, res) => {
        const { userId } = req.params;
        const sql = PostgresPool.connection;
        const [wallet] = await sql `
      SELECT * FROM wallets WHERE user_id = ${userId}
    `;
        if (!wallet)
            throw new NotFoundError('Wallet not found');
        res.json({ wallet: { ...wallet, balance: Number(wallet.balance_jod ?? 0) } });
    });
    app.get('/v1/:userId/wallet/transactions', async (req, res) => {
        const { userId } = req.params;
        const sql = PostgresPool.connection;
        const [transactions] = await sql `
      SELECT * FROM transactions
      WHERE wallet_id IN (SELECT wallet_id FROM wallets WHERE user_id = ${userId})
      ORDER BY created_at DESC
      LIMIT 100
    `;
        res.json({ transactions });
    });
    app.get('/v1/:userId/wallet/insights', async (req, res) => {
        const { userId } = req.params;
        const sql = PostgresPool.connection;
        const [insights] = await sql `
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) as total_received,
        COALESCE(SUM(amount) FILTER (WHERE amount < 0), 0) as total_sent,
        COUNT(*) FILTER (WHERE transaction_type = 'top_up') as top_ups,
        COUNT(*) FILTER (WHERE transaction_type = 'payment') as payments
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.wallet_id
      WHERE w.user_id = ${userId}
    `;
        res.json({ insights: insights?.[0] ?? {} });
    });
    const WithdrawSchema = z.object({
        amount: z.number().positive(),
        method: z.enum(['bank_transfer', 'cliq', 'stripe']),
        accountDetails: z.record(z.unknown()).optional(),
    });
    app.post('/v1/:userId/wallet/withdraw', async (req, res) => {
        const { userId } = req.params;
        const parsed = WithdrawSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid withdrawal request', { issues: parsed.error.issues });
        }
        const { amount, method, accountDetails } = parsed.data;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [wallet] = await sql `
      SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
        if (!wallet)
            throw new NotFoundError('Wallet not found');
        if (Number(wallet.balance_jod ?? 0) < amount) {
            throw new ValidationError('Insufficient funds');
        }
        const [tx] = await sql `
      INSERT INTO transactions (wallet_id, amount, currency, transaction_type, status, metadata, created_at, updated_at)
      VALUES (${wallet.wallet_id}, ${-amount}, 'JOD', 'withdrawal', 'pending', ${JSON.stringify({ method, accountDetails })}, ${now}, ${now})
      RETURNING *
    `;
        await sql `
      UPDATE wallets SET balance_jod = balance_jod - ${amount}, updated_at = ${now}
      WHERE wallet_id = ${wallet.wallet_id}
    `;
        res.status(202).json({ withdrawal: tx });
    });
    const SendSchema = z.object({
        toUserId: z.string().uuid(),
        amount: z.number().positive(),
    });
    app.post('/v1/:userId/wallet/send', async (req, res) => {
        const { userId } = req.params;
        const parsed = SendSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid send request', { issues: parsed.error.issues });
        }
        const { toUserId, amount } = parsed.data;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [[fromWallet], [toWallet]] = await Promise.all([
            sql `SELECT wallet_id, balance_jod FROM wallets WHERE user_id = ${userId}`,
            sql `SELECT wallet_id FROM wallets WHERE user_id = ${toUserId}`,
        ]);
        if (!fromWallet)
            throw new NotFoundError('Sender wallet not found');
        if (!toWallet)
            throw new NotFoundError('Recipient wallet not found');
        if (Number(fromWallet.balance_jod ?? 0) < amount) {
            throw new ValidationError('Insufficient funds');
        }
        await sql.begin(async (tx) => {
            await tx `
        INSERT INTO transactions (wallet_id, amount, currency, transaction_type, status, metadata, created_at, updated_at)
        VALUES (${fromWallet.wallet_id}, ${-amount}, 'JOD', 'transfer_out', 'completed', ${JSON.stringify({ to_user_id: toUserId })}, ${now}, ${now})
      `;
            await tx `
        INSERT INTO transactions (wallet_id, amount, currency, transaction_type, status, metadata, created_at, updated_at)
        VALUES (${toWallet.wallet_id}, ${amount}, 'JOD', 'transfer_in', 'completed', ${JSON.stringify({ from_user_id: userId })}, ${now}, ${now})
      `;
            await tx `
        UPDATE wallets SET balance_jod = balance_jod - ${amount}, updated_at = ${now} WHERE wallet_id = ${fromWallet.wallet_id}
      `;
            await tx `
        UPDATE wallets SET balance_jod = balance_jod + ${amount}, updated_at = ${now} WHERE wallet_id = ${toWallet.wallet_id}
      `;
        });
        res.json({ sent: true, amount });
    });
    const PinSchema = z.object({ userId: z.string().uuid(), pin: z.string().length(4) });
    app.post('/v1/:userId/wallet/pin/set', async (req, res) => {
        const { userId } = req.params;
        const parsed = PinSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid PIN', { issues: parsed.error.issues });
        }
        const { pin } = parsed.data;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const pinHash = require('crypto').createHash('sha256').update(pin).digest('hex');
        await sql `
      UPDATE wallets SET pin_hash = ${pinHash}, updated_at = ${now}
      WHERE user_id = ${userId}
    `;
        res.json({ set: true });
    });
    app.post('/v1/:userId/wallet/pin/verify', async (req, res) => {
        const { userId } = req.params;
        const { pin } = req.body;
        if (!pin || pin.length !== 4) {
            throw new ValidationError('Invalid PIN');
        }
        const sql = PostgresPool.connection;
        const [wallet] = await sql `
      SELECT pin_hash FROM wallets WHERE user_id = ${userId}
    `;
        if (!wallet?.pin_hash) {
            return res.json({ valid: false });
        }
        const pinHash = require('crypto').createHash('sha256').update(pin).digest('hex');
        res.json({ valid: pinHash === wallet.pin_hash });
    });
    app.post('/v1/:userId/wallet/auto-topup', async (req, res) => {
        const { userId } = req.params;
        const { enabled, threshold, amount } = req.body;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [wallet] = await sql `
      UPDATE wallets
      SET auto_topup_enabled = ${enabled ?? true}, auto_topup_threshold = ${threshold ?? 10},
          auto_topup_amount = ${amount ?? 20}, updated_at = ${now}
      WHERE user_id = ${userId}
      RETURNING *
    `;
        if (!wallet)
            throw new NotFoundError('Wallet not found');
        res.json({ autoTopUp: { enabled, threshold, amount } });
    });
    app.get('/v1/:userId/wallet/payment-methods', async (req, res) => {
        const { userId } = req.params;
        const [methods] = await PostgresPool.connection `
      SELECT id, type, last4, brand, expiry, is_default FROM payment_methods
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY is_default DESC, created_at DESC
    `;
        res.json({ paymentMethods: methods ?? [] });
    });
    app.post('/v1/:userId/wallet/payment-methods', async (req, res) => {
        const { userId } = req.params;
        const { type, last4, brand, expiry, token } = req.body;
        if (!type || !token) {
            throw new ValidationError('Type and token required');
        }
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [method] = await sql `
      INSERT INTO payment_methods (user_id, type, last4, brand, expiry, provider_token, is_default, created_at, updated_at)
      VALUES (${userId}, ${type}, ${last4}, ${brand}, ${expiry}, ${token}, false, ${now}, ${now})
      RETURNING id, type, last4, brand, expiry, is_default
    `;
        res.status(201).json({ paymentMethod: method });
    });
    app.delete('/v1/payment-methods/:resourceId', async (req, res) => {
        const { resourceId } = req.params;
        await PostgresPool.connection `
      UPDATE payment_methods SET is_active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${resourceId}
    `;
        res.json({ deleted: true });
    });
    app.get('/v1/:userId/wallet/trust-score', async (req, res) => {
        const { userId } = req.params;
        const [[score]] = await PostgresPool.connection `
      SELECT trust_score FROM wallet_trust_scores WHERE user_id = ${userId}
    `;
        res.json({ trustScore: Number(score?.trust_score ?? 0) });
    });
    app.get('/v1/:userId/wallet/rewards', async (req, res) => {
        const { userId } = req.params;
        const [rewards] = await PostgresPool.connection `
      SELECT * FROM rewards WHERE user_id = ${userId} AND claimed_at IS NULL
    `;
        res.json({ rewards: rewards ?? [] });
    });
    app.post('/v1/:userId/wallet/rewards/claim', async (req, res) => {
        const { userId } = req.params;
        const { rewardId } = req.body;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [reward] = await sql `
      UPDATE rewards
      SET claimed_at = ${now}, updated_at = ${now}
      WHERE id = ${rewardId} AND user_id = ${userId} AND claimed_at IS NULL
      RETURNING *
    `;
        if (!reward)
            throw new NotFoundError('Reward not found or already claimed');
        const [wallet] = await sql `
      SELECT wallet_id, balance_jod FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
        if (wallet) {
            await sql `
        UPDATE wallets SET balance_jod = balance_jod + ${reward.value}, updated_at = ${now}
        WHERE wallet_id = ${wallet.wallet_id}
      `;
        }
        res.json({ claimed: true, reward });
    });
    app.get('/v1/:userId/wallet/subscription', async (req, res) => {
        const { userId } = req.params;
        const [subscription] = await PostgresPool.connection `
      SELECT * FROM wallet_subscriptions WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
        res.json({ subscription });
    });
    const TopUpSchema = z.object({
        amount: z.number().positive(),
        paymentMethod: z.enum(['card', 'cliq']),
    });
    app.post('/v1/:userId/wallet/top-up', async (req, res) => {
        const { userId } = req.params;
        const parsed = TopUpSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid top-up request', { issues: parsed.error.issues });
        }
        const { amount, paymentMethod } = parsed.data;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const [tx] = await sql `
      INSERT INTO transactions (wallet_id, amount, currency, transaction_type, status, metadata, created_at, updated_at)
      VALUES ((SELECT wallet_id FROM wallets WHERE user_id = ${userId}), ${amount}, 'JOD', 'top_up', 'pending',
             ${JSON.stringify({ payment_method: paymentMethod, checkout_url: `/wallet/checkout/${transactionId}` })}, ${now}, ${now})
      RETURNING *
    `;
        res.status(202).json({
            payment: {
                transactionId: tx.id,
                provider: paymentMethod,
                status: 'requires_action',
                checkoutUrl: `/wallet/checkout/${transactionId}`,
            },
        });
    });
    app.post('/v1/:userId/wallet/subscribe', async (req, res) => {
        const { userId } = req.params;
        const { planName } = req.body;
        const sql = PostgresPool.connection;
        const now = new Date().toISOString();
        const [subscription] = await sql `
      INSERT INTO wallet_subscriptions (user_id, plan_name, status, created_at, updated_at)
      VALUES (${userId}, ${planName ?? 'Wasel Plus'}, 'requires_action', ${now}, ${now})
      RETURNING *
    `;
        res.status(202).json({
            subscription: {
                ...subscription,
                provider: 'stripe',
                status: 'requires_action',
            },
        });
    });
    app.use((error, _req, res, _next) => {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message, code: error.code });
            return;
        }
        logger.error('Wallet service error', { err: error });
        res.status(500).json({ error: 'Internal server error' });
    });
    return app;
}
async function start() {
    const app = createApp();
    const server = app.listen(config.port, () => {
        console.log(`Wallet Service listening on port ${config.port}`);
    });
    const healthServer = startRuntimeHealthServer({
        serviceName: 'wallet-service',
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
        server.close(() => console.log('Server closed'));
        await healthServer.close();
        await PostgresPool.disconnect();
        await RedisPool.disconnect();
        process.exit(0);
    });
}
start().catch(err => {
    console.error('Failed to start wallet-service:', err);
    process.exit(1);
});
