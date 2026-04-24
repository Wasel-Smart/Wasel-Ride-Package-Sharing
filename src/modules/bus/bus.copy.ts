export type BusRouteInfoKind =
  | 'validation'
  | 'live'
  | 'official'
  | 'nearest'
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
  heroDetail: 'Official intercity schedules stay visible, with live inventory when available.',
  loadingRoutes: 'Syncing live bus routes...',
  officialScheduleLink: (verifiedAt: string) => `Official schedule, verified ${verifiedAt}`,
} as const;

export function buildBusRouteInfo(kind: BusRouteInfoKind, verifiedAt?: string): BusRouteInfo {
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
    case 'official':
      return {
        kind,
        message: `Showing official Jordan schedule data verified on ${verifiedAt ?? 'the selected date'}.`,
      };
    case 'nearest':
      return {
        kind,
        message: 'No exact coach found yet. Showing the closest official corridors.',
      };
    case 'unavailable':
      return {
        kind,
        message: `Live route API is unavailable. Showing official Jordan schedule data verified on ${verifiedAt ?? 'the selected date'}.`,
      };
    default:
      return {
        kind: 'official',
        message: `Showing official Jordan schedule data verified on ${verifiedAt ?? 'the selected date'}.`,
      };
  }
}
