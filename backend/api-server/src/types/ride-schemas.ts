import { z } from 'zod';

export const CreateRideSchema = z.object({
  riderId: z.string().uuid().optional(),
  originLat: z.number().finite().min(-90).max(90),
  originLng: z.number().finite().min(-180).max(180),
  originAddress: z.string().min(2).max(200),
  destLat: z.number().finite().min(-90).max(90),
  destLng: z.number().finite().min(-180).max(180),
  destAddress: z.string().min(2).max(200),
  seats: z.number().int().min(1).max(8),
  preferredVehicleType: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateRideInput = z.infer<typeof CreateRideSchema>;

export const ScheduleRideSchema = z.object({
  rideId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
});

export type ScheduleRideInput = z.infer<typeof ScheduleRideSchema>;

export const CancelRideSchema = z.object({
  rideId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

export type CancelRideInput = z.infer<typeof CancelRideSchema>;

export const SearchRidesSchema = z.object({
  originLat: z.number().finite().min(-90).max(90),
  originLng: z.number().finite().min(-180).max(180),
  destLat: z.number().finite().min(-90).max(90).optional(),
  destLng: z.number().finite().min(-180).max(180).optional(),
  radiusKm: z.number().positive().max(20).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type SearchRidesInput = z.infer<typeof SearchRidesSchema>;
