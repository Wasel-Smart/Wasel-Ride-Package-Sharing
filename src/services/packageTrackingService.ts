/**
 * Package Tracking Service
 * Secure package delivery system with QR codes and escrow payments
 * Links packages to rides with full transparency for sender
 *
 * Persistence: packages + escrows are stored in localStorage so they
 * survive page refreshes and reconnects.
 */

import { generateId } from '../utils/api';

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

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const PACKAGES_STORAGE_KEY = 'wasel-packages';
const ESCROWS_STORAGE_KEY  = 'wasel-package-escrows';

function loadMap<T>(key: string): Map<string, T> {
  try {
    if (typeof window === 'undefined') return new Map();
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Map();
    const entries: [string, T][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveMap<T>(key: string, map: Map<string, T>): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(Array.from(map.entries())));
  } catch { /* storage unavailable */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE TRACKING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class PackageTrackingService {
  private static instance: PackageTrackingService;
  private packages: Map<string, PackageTracking>;
  private escrows: Map<string, PackagePaymentEscrow>;

  private constructor() {
    // Rehydrate from localStorage on startup
    this.packages = loadMap<PackageTracking>(PACKAGES_STORAGE_KEY);
    this.escrows  = loadMap<PackagePaymentEscrow>(ESCROWS_STORAGE_KEY);
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

  private saveEscrows(): void {
    saveMap(ESCROWS_STORAGE_KEY, this.escrows);
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
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error('Package not found');

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
    return updated;
  }

  /**
   * Process payment and hold in escrow
   */
  async processPayment(packageId: string, paymentMethod: string): Promise<PackagePaymentEscrow> {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error('Package not found');

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

    const updatedPkg: PackageTracking = {
      ...pkg,
      paymentStatus: 'escrowed',
      paymentMethod,
      lastUpdated: new Date().toISOString(),
    };

    this.packages.set(packageId, updatedPkg);
    this.escrows.set(packageId, escrow);
    this.savePackages();
    this.saveEscrows();
    return escrow;
  }

  /**
   * Verify pickup with QR code
   */
  async verifyPickup(packageId: string, verificationCode: string, photo?: string): Promise<boolean> {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error('Package not found');

    if (pkg.pickupVerificationCode !== verificationCode) return false;

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
    return true;
  }

  /**
   * Update package location during transit
   */
  async updateLocation(packageId: string, location: { lat: number; lng: number }): Promise<void> {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error('Package not found');

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
  }

  /**
   * Verify delivery with QR code and release payment
   */
  async verifyDelivery(
    packageId: string,
    verificationCode: string,
    photo?: string,
  ): Promise<{ verified: boolean; paymentReleased: boolean }> {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error('Package not found');

    if (pkg.deliveryVerificationCode !== verificationCode) {
      return { verified: false, paymentReleased: false };
    }

    let updatedPkg: PackageTracking = {
      ...pkg,
      deliveryVerified: true,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      deliveryPhoto: photo,
      lastUpdated: new Date().toISOString(),
    };

    const escrow = this.escrows.get(packageId);
    if (escrow?.heldInEscrow) {
      const conditions = {
        deliveryVerified: true,
        photoProvided: !!photo,
        noDisputes: true,
      };
      const updated = { ...escrow, releaseConditions: conditions };

      if (this.canReleasePayment(updated)) {
        updated.releasedToDriver = true;
        updated.heldInEscrow = false;
        updatedPkg = { ...updatedPkg, paymentStatus: 'released' };
        this.escrows.set(packageId, updated);
        this.saveEscrows();
      }
    }

    this.packages.set(packageId, updatedPkg);
    this.savePackages();

    return {
      verified: true,
      paymentReleased: updatedPkg.paymentStatus === 'released',
    };
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

  getEscrowStatus(packageId: string): PackagePaymentEscrow | undefined {
    return this.escrows.get(packageId);
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private generateTrackingCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'WSL-PKG-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateQRCodeUrl(trackingCode: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingCode)}`;
  }

  private calculateBasePrice(size: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small':  return 3.0;
      case 'medium': return 5.0;
      case 'large':  return 8.0;
      default:       return 3.0;
    }
  }

  private isNearDestination(
    _currentLocation: { lat: number; lng: number },
    _destination: string,
  ): boolean {
    // Production: geocode destination and compare with PostGIS ST_DWithin
    return false;
  }

  private canReleasePayment(escrow: PackagePaymentEscrow): boolean {
    return (
      escrow.releaseConditions.deliveryVerified &&
      escrow.releaseConditions.photoProvided &&
      escrow.releaseConditions.noDisputes
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const packageTrackingService = PackageTrackingService.getInstance();
