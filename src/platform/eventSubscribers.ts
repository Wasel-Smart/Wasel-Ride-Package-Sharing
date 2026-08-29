import { domainEventBus } from './event-bus';
import { logger } from '../utils/monitoring';
import { supabase } from '../utils/supabase/client';

export function initializeEventSubscribers(): () => void {
  const unsubscribers: Array<() => void> = [];

  unsubscribers.push(
    domainEventBus.subscribe('RideRequested', event => {
      logger.info('Ride requested', { eventId: event.id });
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('RideCompleted', async event => {
      logger.info('Ride completed', { eventId: event.id });
      const payload = event.payload as { rideId?: string; bookingId?: string } | undefined;
      if (payload?.rideId && supabase) {
        try {
          const { data: trip } = await supabase
            .from('trips')
            .select('driver_id')
            .eq('trip_id', payload.rideId)
            .maybeSingle();

          if (trip?.driver_id) {
            await supabase
              .from('drivers')
              .update({ driver_status: 'cooldown' })
              .eq('driver_id', trip.driver_id);
          }
        } catch {
          // Non-fatal: driver status update failure should not block the subscriber.
        }
      }
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('RideCancelled', async event => {
      logger.info('Ride cancelled', { eventId: event.id });
      const payload = event.payload as { rideId?: string; bookingId?: string } | undefined;
      if (payload?.rideId && supabase) {
        try {
          const { data: trip } = await supabase
            .from('trips')
            .select('driver_id')
            .eq('trip_id', payload.rideId)
            .maybeSingle();

          if (trip?.driver_id) {
            await supabase
              .from('drivers')
              .update({ driver_status: 'available' })
              .eq('driver_id', trip.driver_id);
          }
        } catch {
          // Non-fatal: driver status update failure should not block the subscriber.
        }
      }
    }),
  );

  unsubscribers.push(
    domainEventBus.subscribe('PackageCreated', event => {
      logger.info('Package created', { eventId: event.id });
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
