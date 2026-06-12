import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  redact: {
    paths: ['password', 'secret', 'token', 'apiKey', 'authorization', 'DATABASE_URL', 'STRIPE_SECRET_KEY'],
    censor: '[REDACTED]',
  },
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});

export type Logger = pino.Logger;

export function getLogger(component?: string): Logger {
  return component ? logger.child({ component }) : logger;
}

export function createLogger(component: string): Logger {
  return getLogger(component);
}

export default logger;