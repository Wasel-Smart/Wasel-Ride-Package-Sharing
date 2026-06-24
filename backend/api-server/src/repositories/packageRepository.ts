import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export interface PackageRow {
  id: string;
  tracking_number: string;
  qr_code: string;
  sender_id: string;
  receiver_name: string;
  receiver_phone: string;
  origin_name: string;
  origin_location: unknown;
  destination_name: string;
  destination_location: unknown;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  weight_kg: number | null;
  description: string | null;
  declared_value: number | null;
  fragile: boolean;
  trip_id: string | null;
  carrier_id: string | null;
  delivery_fee: number;
  insurance_fee: number;
  status: 'posted' | 'requested' | 'matched' | 'accepted' | 'booked' | 'confirmed' | 'pickup' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  picked_up_at: string | null;
  delivered_at: string | null;
  pickup_verified: boolean;
  dropoff_verified: boolean;
  pickup_signature: string | null;
  dropoff_signature: string | null;
  is_return: boolean;
  ecommerce_order_id: string | null;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackageInput {
  sender_id: string;
  receiver_name: string;
  receiver_phone: string;
  origin_name: string;
  origin_location: unknown;
  destination_name: string;
  destination_location: unknown;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  weight_kg?: number;
  description?: string;
  declared_value?: number;
  fragile?: boolean;
  delivery_fee: number;
  insurance_fee?: number;
}

class PackageRepository {
  private db = getDb();

  /**
   * Create a new package delivery request
   */
  async createPackage(input: CreatePackageInput): Promise<PackageRow> {
    try {
      const now = new Date().toISOString();
      const trackingNumber = `PKG-${Math.floor(100000 + Math.random() * 900000)}`;
      const qrCode = `QR-${trackingNumber}`;

      const [pkg] = await this.db`
        INSERT INTO packages (
          tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          delivery_fee, insurance_fee, status, created_at, updated_at
        ) VALUES (
          ${trackingNumber}, ${qrCode}, ${input.sender_id}, ${input.receiver_name}, ${input.receiver_phone},
          ${input.origin_name}, ${input.origin_location as string}, ${input.destination_name}, ${input.destination_location as string},
          ${input.size}, ${input.weight_kg ?? null}, ${input.description ?? null}, ${input.declared_value ?? null}, ${input.fragile ?? false},
          ${input.delivery_fee}, ${input.insurance_fee ?? 0.50}, ${'posted'}, ${now}, ${now}
        )
        RETURNING
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
      ` as unknown as PackageRow[];

      return pkg;
    } catch (error) {
      logger.error('Error creating package', error);
      throw new InternalError('Failed to create package');
    }
  }

  /**
   * Find a package by its ID
   */
  async findPackageById(id: string): Promise<PackageRow | null> {
    try {
      const [pkg] = await this.db`
        SELECT
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
        FROM packages
        WHERE id = ${id}
      ` as unknown as PackageRow[];

      return pkg ?? null;
    } catch (error) {
      logger.error('Error finding package by ID', error);
      throw new InternalError('Failed to find package');
    }
  }

  /**
   * Find all packages sent by a specific user
   */
  async findPackagesBySender(senderId: string): Promise<PackageRow[]> {
    try {
      const packages = await this.db`
        SELECT
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
        FROM packages
        WHERE sender_id = ${senderId}
        ORDER BY created_at DESC
      ` as unknown as PackageRow[];

      return packages;
    } catch (error) {
      logger.error('Error finding packages by sender', error);
      throw new InternalError('Failed to find packages');
    }
  }

  /**
   * Find packages by status
   */
  async findPackagesByStatus(status: string): Promise<PackageRow[]> {
    try {
      const packages = await this.db`
        SELECT
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
        FROM packages
        WHERE status = ${status}
        ORDER BY created_at DESC
      ` as unknown as PackageRow[];

      return packages;
    } catch (error) {
      logger.error('Error finding packages by status', error);
      throw new InternalError('Failed to find packages');
    }
  }

  /**
   * Update package status and optionally assign carrier
   */
  async updatePackageStatus(id: string, status: string, carrierId?: string): Promise<PackageRow> {
    try {
      const now = new Date().toISOString();
      const [pkg] = await this.db`
        UPDATE packages
        SET status = ${status}, carrier_id = ${carrierId ?? null}, updated_at = ${now}
        WHERE id = ${id}
        RETURNING
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
      ` as unknown as PackageRow[];

      if (!pkg) {
        throw new NotFoundError('Package');
      }

      return pkg;
    } catch (error) {
      logger.error('Error updating package status', error);
      throw error instanceof NotFoundError ? error : new InternalError('Failed to update package status');
    }
  }

  /**
   * Assign a package to a trip with a carrier
   */
  async assignPackageToTrip(packageId: string, tripId: string, carrierId: string): Promise<PackageRow> {
    try {
      const now = new Date().toISOString();
      const [pkg] = await this.db`
        UPDATE packages
        SET trip_id = ${tripId}, carrier_id = ${carrierId}, status = ${'matched'}, updated_at = ${now}
        WHERE id = ${packageId} AND status = ${'posted'}
        RETURNING
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
      ` as unknown as PackageRow[];

      if (!pkg) {
        throw new NotFoundError('Package not found or already assigned');
      }

      return pkg;
    } catch (error) {
      logger.error('Error assigning package to trip', error);
      throw error instanceof NotFoundError ? error : new InternalError('Failed to assign package to trip');
    }
  }

  /**
   * Find packages matching a route (origin/destination)
   */
  async findPackagesForRoute(originCity: string, destinationCity: string): Promise<PackageRow[]> {
    try {
      const packages = await this.db`
        SELECT
          id, tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          trip_id, carrier_id, delivery_fee, insurance_fee,
          status, picked_up_at, delivered_at, pickup_verified, dropoff_verified,
          pickup_signature, dropoff_signature, is_return, ecommerce_order_id, return_reason,
          created_at, updated_at
        FROM packages
        WHERE status = ${'posted'}
          AND LOWER(origin_name) = ${originCity.toLowerCase()}
          AND LOWER(destination_name) = ${destinationCity.toLowerCase()}
        ORDER BY created_at DESC
      ` as unknown as PackageRow[];

      return packages;
    } catch (error) {
      logger.error('Error finding packages for route', error);
      throw new InternalError('Failed to find packages for route');
    }
  }
}

export const packageRepository = new PackageRepository();