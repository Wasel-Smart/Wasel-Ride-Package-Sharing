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
<<<<<<< HEAD
        redact: sensitiveFields,
=======
        formatter: (log) => {
            return JSON.stringify({
                ...log,
                service: options.service,
                environment: options.env,
                timestamp: new Date().toISOString(),
            });
        },
        redact: (path, _removedValue) => {
            const key = path.join('.');
            return sensitiveFields.some(f => key.toLowerCase().includes(f)) ? '[REDACTED]' : undefined;
        },
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
    };
}
export const logger = pino({
    name: 'wasel-backend',
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
<<<<<<< HEAD
=======
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
        }
        : undefined,
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
    redact: ['password', 'secret', 'token', 'api_key', 'authorization', 'cookie'],
});
export { pino };
