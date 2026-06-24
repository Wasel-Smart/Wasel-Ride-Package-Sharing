import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from '@wasel/backend-shared/logging/logger';
import { config } from '@wasel/backend-shared/config';
import authenticate from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import tripRoutes from './routes/v1/trips.js';
import packageRoutes from './routes/v1/packages.js';
import busRoutes from './routes/v1/bus.js';
import walletRoutes from './routes/v1/wallet.js';
import ratingRoutes from './routes/v1/ratings.js';
import notificationRoutes from './routes/v1/notifications.js';
import driverRoutes from './routes/v1/driver.js';
import adminRoutes from './routes/v1/admin.js';
import corporateRoutes from './routes/v1/corporate.js';

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
    keyGenerator: (req) => req.ip || 'unknown',
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
  app.use('/v1/driver', driverRoutes);
  app.use('/v1/admin', adminRoutes);
  app.use('/v1/corporate', corporateRoutes);

  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'not_found', message: 'Endpoint not found' },
      meta: { timestamp: new Date().toISOString() },
    });
  });

  app.use(errorHandler as express.ErrorRequestHandler);

  return app;
}

const app = createApp();

const port = config.port;

app.listen(port, () => {
  logger.info({ port, nodeEnv: config.nodeEnv }, 'API gateway started');
});

export default app;
