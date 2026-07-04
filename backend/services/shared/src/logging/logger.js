import pino from 'pino';
export function createLogger(options) {
    const sensitiveFields = [
        'password',
        'secret',
        'token',
        'api_key',
        'apikey',
        'authorization',
        'cookie',
        'x-api-key',
        ...(options.redact ?? []),
    ];
    return {
        name: options.service,
        level: options.level ?? (options.env === 'production' ? 'info' : 'debug'),
        redact: sensitiveFields,
    };
}
export const logger = pino({
    name: 'wasel-backend',
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: ['password', 'secret', 'token', 'api_key', 'authorization', 'cookie'],
});
export { pino };
