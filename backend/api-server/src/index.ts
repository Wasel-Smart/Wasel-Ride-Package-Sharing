import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';

import routes from './routes/index.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173', 'http://localhost:8080'], credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use((pinoHttp as any)({ logger }));

  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/v1', limiter);

  app.use('/health', (_req: express.Request, res: express.Response) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1' }));

  app.use('/v1', routes);

  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ success: false, error: { code: 'not_found', message: 'Endpoint not found' }, metadata: { timestamp: new Date().toISOString(), version: 'v1' } });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err instanceof Error && 'statusCode' in err ? (err as unknown as { statusCode: number }).statusCode : 500;
    const code = err instanceof Error && 'code' in err ? (err as unknown as { code: string }).code : 'internal_error';
    const message = err instanceof Error && 'message' in err ? (err as Error).message : 'Internal server error';

    res.status(status).json({
      success: false,
      error: { code, message },
      metadata: { timestamp: new Date().toISOString(), version: 'v1' },
    });
  });

  return app;
}

const app = createApp();

const port = parseInt(process.env.PORT ?? '8080', 10);

app.listen(port, () => {
  logger.info({ port, nodeEnv: process.env.NODE_ENV ?? 'development' }, 'API server started');
});

export default app;
