import { createRateLimiterService, type RateLimitConfig, type RateLimitResult } from './service';

export { createRateLimiterService, type RateLimitConfig, type RateLimitResult };

import type { Request, Response, NextFunction } from 'express';
import type Redis from 'ioredis';

export function createRateLimitMiddleware(redis: Redis, config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.method}:${req.path}`;
    const limiter = createRateLimiterService(redis, config);
    
    limiter.check(key).then(result => {
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt.getTime() / 1000)));
      
      if (!result.allowed && result.retryAfterMs) {
        res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
      }
      
      if (result.allowed) {
        next();
      } else {
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
          meta: { timestamp: new Date().toISOString(), retryAfterMs: result.retryAfterMs },
        });
      }
    }).catch(next);
  };
}