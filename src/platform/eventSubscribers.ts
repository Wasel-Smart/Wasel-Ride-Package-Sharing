import { domainEventBus } from './event-bus';
import { notificationsAPI } from '../services/notifications';
import { trackGrowthEvent } from '../services/growthEngine';
import { logger } from '../utils/monitoring';

export function initializeEventSubscribers(): () => void {
  const unsubscribers: Array<() => void> = [];

  unsubscribers.push(
    domainEventBus.subscribe('RideRequested', (event) => {
      logger.info('Ride requested', { eventId: event.id });
      void trackGrowthEvent({
        eventName: 'ride_requested',
        funnelStage: 'searched',
        serviceType: 'ride',
        metadata: event.payload,
      });
    })
  );

  unsubscribers.push(
    domainEventBus.subscribe('RideAccepted', (event) => {
      logger.info('Ride accepted', { eventId: event.id });
      void notificationsAPI.createNotification({
        title: 'Ride Confirmed',
        message: 'Your ride has been confirmed.',
        type: 'booking',
        priority: 'high',
        action_url: '/app/my-trips?tab=rides',
      }).catch(() => {});
    })
  );

  unsubscribers.push(
    domainEventBus.subscribe('RideCompleted', (event) => {
      logger.info('Ride completed', { eventId: event.id });
      void notificationsAPI.createNotification({
        title: 'Ride Completed',
        message: 'Please rate your experience.',
        type: 'booking',
        priority: 'medium',
        action_url: '/app/my-trips?tab=rides',
      }).catch(() => {});
    })
  );

  unsubscribers.push(
    domainEventBus.subscribe('PackageCreated', (event) => {
      logger.info('Package created', { eventId: event.id });
      void trackGrowthEvent({
        eventName: 'package_created',
        funnelStage: 'searched',
        serviceType: 'package',
        metadata: event.payload,
      });
    })
  );

  unsubscribers.push(
    domainEventBus.subscribe('PackageDelivered', (event) => {
      logger.info('Package delivered', { eventId: event.id });
      void notificationsAPI.createNotification({
        title: 'Package Delivered',
        message: 'Your package has been delivered successfully.',
        type: 'booking',
        priority: 'high',
      }).catch(() => {});
    })
  );

  logger.info('Event subscribers initialized');

  return () => {
    unsubscribers.forEach(unsub => unsub());
    logger.info('Event subscribers cleaned up');
  };
}
