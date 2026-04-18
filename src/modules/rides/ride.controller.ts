import { RIDE_BOOKINGS_CHANGED_EVENT } from '../../services/rideLifecycle';
import { routeEndpointsAreDistinct } from '../../utils/jordanLocations';
import { rideService } from './ride.service';
import type {
  RideLocationField,
  RideRequestPayload,
  RideRequestResult,
  RideResult,
  RideSearchDraft,
  RideSuggestion,
  RideValidationState,
} from './ride.types';

interface RideValidationMessages {
  from?: string;
  to?: string;
  distinctRoute?: string;
  date?: string;
}

interface RideSuggestionMessages {
  liveCorridor: (count: number) => string;
  recentSearch: string;
  cityPickup: string;
  regionalCorridor: string;
}

function validateDraft(
  draft: RideSearchDraft,
  messages: RideValidationMessages = {},
): RideValidationState {
  const validation: RideValidationState = {};

  if (!draft.from.trim()) validation.from = messages.from ?? 'Choose a pickup location.';
  if (!draft.to.trim()) validation.to = messages.to ?? 'Choose a destination.';
  if (draft.from.trim() && draft.to.trim() && !routeEndpointsAreDistinct(draft.from, draft.to)) {
    validation.to = messages.distinctRoute ?? 'Pickup and destination must be different.';
  }
  if (draft.mode === 'schedule' && !draft.date) {
    validation.date = messages.date ?? 'Choose a scheduled date.';
  }

  return validation;
}

export const rideController = {
  validateDraft,

  async search(
    draft: RideSearchDraft,
    messages?: RideValidationMessages,
  ): Promise<{ results: RideResult[]; recommendedRideId?: string }> {
    const validation = validateDraft(draft, messages);
    if (Object.values(validation).some(Boolean)) {
      throw new Error(Object.values(validation).find(Boolean) ?? 'Search validation failed.');
    }

    const results = await rideService.searchRides({
      from: draft.from,
      to: draft.to,
      date: draft.mode === 'schedule' ? draft.date : undefined,
      seats: 1,
      rideType: draft.rideType,
    });

    rideService.rememberRecentSearch(draft.from, draft.to);

    return {
      results,
      recommendedRideId: rideService.getRecommendedRideId(results),
    };
  },

  async getSuggestions(
    field: RideLocationField,
    query: string,
    draft: RideSearchDraft,
    messages?: RideSuggestionMessages,
  ): Promise<RideSuggestion[]> {
    return rideService.getLocationSuggestions(query, {
      exclude: field === 'from' ? draft.to : draft.from,
      counterpart: field === 'from' ? draft.to : draft.from,
      field,
      messages,
    });
  },

  autoDetectOrigin() {
    return rideService.detectOrigin();
  },

  submitRideRequest(payload: RideRequestPayload): Promise<RideRequestResult> {
    return rideService.createRideRequest(payload);
  },

  hydrateRequests(passengerId: string, rideIds?: string[]) {
    return rideService.hydrateRideRequests(passengerId, rideIds);
  },

  getRequestIndex(rideIds?: string[]) {
    return rideService.getRideRequestsIndex(rideIds);
  },

  getRequestStatus(rideId: string) {
    return rideService.getActiveRideRequest(rideId);
  },

  subscribeToRequestStatus(rideId: string, onChange: () => void) {
    const handler = () => {
      if (rideService.getActiveRideRequest(rideId)) {
        onChange();
      }
    };

    window.addEventListener(RIDE_BOOKINGS_CHANGED_EVENT, handler);

    return () => {
      window.removeEventListener(RIDE_BOOKINGS_CHANGED_EVENT, handler);
    };
  },
};
