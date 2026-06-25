import postgres, { type Sql } from 'postgres';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // @ts-ignore - pino transport option for pretty printing in dev
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

class DbPool {
  private static instance: Sql | null = null;
  static get connection(): Sql {
    if (!DbPool.instance) {
      DbPool.instance = postgres(process.env.DATABASE_URL!, {
        max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
        idle_timeout: (parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30', 10)) * 1000,
        connect_timeout: (parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10', 10)) * 1000,
        prepare: true,
      });
    }
    return DbPool.instance;
  }
  static async disconnect(): Promise<void> {
    if (DbPool.instance) {
      await DbPool.instance.end();
      DbPool.instance = null;
    }
  }
}

export function getDb(): Sql {
  return DbPool.connection;
}

export { logger };

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', public readonly cause?: Error) {
    super(500, 'INTERNAL_ERROR', message, false);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(400, 'VALIDATION_ERROR', message);
  }
}