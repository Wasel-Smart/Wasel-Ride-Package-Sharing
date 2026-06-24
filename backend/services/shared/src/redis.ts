import Redis from 'ioredis';
import { loadConfig } from './config/app.config.js';

const config = loadConfig();

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    // @ts-ignore - ioredis types may not include maxRetries in older versions
    redisInstance = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      tls: config.redis.tls ? {} : undefined,
      maxRetries: config.redis.maxRetries,
      retryStrategy: (times: number) => {
        if (times > config.redis.maxRetries) return null;
        return Math.min(times * config.redis.retryDelayMs, 5000);
      },
    });
  }
  return redisInstance;
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
