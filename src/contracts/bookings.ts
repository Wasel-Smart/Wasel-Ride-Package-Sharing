import { z } from 'zod';

export const BOOKINGS_CONTRACT_VERSION = '2026-04-15';

export type BookingRecord = {
  id: string;
  tripId?: string;
  trip_id?: string;
  userId?: string;
  user_id?: string;
  seatsRequested?: number;
  seats_requested?: number;
  status?: string;
  booking_status?: string;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
};

export const bookingRecordSchema: z.ZodType<BookingRecord> = z
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

export const bookingMutationEnvelopeSchema = z.union([
  bookingRecordSchema,
  z.object({
    booking: bookingRecordSchema,
  }),
]);

export type BookingList = z.infer<typeof bookingListSchema>;
export type BookingMutationEnvelope = z.infer<typeof bookingMutationEnvelopeSchema>;
