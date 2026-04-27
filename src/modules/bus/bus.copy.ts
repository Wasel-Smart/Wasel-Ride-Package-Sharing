export type BusRouteInfoKind =
  | 'validation'
  | 'live'
  | 'unavailable';

export interface BusRouteInfo {
  kind: BusRouteInfoKind;
  message: string;
}

export const BUS_TEST_IDS = {
  bookingConfirmation: 'bus-booking-confirmation',
  bookingConfirmationTitle: 'bus-booking-confirmation-title',
  confirmBooking: 'bus-confirm-booking',
  officialScheduleLink: 'bus-official-schedule-link',
  routeInfo: 'bus-route-info',
} as const;

export const BUS_PAGE_COPY = {
  bookingConfirmedTitle: 'Seat confirmed',
  heroDetail: 'Bus service is only shown when live inventory is available.',
  loadingRoutes: 'Syncing live bus routes...',
  officialScheduleLink: (verifiedAt: string) => `Provider details verified ${verifiedAt}`,
} as const;

export function buildBusRouteInfo(kind: BusRouteInfoKind, _verifiedAt?: string): BusRouteInfo {
  switch (kind) {
    case 'validation':
      return {
        kind,
        message: 'Choose two different locations to preview the right coach corridor.',
      };
    case 'live':
      return {
        kind,
        message: 'Live bus inventory is synced for this corridor.',
      };
    case 'unavailable':
      return {
        kind,
        message: 'Bus service is unavailable right now.',
      };
    default:
      return {
        kind: 'unavailable',
        message: 'Bus service is unavailable right now.',
      };
  }
}
