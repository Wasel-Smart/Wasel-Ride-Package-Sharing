import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from '@wasel/backend-shared/logging/logger';
import { config } from '@wasel/backend-shared/config';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errors';
import tripRoutes from './routes/v1/trips';
import packageRoutes from './routes/v1/packages';
import busRoutes from './routes/v1/bus';
import walletRoutes from './routes/v1/wallet';
import ratingRoutes from './routes/v1/ratings';
import notificationRoutes from './routes/v1/notifications';
import adminRoutes from './routes/v1/admin';
import corporateRoutes from './routes/v1/corporate';

function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: config.cors.credentials }));
  app.use(express.json({ limit: '1mb' }));
  app.use((pinoHttp as unknown as express.RequestHandler)({ logger }));

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
  });

  app.use('/v1', limiter);

  app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1' });
  });

  app.get('/ready', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  });

  app.use('/v1', authenticate);

  app.use('/v1/trips', tripRoutes);
  app.use('/v1/packages', packageRoutes);
  app.use('/v1/bus', busRoutes);
  app.use('/v1/wallet', walletRoutes);
  app.use('/v1/ratings', ratingRoutes);
  app.use('/v1/notifications', notificationRoutes);
  app.use('/v1/admin', adminRoutes);
  app.use('/v1/corporate', corporateRoutes);

  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'not_found', message: 'Endpoint not found' },
      meta: { timestamp: new Date().toISOString() },
    });
  });

  app.use(errorHandler);

  return app;
}

const app = createApp();

const port = config.port;

app.listen(port, () => {
  logger.info({ port, nodeEnv: config.nodeEnv }, 'API gateway started');
});

export default app;
