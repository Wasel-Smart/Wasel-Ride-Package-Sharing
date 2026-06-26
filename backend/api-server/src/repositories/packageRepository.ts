import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export interface PackageRow {
  id: string;
  tracking_number: string;
  qr_code: string;
  sender_id: string;
  receiver_name: string;
  receiver_phone: string;
  origin_name: string;
  origin_location: string;
  destination_name: string;
  destination_location: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  weight_kg: number | null;
  description: string | null;
  declared_value: number | null;
  fragile: boolean;
  trip_id: string | null;
  carrier_id: string | null;
  delivery_fee: number;
  insurance_fee: number;
  status: string;
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
  senderId: string;
  originCity: string;
  originCoords: { lat: number; lng: number };
  destinationCity: string;
  destinationCoords: { lat: number; lng: number };
  receiverName: string;
  receiverPhone: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  weight?: number;
  description?: string;
  declaredValue?: number;
  fragile?: boolean;
}

export class PackageRepository {
  private db = getDb();

  async createPackage(input: CreatePackageInput): Promise<PackageRow> {
    try {
      const trackingNumber = `PKG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const qrCode = `${trackingNumber}-QR`;
      const originPoint = `SRID=4326;POINT(${input.originCoords.lng} ${input.originCoords.lat})`;
      const destinationPoint = `SRID=4326;POINT(${input.destinationCoords.lng} ${input.destinationCoords.lat})`;

      const distanceKm = await this.estimateDistance(input.originCoords, input.destinationCoords);
      const deliveryFee = this.calculateFee(input.size, distanceKm);

      const result = await this.db.unsafe(
        `INSERT INTO packages (
          tracking_number, qr_code, sender_id, receiver_name, receiver_phone,
          origin_name, origin_location, destination_name, destination_location,
          size, weight_kg, description, declared_value, fragile,
          delivery_fee, insurance_fee, status
        ) VALUES ($1, $2, $3, $4, $5, $6, ST_GeogFromText($7), $8, ST_GeogFromText($9), $10, $11, $12, $13, $14, $15, $16, 'created')
        RETURNING *`,
        [
          trackingNumber,
          qrCode,
          input.senderId,
          input.receiverName,
          input.receiverPhone,
          input.originCity,
          originPoint,
          input.destinationCity,
          destinationPoint,
          input.size,
          input.weight || null,
          input.description || null,
          input.declaredValue || null,
          input.fragile ?? false,
          deliveryFee,
          0.50,
        ]
      );
      return result[0] as unknown as PackageRow;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create package');
      throw new InternalError('Failed to create package', error as Error);
    }
  }

  async findPackageById(id: string): Promise<PackageRow | null> {
    const result = await this.db.unsafe('SELECT * FROM packages WHERE id = $1', [id]);
    return (result[0] as unknown as PackageRow) || null;
  }

  async findPackagesBySender(senderId: string): Promise<PackageRow[]> {
    const result = await this.db.unsafe(
      'SELECT * FROM packages WHERE sender_id = $1 ORDER BY created_at DESC',
      [senderId]
    );
    return result as unknown as PackageRow[];
  }

  async findPackagesByStatus(status: string): Promise<PackageRow[]> {
    const result = await this.db.unsafe(
      'SELECT * FROM packages WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    return result as unknown as PackageRow[];
  }

  async updatePackageStatus(id: string, status: string, carrierId?: string): Promise<PackageRow> {
    try {
      let query = 'UPDATE packages SET status = $1, updated_at = NOW()';
      const params: unknown[] = [status, id];
      let paramIndex = 3;

      if (carrierId) {
        query += `, carrier_id = $${paramIndex}`;
        params.push(carrierId);
        paramIndex++;
      }

      if (status === 'picked_up') {
        query += ', picked_up_at = NOW()';
      } else if (status === 'delivered') {
        query += ', delivered_at = NOW()';
      }

      query += ' WHERE id = $2 RETURNING *';
      const result = await this.db.unsafe(query, params as any[]);
      if (!result[0]) {
        throw new NotFoundError('Package');
      }
      return result[0] as unknown as PackageRow;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error({ error, id, status }, 'Failed to update package status');
      throw new InternalError('Failed to update package status', error as Error);
    }
  }

  async assignPackageToTrip(packageId: string, tripId: string, carrierId: string): Promise<PackageRow> {
    try {
      const tripResult = await this.db.unsafe(
        'SELECT available_seats, allows_packages, package_capacity_kg FROM trips WHERE id = $1',
        [tripId]
      );

      if (!tripResult[0]) {
        throw new NotFoundError('Trip');
      }

      const trip = tripResult[0] as unknown as { allows_packages: boolean };
      if (!trip.allows_packages) {
        throw new ValidationError('This trip does not allow packages');
      }

      const result = await this.db.unsafe(
        `UPDATE packages SET trip_id = $1, carrier_id = $2, status = 'matched', updated_at = NOW() WHERE id = $3 RETURNING *`,
        [tripId, carrierId, packageId]
      );

      return result[0] as unknown as PackageRow;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      logger.error({ error, packageId, tripId }, 'Failed to assign package to trip');
      throw new InternalError('Failed to assign package to trip', error as Error);
    }
  }

  async findPackagesForRoute(originCity: string, destinationCity: string): Promise<PackageRow[]> {
    const result = await this.db.unsafe(
      `SELECT p.* FROM packages p
       JOIN trips t ON p.trip_id = t.id
       WHERE p.origin_name ILIKE $1 AND p.destination_name ILIKE $2
       AND p.status IN ('created', 'matched')
       AND t.status IN ('posted', 'open')
       ORDER BY p.created_at DESC`,
      [`%${originCity}%`, `%${destinationCity}%`]
    );
    return result as unknown as PackageRow[];
  }

  private async estimateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): Promise<number> {
    const result = await this.db.unsafe(
      `SELECT ST_Distance(
        ST_MakePoint($1, $2)::geography,
        ST_MakePoint($3, $4)::geography
      ) / 1000.0 as distance`,
      [from.lng, from.lat, to.lng, to.lat]
    );
    return Number(result[0]?.distance || 0);
  }

  private calculateFee(size: string, distanceKm: number): number {
    const baseFees: Record<string, number> = {
      small: 2.0,
      medium: 3.0,
      large: 5.0,
      extra_large: 8.0,
    };
    const perKm: Record<string, number> = {
      small: 0.012,
      medium: 0.015,
      large: 0.020,
      extra_large: 0.025,
    };
    const base = baseFees[size] || 3.0;
    const distanceCharge = (perKm[size] || 0.015) * distanceKm;
    return Math.round((base + distanceCharge) * 100) / 100;
  }
}

export const packageRepository = new PackageRepository();
