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

export const CreateScheduledPickupSchema = z.object({
  itemType: z.enum(['ride', 'package_delivery', 'package_return']),
  pickupLocation: z.string().min(2).max(200),
  pickupLat: z.number().finite().min(-90).max(90),
  pickupLng: z.number().finite().min(-180).max(180),
  dropoffLocation: z.string().max(200).optional(),
  dropoffLat: z.number().finite().min(-90).max(90).optional(),
  dropoffLng: z.number().finite().min(-180).max(180).optional(),
  scheduledAt: z.string().datetime(),
  recurringPattern: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).optional(),
  notes: z.string().max(500).optional(),
  contactName: z.string().max(100).optional(),
  contactPhone: z.string().max(20).optional(),
});

export type CreateScheduledPickupInput = z.infer<typeof CreateScheduledPickupSchema>;

export const UpdateScheduledPickupSchema = z.object({
  pickupId: z.string().uuid(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'missed']).optional(),
  scheduledAt: z.string().datetime().optional(),
  recurringPattern: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).optional(),
  notes: z.string().max(500).optional(),
  cancellationReason: z.string().max(200).optional(),
});

export type UpdateScheduledPickupInput = z.infer<typeof UpdateScheduledPickupSchema>;

export const BusSearchSchema = z.object({
  origin: z.string().min(2).max(100),
  destination: z.string().min(2).max(100),
  date: z.string().optional(),
  seats: z.number().int().min(1).max(20).optional(),
});

export type BusSearchInput = z.infer<typeof BusSearchSchema>;

export const BusBookSchema = z.object({
  routeId: z.string(),
  seats: z.number().int().min(1).max(20),
  scheduleDate: z.string(),
  departureTime: z.string(),
  pickupStop: z.string().min(2).max(100),
  dropoffStop: z.string().min(2).max(100),
  seatPreference: z.string().max(50).optional(),
});

export type BusBookInput = z.infer<typeof BusBookSchema>;

export const ActivityQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
  type: z.enum(['ride', 'package', 'bus', 'payment']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export type ActivityQueryInput = z.infer<typeof ActivityQuerySchema>;
