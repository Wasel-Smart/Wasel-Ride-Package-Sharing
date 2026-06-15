import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import pino from 'pino';
import pinoPretty from 'pino-pretty';

import { loadConfig } from '../services/shared/src/config/app.config.js';
import { logger, createLogger, LogLevel } from '../services/shared/src/logging/logger.js';
import { AppError, NotFoundError } from '../services/shared/src/errors/app-errors.js';

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({
    logger: {
      level: (process.env.LOG_LEVEL ?? 'info') as LogLevel,
      transport:
        config.nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
          : undefined,
    },
    trustProxy: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-RANDOM_NONCE'"],
        styleSrc: ["'self'", "'nonce-RANDOM_NONCE'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  await app.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: true,
    keyGenerator: (request) =>
      request.headers['x-forwarded-for']?.toString() ??
      request.connection.remoteAddress ??
      'unknown',
  });

  if (process.env.JWT_SECRET) {
    await app.register(jwt, {
      secret: process.env.JWT_SECRET,
      sign: { expiresIn: '1h' },
    });
  }

  app.setErrorHandler((err, request, reply) => {
    app.log.error(err);

    const statusCode = err.statusCode ?? 500;
    const isOperational = (err as any).isOperational ?? false;

    const payload: Record<string, unknown> = {
      error: {
        code: (err as any).code ?? 'INTERNAL_ERROR',
        message:
          config.nodeEnv === 'production' && !isOperational
            ? 'Internal server error'
            : err.message,
      },
    };

    if (process.env.NODE_ENV !== 'production' && err.stack) {
      (payload as any).stack = err.stack;
    }

    if (err instanceof AppError && err.context) {
      (payload.error as any).context = err.context;
    }

    reply.status(statusCode).send(payload);
  });

  app.addHook('onRequest', async (request) => {
    request.log = request.log.child({
      requestId: request.headers['x-request-id']?.toString() ?? crypto.randomUUID(),
      ip: request.headers['x-forwarded-for']?.toString() ?? request.connection.remoteAddress,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    });
  });

  app.get('/health', async (_request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number }> = {
      api: { status: 'up' },
    };

    if (config.health.checkDb) {
      const start = Date.now();
      try {
        // TODO: wire actual DB health probe
        checks.database = { status: 'up', latencyMs: Date.now() - start };
      } catch (dbErr) {
        checks.database = { status: 'down' };
        return reply.status(503).send({ status: 'unhealthy', checks, timestamp: new Date().toISOString() });
      }
    }

    return { status: 'healthy', checks, timestamp: new Date().toISOString() };
  });

  app.get('/ready', async (_request, reply) => {
    return { status: 'ready', timestamp: new Date().toISOString() };
  });

  app.get('/metrics', async (_request, reply) => {
    reply.type('text/plain; version=0.0.4');
    return `
# HELP wasel_http_requests_total Total HTTP requests
# TYPE wasel_http_requests_total counter
wasel_http_requests_total{method="GET",code="200"} ${{
  /* populated by prometheus client in production */ }}
# HELP wasel_http_request_duration_seconds Request duration in seconds
# TYPE wasel_http_request_duration_seconds histogram
`.trim();
  });

  app.get('/', async (_request) => ({
    name: 'Wasel API Server',
    version: '2.0.0',
    environment: config.nodeEnv,
    docs: '/docs',
  }));

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  return app;
}
