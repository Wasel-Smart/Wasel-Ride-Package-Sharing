import {
  createBusBooking,
  fetchBusRoutes,
  type BusBookingPayload,
} from '../../services/bus';
import { isCoreFeatureEnabled } from '../../features/core/featureFlags';
import { routeEndpointsAreDistinct, routeMatchesLocationPair } from '../../utils/jordanLocations';
import { buildBusRouteInfo } from './bus.copy';
import type { BusRoute, BusSearchDraft } from './bus.types';

function isExactRoute(route: BusRoute, from: string, to: string) {
  return routeMatchesLocationPair(route.from, route.to, from, to, { allowReverse: false });
}

export const busService = {
  getFallbackRoutes() {
    return [];
  },

  async searchRoutes(
    draft: BusSearchDraft,
  ): Promise<{ routes: BusRoute[]; info: ReturnType<typeof buildBusRouteInfo> | null; error: string | null }> {
    if (!isCoreFeatureEnabled('bus')) {
      return {
        routes: [],
        info: buildBusRouteInfo('unavailable'),
        error: 'Bus service is unavailable.',
      };
    }

    if (!routeEndpointsAreDistinct(draft.from, draft.to)) {
      return {
        routes: [],
        info: buildBusRouteInfo('validation'),
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
      if (exactLiveRoutes.length > 0 || liveRoutes.length > 0) {
        const routes = exactLiveRoutes.length ? exactLiveRoutes : liveRoutes;
        return {
          routes,
          info: buildBusRouteInfo('live'),
          error: null,
        };
      }

      return {
        routes: [],
        info: buildBusRouteInfo('unavailable'),
        error: 'Bus service is unavailable.',
      };
    } catch {
      return {
        routes: [],
        info: buildBusRouteInfo('unavailable'),
        error: 'Bus service is unavailable.',
      };
    }
  },

  createBooking(payload: BusBookingPayload) {
    return createBusBooking(payload);
  },
};
