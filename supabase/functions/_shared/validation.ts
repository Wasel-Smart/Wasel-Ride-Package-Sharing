/**
 * Input Validation Schemas — Supabase Edge Function shared utility
 *
 * Architecture:
 *  - All user-supplied inputs are validated with Zod before reaching the DB.
 *  - Coordinates are validated as finite numbers within real-world bounds.
 *  - Text fields are trimmed and length-capped to prevent oversized payloads.
 *  - Enum fields are validated against explicit allowlists.
 *  - The DB functions are the last line of defence; this layer provides
 *    fast rejection with structured error messages before any DB round-trip.
 *
 * Usage:
 *   import { BookingCreateSchema, parseOrReject } from '../_shared/validation.ts';
 *
 *   const body = await req.json();
 *   const parsed = parseOrReject(BookingCreateSchema, body);
 *   if (parsed instanceof Response) return parsed;  // 400 with error details
 *   // parsed is now fully typed and validated
 */

// Deno-compatible Zod import
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// ── Geo primitives ────────────────────────────────────────────────────────────

export const LatitudeSchema = z
  .number({ invalid_type_error: 'latitude must be a number' })
  .finite()
  .min(-90,  'latitude must be >= -90')
  .max(90,   'latitude must be <= 90');

export const LongitudeSchema = z
  .number({ invalid_type_error: 'longitude must be a number' })
  .finite()
  .min(-180, 'longitude must be >= -180')
  .max(180,  'longitude must be <= 180');

export const GeoPointSchema = z.object({
  lat: LatitudeSchema,
  lng: LongitudeSchema,
});

// Jordan/Iraq bounding box — reject coordinates outside the service area
const JORDAN_IRAQ_BBOX = {
  minLat: 28.0, maxLat: 38.0,
  minLng: 34.0, maxLng: 49.0,
} as const;

export const ServiceAreaGeoPointSchema = GeoPointSchema.refine(
  (p: { lat: number; lng: number }) =>
    p.lat >= JORDAN_IRAQ_BBOX.minLat && p.lat <= JORDAN_IRAQ_BBOX.maxLat &&
    p.lng >= JORDAN_IRAQ_BBOX.minLng && p.lng <= JORDAN_IRAQ_BBOX.maxLng,
  { message: 'Coordinates are outside the Wasel service area (Jordan/Iraq)' },
);

// ── Text sanitization helpers ─────────────────────────────────────────────────

/** Trims whitespace and rejects strings containing SQL/script injection patterns. */
function safeText(maxLen: number) {
  return z
    .string()
    .trim()
    .max(maxLen, `Must be at most ${maxLen} characters`)
    .refine(
      (s: string) => !/[<>'"`;\\]/.test(s),
      'Input contains disallowed characters',
    );
}

// ── UUID ──────────────────────────────────────────────────────────────────────

export const UUIDSchema = z
  .string()
  .uuid('Must be a valid UUID');

// ── Booking schemas ───────────────────────────────────────────────────────────

export const BookingStatusSchema = z.enum([
  'pending_driver',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
]);

export const BookingCreateSchema = z.object({
  trip_id:          UUIDSchema,
  passenger_id:     UUIDSchema,
  seats_requested:  z.number().int().min(1).max(8),
  pickup_location:  safeText(500),
  dropoff_location: safeText(500),
  booking_status:   z.enum(['pending_driver', 'confirmed']),
  total_price:      z.number().finite().min(0).max(10_000),
});

export const BookingUpdateSchema = z.object({
  booking_id: UUIDSchema,
  new_status: z.enum(['confirmed', 'rejected', 'cancelled', 'completed']),
});

// ── Ride request schema ───────────────────────────────────────────────────────

export const RideRequestSchema = z.object({
  origin: z.object({
    latitude:  LatitudeSchema,
    longitude: LongitudeSchema,
    address:   safeText(500),
  }),
  destination: z.object({
    latitude:  LatitudeSchema,
    longitude: LongitudeSchema,
    address:   safeText(500),
  }),
  seats:                  z.number().int().min(1).max(8),
  scheduled_for:          z.string().datetime({ offset: true }).optional(),
  preferred_vehicle_type: z.enum(['sedan', 'suv', 'van', 'bus']).optional(),
  notes:                  safeText(1000).optional(),
});

// ── Demand alert schema ───────────────────────────────────────────────────────

export const DemandAlertSchema = z.object({
  origin_lat:       LatitudeSchema,
  origin_lng:       LongitudeSchema,
  destination_lat:  LatitudeSchema,
  destination_lng:  LongitudeSchema,
  origin_city:      safeText(100).optional(),
  destination_city: safeText(100).optional(),
  requested_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  seats_needed:     z.number().int().min(1).max(8).default(1),
});

// ── Location update schema (WebSocket payload) ────────────────────────────────

export const LocationUpdateSchema = z.object({
  latitude:  LatitudeSchema,
  longitude: LongitudeSchema,
  accuracy:  z.number().finite().min(0).max(10_000).optional(),
  speed:     z.number().finite().min(0).max(300).nullable().optional(), // max 300 km/h
  heading:   z.number().finite().min(0).max(360).nullable().optional(),
  timestamp: z.number().int().positive(),
});

// ── Rating schema ─────────────────────────────────────────────────────────────

export const RatingSchema = z.object({
  booking_id: UUIDSchema,
  rating:     z.number().int().min(1).max(5),
  feedback:   safeText(2000).optional(),
});

// ── Idempotency key schema ────────────────────────────────────────────────────

export const IdempotencyKeySchema = z
  .string()
  .regex(/^[a-zA-Z0-9_\-]{1,128}$/, 'Invalid idempotency key format');

// ── parseOrReject helper ──────────────────────────────────────────────────────

/**
 * Validates `data` against `schema`.
 * Returns the parsed value on success.
 * Returns a 400 Response with structured error details on failure.
 *
 * Usage:
 *   const parsed = parseOrReject(BookingCreateSchema, body);
 *   if (parsed instanceof Response) return parsed;
 */
export function parseOrReject<T>(
  schema: unknown,
  data: unknown,
): T | Response {
  const result = (schema as { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { errors: Array<{ path: Array<string | number>; message: string; code: string }> } } }).safeParse(data);
  if (result.success) return result.data as T;

  const errors = (result.error ?? { errors: [] }).errors.map((e: { path: Array<string | number>; message: string; code: string }) => ({
    field:   e.path.join('.'),
    message: e.message,
    code:    e.code,
  }));

  return new Response(
    JSON.stringify({ error: 'Validation failed', details: errors }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  );
}

// ── Type exports ──────────────────────────────────────────────────────────────
// Previously these were all widened to `any`, which defeated the point of
// validating with Zod in the first place — callers got no compile-time
// guarantee that a "validated" booking actually has the shape the schema
// enforces. Infer the real types from the schemas instead.

export type BookingCreate   = z.infer<typeof BookingCreateSchema>;
export type BookingUpdate   = z.infer<typeof BookingUpdateSchema>;
export type RideRequest     = z.infer<typeof RideRequestSchema>;
export type DemandAlert     = z.infer<typeof DemandAlertSchema>;
export type LocationUpdate  = z.infer<typeof LocationUpdateSchema>;
export type Rating          = z.infer<typeof RatingSchema>;
export type GeoPoint        = z.infer<typeof GeoPointSchema>;
