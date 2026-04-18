import {
  createBusBooking,
  fetchBusRoutes,
  getOfficialBusRoutes,
  type BusBookingPayload,
} from '../../services/bus';
import { routeEndpointsAreDistinct, routeMatchesLocationPair } from '../../utils/jordanLocations';
import type { BusRoute, BusSearchDraft } from './bus.types';

function isExactRoute(route: BusRoute, from: string, to: string) {
  return routeMatchesLocationPair(route.from, route.to, from, to, { allowReverse: false });
}

export const busService = {
  getFallbackRoutes(draft: Pick<BusSearchDraft, 'from' | 'to' | 'seats'>) {
    return getOfficialBusRoutes({ from: draft.from, to: draft.to, seats: draft.seats });
  },

  async searchRoutes(
    draft: BusSearchDraft,
  ): Promise<{ routes: BusRoute[]; info: string | null; error: string | null }> {
    const fallbackRoutes = getOfficialBusRoutes({
      from: draft.from,
      to: draft.to,
      seats: draft.seats,
    });

    if (!routeEndpointsAreDistinct(draft.from, draft.to)) {
      return {
        routes: fallbackRoutes,
        info: 'Choose two different locations to preview the right coach corridor.',
        error: null,
      };
    }

    try {
      const liveRoutes = await fetchBusRoutes({
        from: draft.from,
        to: draft.to,
        date: draft.date,
        seats: draft.seats,
      });

      const exactLiveRoutes = liveRoutes.filter(route => isExactRoute(route, draft.from, draft.to));
      const routes = exactLiveRoutes.length ? exactLiveRoutes : liveRoutes;

      if (routes.length > 0) {
        return {
          routes,
          info:
            routes[0]?.dataSource === 'live'
              ? 'Live bus inventory is synced for this corridor.'
              : `Showing official Jordan schedule data verified on ${routes[0]?.lastVerifiedAt ?? draft.date}.`,
          error: null,
        };
      }

      return {
        routes: fallbackRoutes,
        info: fallbackRoutes.some(route => isExactRoute(route, draft.from, draft.to))
          ? `Showing official Jordan schedules verified on ${fallbackRoutes[0]?.lastVerifiedAt ?? draft.date}.`
          : 'No exact coach found yet. Showing the closest official corridors.',
        error: null,
      };
    } catch {
      return {
        routes: fallbackRoutes,
        info: `Live route API is unavailable. Showing official Jordan schedules verified on ${fallbackRoutes[0]?.lastVerifiedAt ?? draft.date}.`,
        error: null,
      };
    }
  },

  createBooking(payload: BusBookingPayload) {
    return createBusBooking(payload);
  },
};
