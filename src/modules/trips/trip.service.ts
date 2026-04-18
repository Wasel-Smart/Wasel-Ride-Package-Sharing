import { getStoredBusBookings } from '../../services/bus';
import { getConnectedPackages } from '../../services/journeyLogistics';
import { syncRideBookingCompletion } from '../../services/rideLifecycle';
import { getSupportTickets, hydrateSupportTickets } from '../../services/supportInbox';
import type { TripCollections } from './trip.types';

export const tripService = {
  async getCollections(userId?: string): Promise<TripCollections> {
    const supportTickets = userId
      ? await hydrateSupportTickets(userId).then(tickets => tickets.slice(0, 5))
      : getSupportTickets().slice(0, 5);

    return {
      rides: syncRideBookingCompletion(),
      packages: getConnectedPackages(),
      buses: getStoredBusBookings(),
      supportTickets,
    };
  },
};
