export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
    maxConnections: number;
    idleTimeoutSeconds: number;
    connectionTimeoutSeconds: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    tls: boolean;
    maxRetries: number;
    retryDelayMs: number;
  };
  jwt: {
    secret: string;
  };
  stripe: {
    secretKey: string;
    apiVersion: string;
    webhookSecret: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  sendgrid: {
    apiKey: string;
    fromEmail: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  health: {
    checkDb: boolean;
    checkRedis: boolean;
    checkExternal: boolean;
  };
}

export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const corsOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:8080'];

  const healthCheckDb = process.env.HEALTH_CHECK_DB !== 'false';
  const healthCheckRedis = process.env.HEALTH_CHECK_REDIS !== 'false';
  const healthCheckExternal = process.env.HEALTH_CHECK_EXTERNAL === 'true';

  return {
    nodeEnv,
    port: parseInt(process.env.PORT ?? '8080', 10),
    database: {
      url: databaseUrl,
      maxConnections: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      idleTimeoutSeconds: parseInt(process.env.DB_POOL_IDLE ?? '20', 10),
      connectionTimeoutSeconds: parseInt(process.env.DB_POOL_TIMEOUT ?? '10', 10),
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES ?? '10', 10),
      retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS ?? '1000', 10),
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? 'default-secret',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      apiVersion: process.env.STRIPE_API_VERSION ?? '2026-02-25.clover',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY ?? '',
      fromEmail: process.env.SENDGRID_FROM_EMAIL ?? '',
    },
    cors: {
      origin: corsOrigins,
      credentials: process.env.CORS_CREDENTIALS !== 'false',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    },
    health: {
      checkDb: healthCheckDb,
      checkRedis: healthCheckRedis,
      checkExternal: healthCheckExternal,
    },
  };
}
