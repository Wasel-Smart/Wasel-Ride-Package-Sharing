import { startRuntimeHealthServer } from '../runtime/http-health.js';
import { loadConfig } from '../shared/src/config/app.config.js';
import { createEventBroker } from '../shared/src/events.js';
import { RideMatchingService } from './service-production.js';
import { logger } from '../shared/src/logging/logger.js';

const config = loadConfig();
const eventBroker = createEventBroker();

const healthServer = startRuntimeHealthServer({
  serviceName: 'ride-matching-service',
  isReady: () => true,
  isHealthy: () => true,
});

const service = new RideMatchingService({
  eventBroker: {
    subscribe: eventBroker.subscribe.bind(eventBroker),
    publish: eventBroker.publish.bind(eventBroker),
    disconnect: eventBroker.disconnect.bind(eventBroker),
  },
  healthServer,
  validateInput: (_event: { payload: unknown }) => {},
  getSystemState: () => true,
  setSystemState: (_state: boolean) => {},
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down');
  await service.stop();
  await eventBroker.disconnect();
  process.exit(0);
});

service.start().catch(err => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
