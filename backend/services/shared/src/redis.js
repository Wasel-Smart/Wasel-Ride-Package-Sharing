import Redis from 'ioredis';
import { loadConfig } from './config/app.config.js';
const config = loadConfig();
let redisInstance = null;
export function getRedis() {
    if (!redisInstance) {
        // @ts-ignore - ioredis types may not include maxRetries in older versions
        redisInstance = new Redis({
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
    return redisInstance;
}
export async function disconnectRedis() {
    if (redisInstance) {
        await redisInstance.quit();
        redisInstance = null;
    }
}
