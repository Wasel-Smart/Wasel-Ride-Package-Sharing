const DEFAULT_KEY_PREFIX = 'ratelimit';
export class RateLimiterService {
    windowMs;
    maxRequests;
    keyPrefix;
    constructor(config) {
        this.windowMs = config.windowMs;
        this.maxRequests = config.maxRequests;
        this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    }
    async check(key) {
        return {
            allowed: true,
            remaining: this.maxRequests - 1,
            resetAt: new Date(Date.now() + this.windowMs),
        };
    }
    async consume(key) {
        return this.check(key);
    }
    async reset(key) {
        return;
    }
    getConfig() {
        return {
            windowMs: this.windowMs,
            maxRequests: this.maxRequests,
            keyPrefix: this.keyPrefix,
        };
    }
}
export function createRateLimiterService(config) {
    return new RateLimiterService(config);
}
