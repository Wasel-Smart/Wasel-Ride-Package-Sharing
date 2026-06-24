import Redis from 'ioredis';
import { config } from './config';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
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
    } as RedisOptions);
  }
  return redisInstance;
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
