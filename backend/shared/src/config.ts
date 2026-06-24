export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
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
    accessTokenExpirySeconds: number;
    refreshTokenExpirySeconds: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
  };
  stripe: {
    secretKey: string;
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
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
}

export function loadConfig(): AppConfig {
  const required = ['DATABASE_URL', 'REDIS_HOST', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
    database: {
      url: process.env.DATABASE_URL!,
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
      idleTimeoutSeconds: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30', 10),
      connectionTimeoutSeconds: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10', 10),
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '5', 10),
      retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS || '500', 10),
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      accessTokenExpirySeconds: parseInt(process.env.JWT_ACCESS_EXPIRY || '900', 10),
      refreshTokenExpirySeconds: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10),
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
    },
    supabase: {
      url: process.env.SUPABASE_URL || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    },
  };
}

export const config = loadConfig();
