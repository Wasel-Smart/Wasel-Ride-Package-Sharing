import { z } from 'zod';

export const BOOKINGS_CONTRACT_VERSION = '2026-04-15';

export const bookingRecordSchema = z
  .object({
    id: z.string().min(1),
    tripId: z.string().min(1).optional(),
    trip_id: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    user_id: z.string().min(1).optional(),
    seatsRequested: z.number().int().positive().optional(),
    seats_requested: z.number().int().positive().optional(),
    status: z.string().min(1).optional(),
    booking_status: z.string().min(1).optional(),
    createdAt: z.string().min(1).optional(),
    created_at: z.string().min(1).optional(),
  })
  .passthrough();

export const bookingListSchema = z.array(bookingRecordSchema);
