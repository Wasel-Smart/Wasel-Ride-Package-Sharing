import { z } from 'zod';

export const RIDE_LIFECYCLE_CONTRACT_VERSION = '2026-04-15';

export const rideBookingStatusSchema = z.enum([
  'pending_driver',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
]);

export const ridePaymentStatusSchema = z.enum([
  'pending',
  'authorized',
  'captured',
  'refunded',
  'failed',
]);

export const rideBookingSyncStateSchema = z.enum([
  'local-only',
  'syncing',
  'synced',
  'sync-error',
]);

export const rideBookingRecordSchema = z
  .object({
    id: z.string().min(1),
    rideId: z.string().min(1),
    ownerId: z.string().min(1).optional(),
    driverPhone: z.string().min(1).optional(),
    driverEmail: z.string().email().optional(),
    from: z.string().min(1),
    to: z.string().min(1),
    date: z.string().min(1),
    time: z.string().min(1),
    driverName: z.string().min(1),
    passengerName: z.string().min(1),
    passengerPhone: z.string().min(1).optional(),
    passengerEmail: z.string().email().optional(),
    seatsRequested: z.number().int().positive(),
    status: rideBookingStatusSchema,
    paymentStatus: ridePaymentStatusSchema,
    routeMode: z.enum(['live_post', 'network_inventory']),
    supportThreadOpen: z.boolean(),
    ticketCode: z.string().regex(/^RIDE-[A-Z0-9-]{4,}$/),
    pricePerSeatJod: z.number().finite().optional(),
    totalPriceJod: z.number().finite().optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    backendBookingId: z.string().min(1).optional(),
    syncedAt: z.string().min(1).optional(),
    pendingSync: z.boolean().optional(),
    syncState: rideBookingSyncStateSchema.optional(),
  })
  .passthrough();

export const rideBookingListSchema = z.array(rideBookingRecordSchema);

export type RideBookingRecordContract = z.infer<typeof rideBookingRecordSchema>;
