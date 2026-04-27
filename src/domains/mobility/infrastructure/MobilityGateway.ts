import { tripsAPI, type TripCreatePayload, type TripUpdatePayload } from '@/services/trips';

export class MobilityGateway {
  createTrip(payload: TripCreatePayload) {
    return tripsAPI.createTrip(payload);
  }

  getTripById(tripId: string) {
    return tripsAPI.getTripById(tripId);
  }

  publishTrip(tripId: string) {
    return tripsAPI.publishTrip(tripId);
  }

  searchTrips(...args: Parameters<typeof tripsAPI.searchTrips>) {
    return tripsAPI.searchTrips(...args);
  }

  updateTrip(tripId: string, updates: TripUpdatePayload) {
    return tripsAPI.updateTrip(tripId, updates);
  }
}
