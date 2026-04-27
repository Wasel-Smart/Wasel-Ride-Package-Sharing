import { busService } from './bus.service';
import type { BusBookingPayload, BusSearchDraft } from './bus.types';

export const busController = {
  searchRoutes(draft: BusSearchDraft) {
    return busService.searchRoutes(draft);
  },

  createBooking(payload: BusBookingPayload) {
    return busService.createBooking(payload);
  },
};
