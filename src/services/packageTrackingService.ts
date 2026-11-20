/**
 * Deprecated local package simulator.
 *
 * Package creation, custody state and escrow are server-authoritative now.
 * This compatibility surface deliberately fails closed so no caller can
 * create fake tracking records or mark funds as escrowed in browser storage.
 */
import { ValidationError } from '../utils/errors';

export type PackageStatus =
  | 'created'
  | 'matched'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_transit'
  | 'near_destination'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export interface PackageTracking {
  id: string;
  trackingCode: string;
  qrCodeUrl: string;
  senderId: string;
  receiverId?: string;
  from: string;
  to: string;
  size: 'small' | 'medium' | 'large';
  weight?: number;
  value: number;
  insurance: boolean;
  description?: string;
  rideId?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  vehicleInfo?: string;
  price: number;
  insuranceCost: number;
  totalCost: number;
  paymentStatus: 'pending' | 'escrowed' | 'released' | 'refunded';
  paymentMethod?: string;
  status: PackageStatus;
  currentLocation?: { lat: number; lng: number };
  createdAt: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  lastUpdated: string;
  pickupVerificationCode: string;
  deliveryVerificationCode: string;
  pickupVerified: boolean;
  deliveryVerified: boolean;
  pickupPhoto?: string;
  deliveryPhoto?: string;
  senderCanContactDriver: boolean;
}

export interface PackagePaymentEscrow {
  packageId: string;
  amount: number;
  senderPaid: boolean;
  heldInEscrow: boolean;
  releasedToDriver: boolean;
  releaseConditions: {
    deliveryVerified: boolean;
    photoProvided: boolean;
    noDisputes: boolean;
  };
}

export interface PackageTimelineEvent {
  id: string;
  packageId: string;
  type:
    | 'created'
    | 'linked_to_ride'
    | 'payment_escrowed'
    | 'pickup_verified'
    | 'location_updated'
    | 'delivery_verified'
    | 'payment_released';
  status: PackageStatus;
  timestamp: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

const disabled = () =>
  new ValidationError(
    'Local package tracking and simulated escrow are disabled. Use the authenticated package API.',
  );

export class PackageTrackingService {
  private static instance: PackageTrackingService;

  private constructor() {}

  static getInstance(): PackageTrackingService {
    if (!PackageTrackingService.instance) {
      PackageTrackingService.instance = new PackageTrackingService();
    }
    return PackageTrackingService.instance;
  }

  async createPackage(_params: {
    senderId: string;
    from: string;
    to: string;
    size: 'small' | 'medium' | 'large';
    value: number;
    insurance: boolean;
    description?: string;
  }): Promise<PackageTracking> {
    throw disabled();
  }

  async linkPackageToRide(
    _packageId: string,
    _rideDetails: {
      rideId: string;
      driverId: string;
      driverName: string;
      driverPhone: string;
      driverPhoto?: string;
      vehicleInfo?: string;
    },
  ): Promise<PackageTracking> {
    throw disabled();
  }

  async processPayment(_packageId: string, _paymentMethod: string): Promise<PackagePaymentEscrow> {
    throw disabled();
  }

  async verifyPickup(_packageId: string, _verificationCode: string, _photo?: string): Promise<boolean> {
    throw disabled();
  }

  async updateLocation(_packageId: string, _location: { lat: number; lng: number }): Promise<void> {
    throw disabled();
  }

  async verifyDelivery(
    _packageId: string,
    _verificationCode: string,
    _photo?: string,
  ): Promise<{ verified: boolean; paymentReleased: boolean }> {
    throw disabled();
  }

  async openDispute(_packageId: string, _reason: string): Promise<void> {
    throw disabled();
  }

  getPackage(_packageId: string): PackageTracking | undefined {
    return undefined;
  }

  getPackageByTrackingCode(_trackingCode: string): PackageTracking | undefined {
    return undefined;
  }

  getSenderPackages(_senderId: string): PackageTracking[] {
    return [];
  }

  getDriverPackages(_driverId: string): PackageTracking[] {
    return [];
  }

  getTimeline(_packageId: string): PackageTimelineEvent[] {
    return [];
  }

  resetForTesting(): void {}
}

export const packageTrackingService = PackageTrackingService.getInstance();
