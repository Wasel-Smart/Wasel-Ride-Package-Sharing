/**
 * Package Tracking Prototype
 * Browser storage is development-only and is never authoritative in production.
 * Production package operations remain disabled until server-side persistence,
 * authorization, delivery evidence, and payment-provider settlement are deployed.
 */

import { generateId } from '../utils/api';
import { ValidationError } from '../utils/errors';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

  // ISO strings for serialisation (was Date — kept as string for localStorage)
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

export interface PackageStatusUpdate {
  packageId: string;
  status: PackageStatus;
  timestamp: string;
  location?: { lat: number; lng: number };
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

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const PACKAGES_STORAGE_KEY = 'wasel-packages';
const TIMELINE_STORAGE_KEY = 'wasel-package-timeline';

function loadMap<T>(key: string): Map<string, T> {
  try {
    if (typeof window === 'undefined') {
      return new Map();
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return new Map();
    }
    const entries: [string, T][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveMap<T>(key: string, map: Map<string, T>): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Storage is unavailable.
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE TRACKING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class PackageTrackingService {
  private static instance: PackageTrackingService;
  private packages: Map<string, PackageTracking>;
  private timeline: Map<string, PackageTimelineEvent[]>;

  private constructor() {
    // Browser storage is a development preview only, never production state.
    // Legacy client-side escrow records were simulated and must not be trusted.
    this.packages = import.meta.env.PROD
      ? new Map()
      : new Map(
          Array.from(loadMap<PackageTracking>(PACKAGES_STORAGE_KEY).entries()).map(
            ([id, pkg]) => [
              id,
              { ...pkg, paymentStatus: 'pending' as const, paymentMethod: undefined },
            ],
          ),
        );
    this.timeline = import.meta.env.PROD
      ? new Map()
      : loadMap<PackageTimelineEvent[]>(TIMELINE_STORAGE_KEY);
  }

  private assertPreviewOnly(): void {
    if (import.meta.env.PROD) {
      throw new ValidationError(
        'Package tracking is temporarily unavailable until server-side persistence and authorization are deployed.',
      );
    }
  }

  static getInstance(): PackageTrackingService {
    if (!PackageTrackingService.instance) {
      PackageTrackingService.instance = new PackageTrackingService();
    }
    return PackageTrackingService.instance;
  }

  // ── private save helpers ───────────────────────────────────────────────────

  private savePackages(): void {
    saveMap(PACKAGES_STORAGE_KEY, this.packages);
  }

  private saveTimeline(): void {
    saveMap(TIMELINE_STORAGE_KEY, this.timeline);
  }

  private recordPackageEvent(
    packageId: string,
    type: PackageTimelineEvent['type'],
    status: PackageStatus,
    metadata?: Record<string, unknown>,
    note?: string,
  ): void {
    const events = this.timeline.get(packageId) ?? [];
    events.push({
      id: generateId('pkg_evt'),
      packageId,
      type,
      status,
      timestamp: new Date().toISOString(),
      note,
      metadata,
    });
    this.timeline.set(packageId, events);
    this.saveTimeline();
  }

  private requirePackage(packageId: string): PackageTracking {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new ValidationError('Package not found', { packageId });
    }
    return pkg;
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * Create a new package with tracking code
   */
  async createPackage(params: {
    senderId: string;
    from: string;
    to: string;
    size: 'small' | 'medium' | 'large';
    value: number;
    insurance: boolean;
    description?: string;
  }): Promise<PackageTracking> {
    this.assertPreviewOnly();
    if (!params.senderId.trim()) {
      throw new ValidationError('senderId is required for package creation', {
        senderId: params.senderId,
      });
    }
    if (!params.from.trim() || !params.to.trim()) {
      throw new ValidationError('Both origin and destination are required for package creation', {
        from: params.from,
        to: params.to,
      });
    }
    if (params.value < 0) {
      throw new ValidationError('Package value cannot be negative', { value: params.value });
    }

    const packageId = generateId('pkg');
    const trackingCode = this.generateTrackingCode();
    const pickupCode = this.generateVerificationCode();
    const deliveryCode = this.generateVerificationCode();

    const basePrice = this.calculateBasePrice(params.size);
    const insuranceCost = params.insurance ? params.value * 0.01 : 0;
    const totalCost = basePrice + insuranceCost;
    const now = new Date().toISOString();

    const pkg: PackageTracking = {
      id: packageId,
      trackingCode,
      qrCodeUrl: this.generateQRCodeUrl(trackingCode),

      senderId: params.senderId,
      from: params.from,
      to: params.to,
      size: params.size,
      value: params.value,
      insurance: params.insurance,
      description: params.description,

      price: basePrice,
      insuranceCost,
      totalCost,
      paymentStatus: 'pending',

      status: 'created',
      createdAt: now,
      lastUpdated: now,

      pickupVerificationCode: pickupCode,
      deliveryVerificationCode: deliveryCode,
      pickupVerified: false,
      deliveryVerified: false,

      senderCanContactDriver: false,
    };

    this.packages.set(packageId, pkg);
    this.savePackages();
    this.recordPackageEvent(packageId, 'created', pkg.status, {
      from: pkg.from,
      to: pkg.to,
      totalCost: pkg.totalCost,
    });
    return pkg;
  }

  /**
   * Link package to a ride
   */
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
    this.assertPreviewOnly();
    const pkg = this.requirePackage(packageId);
    if (pkg.status !== 'created') {
      throw new ValidationError('Only newly created packages can be linked to a ride', {
        packageId,
        status: pkg.status,
      });
    }

    const updated: PackageTracking = {
      ...pkg,
      rideId: rideDetails.rideId,
      driverId: rideDetails.driverId,
      driverName: rideDetails.driverName,
      driverPhone: rideDetails.driverPhone,
      driverPhoto: rideDetails.driverPhoto,
      vehicleInfo: rideDetails.vehicleInfo,
      status: 'matched',
      senderCanContactDriver: true,
      lastUpdated: new Date().toISOString(),
    };

    this.packages.set(packageId, updated);
    this.savePackages();
    this.recordPackageEvent(packageId, 'linked_to_ride', updated.status, {
      rideId: rideDetails.rideId,
      driverId: rideDetails.driverId,
    });
    return updated;
  }

  /**
   * Process payment and hold in escrow
   */
  async processPayment(packageId: string, _paymentMethod: string): Promise<PackagePaymentEscrow> {
    this.requirePackage(packageId);
    throw new ValidationError(
      'Package payments are disabled until a server-verified payment provider and escrow workflow are implemented.',
      { packageId },
    );
  }

  /**
   * Verify pickup with QR code
   */
  async verifyPickup(
    packageId: string,
    verificationCode: string,
    photo?: string,
  ): Promise<boolean> {
    this.assertPreviewOnly();
    const pkg = this.requirePackage(packageId);
    if (pkg.paymentStatus !== 'escrowed') {
      throw new ValidationError('Pickup cannot be verified until payment is held in escrow', {
        packageId,
        paymentStatus: pkg.paymentStatus,
      });
    }
    if (!['matched', 'pickup_scheduled'].includes(pkg.status)) {
      throw new ValidationError('Pickup verification is only allowed before transit begins', {
        packageId,
        status: pkg.status,
      });
    }

    if (pkg.pickupVerificationCode !== verificationCode) {
      return false;
    }

    const updated: PackageTracking = {
      ...pkg,
      pickupVerified: true,
      status: 'picked_up',
      pickedUpAt: new Date().toISOString(),
      pickupPhoto: photo,
      lastUpdated: new Date().toISOString(),
    };

    this.packages.set(packageId, updated);
    this.savePackages();
    this.recordPackageEvent(packageId, 'pickup_verified', updated.status, {
      photoProvided: Boolean(photo),
    });
    return true;
  }

  /**
   * Update package location during transit
   */
  async updateLocation(packageId: string, location: { lat: number; lng: number }): Promise<void> {
    this.assertPreviewOnly();
    const pkg = this.requirePackage(packageId);
    if (!['picked_up', 'in_transit', 'near_destination'].includes(pkg.status)) {
      throw new ValidationError('Package location updates are only allowed after pickup', {
        packageId,
        status: pkg.status,
      });
    }

    let status: PackageStatus = pkg.status;
    let inTransitAt = pkg.inTransitAt;

    if (this.isNearDestination(location, pkg.to)) {
      status = 'near_destination';
    } else if (pkg.status === 'picked_up') {
      status = 'in_transit';
      inTransitAt = new Date().toISOString();
    }

    const updated: PackageTracking = {
      ...pkg,
      currentLocation: location,
      status,
      inTransitAt,
      lastUpdated: new Date().toISOString(),
    };

    this.packages.set(packageId, updated);
    this.savePackages();
    this.recordPackageEvent(packageId, 'location_updated', updated.status, {
      location,
    });
  }

  /**
   * Verify delivery with QR code and release payment
   */
  async verifyDelivery(
    packageId: string,
    verificationCode: string,
    photo?: string,
  ): Promise<{ verified: boolean; paymentReleased: boolean }> {
    this.assertPreviewOnly();
    const pkg = this.requirePackage(packageId);
    if (!pkg.pickupVerified) {
      throw new ValidationError('Delivery cannot be verified before pickup is confirmed', {
        packageId,
        status: pkg.status,
      });
    }
    if (!['picked_up', 'in_transit', 'near_destination'].includes(pkg.status)) {
      throw new ValidationError(
        'Delivery verification is only allowed for packages currently in delivery',
        {
          packageId,
          status: pkg.status,
        },
      );
    }

    if (pkg.deliveryVerificationCode !== verificationCode) {
      return { verified: false, paymentReleased: false };
    }

    const updatedPkg: PackageTracking = {
      ...pkg,
      deliveryVerified: true,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      deliveryPhoto: photo,
      lastUpdated: new Date().toISOString(),
    };

    // Delivery confirmation must never release funds from browser-owned state.
    this.packages.set(packageId, {
      ...updatedPkg,
      paymentStatus: 'pending',
      paymentMethod: undefined,
    });
    this.savePackages();
    this.recordPackageEvent(packageId, 'delivery_verified', updatedPkg.status, {
      photoProvided: Boolean(photo),
      paymentReleased: false,
    });

    return { verified: true, paymentReleased: false };
  }

  // ── read-only helpers ──────────────────────────────────────────────────────

  getPackage(packageId: string): PackageTracking | undefined {
    return this.packages.get(packageId);
  }

  getPackageByTrackingCode(trackingCode: string): PackageTracking | undefined {
    return Array.from(this.packages.values()).find((p) => p.trackingCode === trackingCode);
  }

  getSenderPackages(senderId: string): PackageTracking[] {
    return Array.from(this.packages.values()).filter((p) => p.senderId === senderId);
  }

  getDriverPackages(driverId: string): PackageTracking[] {
    return Array.from(this.packages.values()).filter((p) => p.driverId === driverId);
  }

  getEscrowStatus(_packageId: string): PackagePaymentEscrow | undefined {
    // Escrow status is not available until it is backed by the payment provider.
    return undefined;
  }

  getPackageTimeline(packageId: string): PackageTimelineEvent[] {
    return [...(this.timeline.get(packageId) ?? [])].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  resetForTesting(): void {
    this.assertPreviewOnly();
    this.packages.clear();
    this.timeline.clear();
    this.savePackages();
    this.saveTimeline();
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private generateTrackingCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'WSL-PKG-';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    for (const byte of bytes) {
      code += chars.charAt(byte % chars.length);
    }
    return code;
  }

  private generateVerificationCode(): string {
    const bytes = crypto.getRandomValues(new Uint32Array(1));
    return String(100000 + (bytes[0] % 900000)).padStart(6, '0');
  }

  private generateQRCodeUrl(trackingCode: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingCode)}`;
  }

  private calculateBasePrice(size: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small':
        return 3.0;
      case 'medium':
        return 5.0;
      case 'large':
        return 8.0;
      default:
        return 3.0;
    }
  }

  private isNearDestination(
    currentLocation: { lat: number; lng: number },
    destination: string,
  ): boolean {
    void currentLocation;
    void destination;
    // Production: geocode destination and compare with PostGIS ST_DWithin
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const packageTrackingService = PackageTrackingService.getInstance();
