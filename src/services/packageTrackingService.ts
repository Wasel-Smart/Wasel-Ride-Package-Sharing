
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
import {
  createDirectPackage,
  getDirectPackageByTrackingId,
  updateDirectPackageStatus,
} from './directSupabase';

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

const PACKAGE_CACHE_KEY = 'wasel-package-tracking-cache';

function serializePackage(pkg: PackageTracking) {
  return {
    ...pkg,
    createdAt: pkg.createdAt.toISOString(),
    pickedUpAt: pkg.pickedUpAt?.toISOString(),
    inTransitAt: pkg.inTransitAt?.toISOString(),
    deliveredAt: pkg.deliveredAt?.toISOString(),
    lastUpdated: pkg.lastUpdated.toISOString(),
  };
}

function deserializePackage(raw: Record<string, unknown>): PackageTracking {
  return {
    ...(raw as Omit<
      PackageTracking,
      'createdAt' | 'pickedUpAt' | 'inTransitAt' | 'deliveredAt' | 'lastUpdated'
    >),
    createdAt: new Date(String(raw.createdAt ?? new Date().toISOString())),
    pickedUpAt: raw.pickedUpAt ? new Date(String(raw.pickedUpAt)) : undefined,
    inTransitAt: raw.inTransitAt ? new Date(String(raw.inTransitAt)) : undefined,
    deliveredAt: raw.deliveredAt ? new Date(String(raw.deliveredAt)) : undefined,
    lastUpdated: new Date(String(raw.lastUpdated ?? new Date().toISOString())),
  };
}

export class PackageTrackingService {
  private static instance: PackageTrackingService;

  private packages = new Map<string, PackageTracking>();
  private escrows = new Map<string, PackagePaymentEscrow>();
  private locationStreams = new Map<string, GeoStreamState>();
  private statusHistory = new Map<string, PackageStatusUpdate[]>();

  private constructor() {
    this.restoreCache();
  }

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

    this.persistCache();
    void createDirectPackage({
      userId: params.senderId,
      trackingNumber: trackingCode,
      from: params.from,
      to: params.to,
      weightKg: params.size === 'large' ? 8 : params.size === 'medium' ? 3 : 0.5,
      description: params.description ?? '',
    }).catch(() => undefined);

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

    this.persistCache();
    void updateDirectPackageStatus(pkg.trackingCode, 'matched').catch(() => undefined);

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
    this.persistCache();

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

    this.persistCache();
    void updateDirectPackageStatus(pkg.trackingCode, 'in_transit').catch(() => undefined);

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

    this.persistCache();
    void updateDirectPackageStatus(pkg.trackingCode, 'in_transit').catch(() => undefined);
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

    this.persistCache();
    void updateDirectPackageStatus(pkg.trackingCode, 'delivered').catch(() => undefined);

    return {
      verified: true,
      paymentReleased: pkg.paymentStatus === 'released',
    };
  }

  getPackage(packageId: string): PackageTracking | undefined {
    return this.packages.get(packageId);
  }

  getPackageByTrackingCode(trackingCode: string): PackageTracking | undefined {
    const cached = Array.from(this.packages.values()).find(pkg => pkg.trackingCode === trackingCode);
    if (cached) {
      return cached;
    }

    void getDirectPackageByTrackingId(trackingCode)
      .then(remote => {
        if (!remote) return;
        const now = new Date();
        const rawStatus = String(remote.package_status ?? remote.status ?? 'created');
        const status: PackageStatus =
          rawStatus === 'matched' ||
          rawStatus === 'pickup_scheduled' ||
          rawStatus === 'picked_up' ||
          rawStatus === 'in_transit' ||
          rawStatus === 'near_destination' ||
          rawStatus === 'delivered' ||
          rawStatus === 'cancelled' ||
          rawStatus === 'disputed'
            ? rawStatus
            : rawStatus === 'assigned'
              ? 'matched'
              : 'created';
        const lifecycleStatus = getCanonicalPackageLifecycle(status);
        const hydrated: PackageTracking = {
          id: String(remote.package_id ?? remote.id ?? remote.tracking_number ?? trackingCode),
          trackingCode: String(remote.tracking_number ?? remote.package_code ?? trackingCode),
          qrCodeUrl: generateQRCodeUrl(String(remote.tracking_number ?? remote.package_code ?? trackingCode)),
          senderId: String(remote.sender_id ?? ''),
          from: String(remote.origin_name ?? remote.origin_location ?? ''),
          to: String(remote.destination_name ?? remote.destination_location ?? ''),
          size:
            remote.size === 'large' || remote.size === 'medium' || remote.size === 'small'
              ? remote.size
              : 'small',
          weight: Number(remote.weight_kg ?? 0),
          value: 0,
          insurance: false,
          description: remote.description ?? undefined,
          price: 0,
          insuranceCost: 0,
          totalCost: 0,
          paymentStatus: 'pending',
          status,
          lifecycleStatus,
          createdAt: remote.created_at ? new Date(remote.created_at) : now,
          pickupVerificationCode: generateVerificationCode(),
          deliveryVerificationCode: generateVerificationCode(),
          pickupVerified: false,
          deliveryVerified: false,
          senderCanContactDriver: false,
          lastUpdated: now,
        };
        this.packages.set(hydrated.id, hydrated);
        this.persistCache();
      })
      .catch(() => undefined);

    return undefined;
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
    this.persistCache();
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

  private restoreCache(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(PACKAGE_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return;

      parsed.forEach(item => {
        const pkg = deserializePackage(item as Record<string, unknown>);
        this.packages.set(pkg.id, pkg);
        this.locationStreams.set(pkg.id, {
          lastAcceptedAt: null,
          lastPoint: pkg.currentLocation ?? null,
        });
      });
    } catch {
      // Ignore corrupt browser cache.
    }
  }

  private persistCache(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        PACKAGE_CACHE_KEY,
        JSON.stringify(Array.from(this.packages.values()).map(serializePackage).slice(0, 100)),
      );
    } catch {
      // Ignore storage quota and privacy-mode errors.
    }
  }
}

export const packageTrackingService = PackageTrackingService.getInstance();

export function getCanonicalPackageLifecycle(
  status: PackageStatus,
): PackageTracking['lifecycleStatus'] {
  return mapLegacyPackageStatusToLifecycle(status);
}

