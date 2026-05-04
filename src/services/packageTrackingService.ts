import { mapLegacyPackageStatusToLifecycle } from '../domain/packages/lifecycle';
import { createDomainEvent, domainEventBus } from '../platform/event-bus';
import {
  DEFAULT_GEO_STREAM_CONFIG,
  evaluateGeoStreamUpdate,
  type GeoPoint,
  type GeoStreamState,
} from '../platform/geo-stream';
import { generateId } from '../utils/api';
import { sanitizeEventPayload } from '../utils/sanitization';

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
  lifecycleStatus: 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  currentLocation?: GeoPoint;
  createdAt: Date;
  pickedUpAt?: Date;
  inTransitAt?: Date;
  deliveredAt?: Date;
  pickupVerificationCode: string;
  deliveryVerificationCode: string;
  pickupVerified: boolean;
  deliveryVerified: boolean;
  pickupPhoto?: string;
  deliveryPhoto?: string;
  senderCanContactDriver: boolean;
  lastUpdated: Date;
}

export interface PackageStatusUpdate {
  packageId: string;
  status: PackageStatus;
  timestamp: Date;
  location?: GeoPoint;
  note?: string;
  photo?: string;
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

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WSL-PKG-';
  for (let index = 0; index < 6; index += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateQRCodeUrl(trackingCode: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingCode)}`;
}

function calculateBasePrice(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small':
      return 3;
    case 'medium':
      return 5;
    case 'large':
      return 8;
    default:
      return 3;
  }
}

export class PackageTrackingService {
  private static instance: PackageTrackingService;

  private packages = new Map<string, PackageTracking>();
  private escrows = new Map<string, PackagePaymentEscrow>();
  private locationStreams = new Map<string, GeoStreamState>();
  private statusHistory = new Map<string, PackageStatusUpdate[]>();

  static getInstance(): PackageTrackingService {
    if (!PackageTrackingService.instance) {
      PackageTrackingService.instance = new PackageTrackingService();
    }
    return PackageTrackingService.instance;
  }

  async createPackage(params: {
    senderId: string;
    from: string;
    to: string;
    size: 'small' | 'medium' | 'large';
    value: number;
    insurance: boolean;
    description?: string;
  }): Promise<PackageTracking> {
    const packageId = generateId('pkg');
    const trackingCode = generateTrackingCode();
    const basePrice = calculateBasePrice(params.size);
    const insuranceCost = params.insurance ? Number((params.value * 0.01).toFixed(2)) : 0;

    const pkg: PackageTracking = {
      id: packageId,
      trackingCode,
      qrCodeUrl: generateQRCodeUrl(trackingCode),
      senderId: params.senderId,
      from: params.from,
      to: params.to,
      size: params.size,
      value: params.value,
      insurance: params.insurance,
      description: params.description,
      price: basePrice,
      insuranceCost,
      totalCost: Number((basePrice + insuranceCost).toFixed(2)),
      paymentStatus: 'pending',
      status: 'created',
      lifecycleStatus: 'created',
      createdAt: new Date(),
      lastUpdated: new Date(),
      pickupVerificationCode: generateVerificationCode(),
      deliveryVerificationCode: generateVerificationCode(),
      pickupVerified: false,
      deliveryVerified: false,
      senderCanContactDriver: false,
    };

    this.packages.set(packageId, pkg);
    this.locationStreams.set(packageId, { lastAcceptedAt: null, lastPoint: null });
    this.recordStatusUpdate({
      packageId,
      status: pkg.status,
      timestamp: pkg.createdAt,
    });

    domainEventBus.publish(
      createDomainEvent(
        'PackageCreated',
        sanitizeEventPayload({
          packageId: pkg.id,
          trackingCode: pkg.trackingCode,
          origin: pkg.from,
          destination: pkg.to,
        }),
        'packageTrackingService',
      ),
    );

    return pkg;
  }

  async linkPackageToRide(
    packageId: string,
    rideDetails: {
      rideId: string;
      driverId: string;
      driverName: string;
      driverPhone: string;
      driverPhoto?: string;
      vehicleInfo?: string;
    },
  ): Promise<PackageTracking> {
    const pkg = this.requirePackage(packageId);

    pkg.rideId = rideDetails.rideId;
    pkg.driverId = rideDetails.driverId;
    pkg.driverName = rideDetails.driverName;
    pkg.driverPhone = rideDetails.driverPhone;
    pkg.driverPhoto = rideDetails.driverPhoto;
    pkg.vehicleInfo = rideDetails.vehicleInfo;
    pkg.status = 'matched';
    pkg.lifecycleStatus = 'assigned';
    pkg.senderCanContactDriver = true;
    pkg.lastUpdated = new Date();

    this.packages.set(packageId, pkg);
    this.recordStatusUpdate({
      packageId,
      status: pkg.status,
      timestamp: pkg.lastUpdated,
    });

    domainEventBus.publish(
      createDomainEvent(
        'PackageAssigned',
        sanitizeEventPayload({
          packageId: pkg.id,
          rideId: rideDetails.rideId,
          driverId: rideDetails.driverId,
        }),
        'packageTrackingService',
      ),
    );

    return pkg;
  }

  async processPayment(packageId: string, paymentMethod: string): Promise<PackagePaymentEscrow> {
    const pkg = this.requirePackage(packageId);

    const escrow: PackagePaymentEscrow = {
      packageId,
      amount: pkg.totalCost,
      senderPaid: true,
      heldInEscrow: true,
      releasedToDriver: false,
      releaseConditions: {
        deliveryVerified: false,
        photoProvided: false,
        noDisputes: false,
      },
    };

    pkg.paymentStatus = 'escrowed';
    pkg.paymentMethod = paymentMethod;
    pkg.lastUpdated = new Date();

    this.packages.set(packageId, pkg);
    this.escrows.set(packageId, escrow);

    domainEventBus.publish(
      createDomainEvent(
        'PaymentAuthorized',
        sanitizeEventPayload({
          entityId: pkg.id,
          entityType: 'package',
          amount: pkg.totalCost,
        }),
        'packageTrackingService',
      ),
    );

    return escrow;
  }

  async verifyPickup(
    packageId: string,
    verificationCode: string,
    photo?: string,
  ): Promise<boolean> {
    const pkg = this.requirePackage(packageId);

    if (pkg.pickupVerificationCode !== verificationCode) {
      return false;
    }

    pkg.pickupVerified = true;
    pkg.status = 'picked_up';
    pkg.lifecycleStatus = 'picked_up';
    pkg.pickedUpAt = new Date();
    pkg.pickupPhoto = photo;
    pkg.lastUpdated = new Date();

    this.packages.set(packageId, pkg);
    this.recordStatusUpdate({
      packageId,
      status: pkg.status,
      timestamp: pkg.lastUpdated,
      photo,
    });

    domainEventBus.publish(
      createDomainEvent(
        'PackagePickedUp',
        sanitizeEventPayload({
          packageId: pkg.id,
          rideId: pkg.rideId,
        }),
        'packageTrackingService',
      ),
    );

    return true;
  }

  async updateLocation(packageId: string, location: GeoPoint): Promise<void> {
    const pkg = this.requirePackage(packageId);
    const stream = this.locationStreams.get(packageId) ?? {
      lastAcceptedAt: null,
      lastPoint: null,
    };

    const decision = evaluateGeoStreamUpdate(
      stream,
      location,
      Date.now(),
      DEFAULT_GEO_STREAM_CONFIG,
    );

    if (!decision.accepted) {
      return;
    }

    pkg.currentLocation = location;
    if (pkg.status === 'picked_up') {
      pkg.status = 'in_transit';
      pkg.lifecycleStatus = 'in_transit';
      pkg.inTransitAt = pkg.inTransitAt ?? new Date();
    }
    pkg.lastUpdated = new Date();

    this.packages.set(packageId, pkg);
    this.locationStreams.set(packageId, {
      lastAcceptedAt: Date.now(),
      lastPoint: location,
    });
    this.recordStatusUpdate({
      packageId,
      status: pkg.status,
      timestamp: pkg.lastUpdated,
      location,
      note: decision.reason,
    });

    domainEventBus.publish(
      createDomainEvent(
        'PackageLocationUpdated',
        sanitizeEventPayload({
          packageId: pkg.id,
          latitude: location.lat,
          longitude: location.lng,
        }),
        'packageTrackingService',
      ),
    );
  }

  async verifyDelivery(
    packageId: string,
    verificationCode: string,
    photo?: string,
  ): Promise<{ verified: boolean; paymentReleased: boolean }> {
    const pkg = this.requirePackage(packageId);

    if (pkg.deliveryVerificationCode !== verificationCode) {
      return { verified: false, paymentReleased: false };
    }

    pkg.deliveryVerified = true;
    pkg.status = 'delivered';
    pkg.lifecycleStatus = 'delivered';
    pkg.deliveredAt = new Date();
    pkg.deliveryPhoto = photo;
    pkg.lastUpdated = new Date();

    const escrow = this.escrows.get(packageId);
    if (escrow && escrow.heldInEscrow) {
      escrow.releaseConditions.deliveryVerified = true;
      escrow.releaseConditions.photoProvided = Boolean(photo);
      escrow.releaseConditions.noDisputes = true;

      if (this.canReleasePayment(escrow)) {
        escrow.releasedToDriver = true;
        escrow.heldInEscrow = false;
        pkg.paymentStatus = 'released';
        this.escrows.set(packageId, escrow);

        domainEventBus.publish(
          createDomainEvent(
            'PaymentCaptured',
            sanitizeEventPayload({
              entityId: pkg.id,
              entityType: 'package',
              amount: pkg.totalCost,
            }),
            'packageTrackingService',
          ),
        );
      }
    }

    this.packages.set(packageId, pkg);
    this.recordStatusUpdate({
      packageId,
      status: pkg.status,
      timestamp: pkg.lastUpdated,
      photo,
    });

    domainEventBus.publish(
      createDomainEvent(
        'PackageDelivered',
        sanitizeEventPayload({
          packageId: pkg.id,
          rideId: pkg.rideId,
          paymentReleased: pkg.paymentStatus === 'released',
        }),
        'packageTrackingService',
      ),
    );

    return {
      verified: true,
      paymentReleased: pkg.paymentStatus === 'released',
    };
  }

  getPackage(packageId: string): PackageTracking | undefined {
    return this.packages.get(packageId);
  }

  getPackageByTrackingCode(trackingCode: string): PackageTracking | undefined {
    return Array.from(this.packages.values()).find(pkg => pkg.trackingCode === trackingCode);
  }

  getSenderPackages(senderId: string): PackageTracking[] {
    return Array.from(this.packages.values()).filter(pkg => pkg.senderId === senderId);
  }

  getDriverPackages(driverId: string): PackageTracking[] {
    return Array.from(this.packages.values()).filter(pkg => pkg.driverId === driverId);
  }

  getEscrowStatus(packageId: string): PackagePaymentEscrow | undefined {
    return this.escrows.get(packageId);
  }

  getStatusHistory(packageId: string): PackageStatusUpdate[] {
    return [...(this.statusHistory.get(packageId) ?? [])];
  }

  resetRuntimeState(): void {
    this.packages.clear();
    this.escrows.clear();
    this.locationStreams.clear();
    this.statusHistory.clear();
  }

  private requirePackage(packageId: string): PackageTracking {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }
    return pkg;
  }

  private recordStatusUpdate(update: PackageStatusUpdate): void {
    const current = this.statusHistory.get(update.packageId) ?? [];
    this.statusHistory.set(update.packageId, [update, ...current].slice(0, 50));
  }

  private canReleasePayment(escrow: PackagePaymentEscrow): boolean {
    return (
      escrow.releaseConditions.deliveryVerified &&
      escrow.releaseConditions.photoProvided &&
      escrow.releaseConditions.noDisputes
    );
  }
}

export const packageTrackingService = PackageTrackingService.getInstance();

export function getCanonicalPackageLifecycle(
  status: PackageStatus,
): PackageTracking['lifecycleStatus'] {
  return mapLegacyPackageStatusToLifecycle(status);
}
