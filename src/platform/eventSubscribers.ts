import { domainEventBus } from './event-bus';
import { notificationsAPI } from '../services/notifications';
import { trackGrowthEvent } from '../services/growthEngine';
import { logger } from '../utils/monitoring';

export function initializeEventSubscribers(): () => void {
  const unsubscribers: Array<() => void> = [];

  unsubscribers.push(
    domainEventBus.subscribe('RideRequested', event => {
      logger.info('Ride requested', { eventId: event.id });
      void trackGrowthEvent({
        eventName: 'ride_requested',
        funnelStage: 'searched',
        serviceType: 'ride',
        metadata: event.payload,
      });
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('RideCompleted', event => {
      logger.info('Ride completed', { eventId: event.id });
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('PackageCreated', event => {
      logger.info('Package created', { eventId: event.id });
      void trackGrowthEvent({
        eventName: 'package_created',
        funnelStage: 'searched',
        serviceType: 'package',
        metadata: event.payload,
      });
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('RideCancelled', event => {
      logger.info('Ride cancelled', { eventId: event.id });
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('PackageCancelled', event => {
      logger.info('Package cancelled', { eventId: event.id });
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('PaymentCaptured', event => {
      logger.info('Payment captured', { eventId: event.id });
    }),
  );

  logger.info('Event subscribers initialized');

  return () => {
    unsubscribers.forEach(unsub => unsub());
    logger.info('Event subscribers cleaned up');
  };
}
