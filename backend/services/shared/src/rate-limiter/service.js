const DEFAULT_KEY_PREFIX = 'ratelimit';
export class RateLimiterService {
    redis;
    windowMs;
    maxRequests;
    keyPrefix;
    constructor(redis, config) {
        this.redis = redis;
        this.windowMs = config.windowMs;
        this.maxRequests = config.maxRequests;
        this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    }
    async check(key) {
        const redisKey = `${this.keyPrefix}:${key}`;
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const result = await this.redis.multi()
            .zremrangebyscore(redisKey, '-inf', String(windowStart))
            .zcard(redisKey)
            .zadd(redisKey, now, `${now}-${Math.random().toString(36).slice(2)}`)
            .expire(redisKey, Math.ceil(this.windowMs / 1000))
            .exec();
        const count = result[1][1];
        const allowed = count <= this.maxRequests;
        const remaining = Math.max(0, this.maxRequests - count);
        const resetAt = new Date(now + this.windowMs);
        return {
            allowed,
            remaining,
            resetAt,
            retryAfterMs: allowed ? undefined : this.windowMs,
        };
    }
    async consume(key) {
        const redisKey = `${this.keyPrefix}:${key}`;
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const result = await this.redis.multi()
            .zremrangebyscore(redisKey, '-inf', String(windowStart))
            .zcard(redisKey)
            .zadd(redisKey, now, `${now}-${Math.random().toString(36).slice(2)}`)
            .expire(redisKey, Math.ceil(this.windowMs / 1000))
            .exec();
        const count = result[1][1] + 1;
        const allowed = count <= this.maxRequests;
        const remaining = Math.max(0, this.maxRequests - count);
        const resetAt = new Date(now + this.windowMs);
        return {
            allowed,
            remaining,
            resetAt,
            retryAfterMs: allowed ? undefined : this.windowMs,
        };
    }
    async reset(key) {
        const redisKey = `${this.keyPrefix}:${key}`;
        await this.redis.del(redisKey);
    }
    getConfig() {
        return {
            windowMs: this.windowMs,
            maxRequests: this.maxRequests,
            keyPrefix: this.keyPrefix,
        };
    }
}
export function createRateLimiterService(redis, config) {
    return new RateLimiterService(redis, config);
}
