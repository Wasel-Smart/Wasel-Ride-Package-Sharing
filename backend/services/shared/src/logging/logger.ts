import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  service: string;
  env: string;
  level?: LogLevel;
  redact?: string[];
}

export function createLogger(options: LoggerOptions): pino.LoggerOptions {
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
  };
}

export const logger = pino({
  name: 'wasel-backend',
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        }
      : undefined,
  redact: ['password', 'secret', 'token', 'api_key', 'authorization', 'cookie'],
});

export { pino };
