import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ValidationError, UnauthorizedError, ForbiddenError } from '@wasel/backend-shared/errors/app-errors';
const SessionSchema = z.object({
    userId: z.string().uuid(),
    deviceId: z.string().optional(),
    roles: z.array(z.string()).optional(),
});
const CreateSessionSchema = z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string().optional(),
    deviceId: z.string().optional(),
    roles: z.array(z.string()).optional(),
});
export class TokenService {
    redis;
    jwtSecret;
    constructor(redis, jwtSecret) {
        this.redis = redis;
        this.jwtSecret = jwtSecret;
    }
    async createTokens(userId, email, roles = []) {
        const tokenFamily = `tf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const accessToken = jwt.sign({ userId, email, roles, tokenFamily, type: 'access' }, this.jwtSecret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId, email, roles, tokenFamily, type: 'refresh' }, this.jwtSecret, { expiresIn: '7d' });
        await this.redis.setex(`refresh:${tokenFamily}`, 7 * 24 * 60 * 60, JSON.stringify({ userId, email, roles }));
        return { accessToken, refreshToken, tokenFamily };
    }
    async refreshAccessToken(refreshToken) {
        const payload = jwt.verify(refreshToken, this.jwtSecret);
        if (payload.type !== 'refresh' || !payload.tokenFamily) {
            throw new UnauthorizedError('Invalid refresh token');
        }
        const stored = await this.redis.get(`refresh:${payload.tokenFamily}`);
        if (!stored) {
            await this.revokeTokenFamily(payload.tokenFamily);
            throw new ForbiddenError('Refresh token revoked');
        }
        const newTokens = await this.createTokens(payload.userId, payload.email, payload.roles);
        await this.revokeTokenFamily(payload.tokenFamily);
        return newTokens;
    }
    async revokeTokenFamily(tokenFamily) {
        await this.redis.sadd('revoked_families', tokenFamily);
        await this.redis.del(`refresh:${tokenFamily}`);
    }
    async isTokenFamilyRevoked(tokenFamily) {
        const exists = await this.redis.sismember('revoked_families', tokenFamily);
        return exists === 1;
    }
    async invalidateAllUserSessions(userId) {
        const tokenFamilies = await this.redis.keys(`refresh:*`);
        for (const key of tokenFamilies) {
            const data = await this.redis.get(key);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.userId === userId) {
                    const family = key.replace('refresh:', '');
                    await this.revokeTokenFamily(family);
                }
            }
        }
    }
}
export function createAuthRouter(redis, jwtSecret) {
    const router = Router();
    const tokenService = new TokenService(redis, jwtSecret);
    router.post('/session', async (req, res) => {
        const parsed = CreateSessionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid session request', { issues: parsed.error.issues });
        }
        const { userId, email, name, deviceId, roles } = parsed.data;
        const tokens = await tokenService.createTokens(userId, email, roles);
        await redis.sadd(`sessions:${userId}`, `${deviceId ?? 'default'}-${tokens.tokenFamily}`);
        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: userId, email, name, roles },
        });
    });
    router.post('/session/refresh', async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken || typeof refreshToken !== 'string') {
            throw new ValidationError('Refresh token required');
        }
        const tokens = await tokenService.refreshAccessToken(refreshToken);
        const payload = jwt.decode(refreshToken);
        await redis.sadd(`sessions:${payload.userId}`, `${payload.deviceId ?? 'default'}-${tokens.tokenFamily}`);
        res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    });
    router.post('/session/revoke', async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new ValidationError('Refresh token required');
        }
        const payload = jwt.verify(refreshToken, jwtSecret);
        if (payload.tokenFamily) {
            await tokenService.revokeTokenFamily(payload.tokenFamily);
        }
        res.json({ revoked: true });
    });
    return router;
}
