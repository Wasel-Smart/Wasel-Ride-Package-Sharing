export type DomainEventType =
  | 'RideRequested'
  | 'rides.requested'
  | 'DriverAssigned'
  | 'rides.assigned'
  | 'RideAccepted'
  | 'RideStarted'
  | 'RideCompleted'
  | 'rides.completed'
  | 'RideCancelled'
  | 'PackageCreated'
  | 'PackageAssigned'
  | 'PackagePickedUp'
  | 'PackageDelivered'
  | 'PackageLocationUpdated'
  | 'DriverAvailabilityChanged'
  | 'PaymentAuthorized'
  | 'payments.authorized'
  | 'PaymentCaptured'
  | 'payments.captured';

export interface DomainEventPayloadMap {
  RideRequested: {
    bookingId: string;
    rideId: string;
    routeMode: 'live_post' | 'network_inventory';
    origin: string;
    destination: string;
  };
  'rides.requested': {
    rideId: string;
    riderId: string;
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    requestedAt: string;
    seats: number;
    preferredVehicleType?: string;
  };
  DriverAssigned: {
    bookingId: string;
    rideId: string;
    driverId?: string;
    driverName?: string;
  };
  'rides.assigned': {
    rideId: string;
    driverId: string;
    vehicleId: string;
    matchedAt: string;
    estimatedArrival: number;
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
  'rides.completed': {
    rideId: string;
    riderId: string;
    driverId: string;
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    distance: number;
    duration: number;
    fare: number;
    completedAt: string;
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
  'payments.authorized': {
    paymentId: string;
    rideId?: string;
    packageId?: string;
    amount: number;
    currency: string;
    providerId: string;
    escrowStatus: 'held' | 'released' | 'refunded';
    authorizedAt: string;
  };
  PaymentCaptured: {
    entityId: string;
    entityType: 'ride' | 'package';
    amount: number;
  };
  'payments.captured': {
    paymentId: string;
    rideId?: string;
    packageId?: string;
    capturedAmount: number;
    providerTransactionId: string;
    capturedAt: string;
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
