export type DomainEventType =
  | 'RideRequested'
  | 'DriverAssigned'
  | 'RideAccepted'
  | 'RideStarted'
  | 'RideCompleted'
  | 'RideCancelled'
  | 'PackageCreated'
  | 'PackageAssigned'
  | 'PackagePickedUp'
  | 'PackageDelivered'
  | 'PackageLocationUpdated'
  | 'DriverAvailabilityChanged'
  | 'PaymentAuthorized'
  | 'PaymentCaptured';

export interface DomainEventPayloadMap {
  RideRequested: {
    bookingId: string;
    rideId: string;
    routeMode: 'live_post' | 'network_inventory';
    origin: string;
    destination: string;
  };
  DriverAssigned: {
    bookingId: string;
    rideId: string;
    driverId?: string;
    driverName?: string;
  };
  RideAccepted: {
    bookingId: string;
    rideId: string;
  };
  RideStarted: {
    bookingId: string;
    rideId: string;
  };
  RideCompleted: {
    bookingId: string;
    rideId: string;
  };
  RideCancelled: {
    bookingId: string;
    rideId: string;
    reason?: string;
  };
  PackageCreated: {
    packageId: string;
    trackingCode: string;
    origin: string;
    destination: string;
  };
  PackageAssigned: {
    packageId: string;
    rideId: string;
    driverId: string;
  };
  PackagePickedUp: {
    packageId: string;
    rideId?: string;
  };
  PackageDelivered: {
    packageId: string;
    rideId?: string;
    paymentReleased: boolean;
  };
  PackageLocationUpdated: {
    packageId: string;
    latitude: number;
    longitude: number;
  };
  DriverAvailabilityChanged: {
    driverId: string;
    previousStatus: string;
    nextStatus: string;
  };
  PaymentAuthorized: {
    entityId: string;
    entityType: 'ride' | 'package';
    amount: number;
  };
  PaymentCaptured: {
    entityId: string;
    entityType: 'ride' | 'package';
    amount: number;
  };
}

export interface DomainEventEnvelope<TType extends DomainEventType = DomainEventType> {
  id: string;
  type: TType;
  occurredAt: string;
  traceId: string;
  producer: string;
  payload: DomainEventPayloadMap[TType];
}
