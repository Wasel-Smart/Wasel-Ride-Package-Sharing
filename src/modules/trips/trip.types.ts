import type { StoredBusBooking } from '../../services/bus';
import type { PackageRequest } from '../../services/journeyLogistics';
import type { RideBookingRecord } from '../../services/rideLifecycle';
import type { SupportTicket } from '../../services/supportInbox';

export interface TripCollections {
  rides: RideBookingRecord[];
  packages: PackageRequest[];
  buses: StoredBusBooking[];
  supportTickets: SupportTicket[];
}

export interface TripState extends TripCollections {
  loading: boolean;
}
