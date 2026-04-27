import { tripService } from './trip.service';

export const tripController = {
  getCollections(userId?: string) {
    return tripService.getCollections(userId);
  },
};
