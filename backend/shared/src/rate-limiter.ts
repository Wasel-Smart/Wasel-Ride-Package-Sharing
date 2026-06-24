import express, { type Request, type Response, type NextFunction } from 'express';
import { getRedis } from '../redis';
import { RateLimitError } from '../errors/app-errors';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = options;
  const redis = getRedis();

  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.ip}:${req.route?.path || req.path}`;
    try {
      const [count] = await redis.multi().incr(key).pexpire(key, windowMs).exec();
      const requestCount = Number(count);
      if (requestCount > maxRequests) {
        throw new RateLimitError();
      }
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        next(error);
      } else {
        next();
      }
    }
  };
}
