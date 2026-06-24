import postgres from 'postgres';
import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
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
    static instance = null;
    static get connection() {
        if (!DbPool.instance) {
            DbPool.instance = postgres(process.env.DATABASE_URL, {
                max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
                idle_timeout: (parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30', 10)) * 1000,
                connect_timeout: (parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10', 10)) * 1000,
                prepare: true,
            });
        }
        return DbPool.instance;
    }
    static async disconnect() {
        if (DbPool.instance) {
            await DbPool.instance.end();
            DbPool.instance = null;
        }
    }
}
export function getDb() {
    return DbPool.connection;
}
export { logger };
export class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(statusCode, code, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(resource) {
        super(404, 'NOT_FOUND', `${resource} not found`);
    }
}
export class InternalError extends AppError {
    cause;
    constructor(message = 'Internal server error', cause) {
        super(500, 'INTERNAL_ERROR', message, false);
        this.cause = cause;
    }
}
export class ValidationError extends AppError {
    details;
    constructor(message, details) {
        super(400, 'VALIDATION_ERROR', message);
        this.details = details;
    }
}
