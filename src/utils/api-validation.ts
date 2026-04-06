/**
 * API Response Validation Schemas
 * Uses Zod for runtime validation of API responses
 * Ensures type safety and catches breaking changes
 */

import { z } from 'zod';

/**
 * Base schemas
 */
const DateSchema = z.string().datetime().or(z.date());

const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
});

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  name: z.string(),
  avatar: z.string().url().optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema.optional(),
});

/**
 * Trip/Ride schemas
 */
export const TripSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  startLocation: LocationSchema,
  endLocation: LocationSchema,
  status: z.enum(['available', 'in_progress', 'completed', 'cancelled']),
  distance: z.number().min(0),
  duration: z.number().min(0), // seconds
  price: z.number().min(0),
  currency: z.string().length(3),
  maxPassengers: z.number().min(1).max(8),
  currentPassengers: z.number().min(0),
  departureTime: DateSchema,
  arrivalTime: DateSchema.optional(),
  vehicle: z.object({
    plate: z.string(),
    model: z.string(),
    color: z.string(),
  }).optional(),
  notes: z.string().optional(),
});

export type Trip = z.infer<typeof TripSchema>;

/**
 * Booking schemas
 */
export const BookingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tripId: z.string(),
  status: z.enum(['pending', 'confirmed', 'paid', 'completed', 'cancelled']),
  passengers: z.number().min(1).max(8),
  totalPrice: z.number().min(0),
  currency: z.string().length(3),
  specialRequests: z.string().optional(),
  createdAt: DateSchema,
  confirmedAt: DateSchema.optional(),
  cancelledAt: DateSchema.optional(),
  paymentStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

/**
 * Payment schemas
 */
export const PaymentSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  userId: z.string(),
  amount: z.number().min(0),
  currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  method: z.enum(['card', 'wallet', 'bank_transfer', 'cash']),
  stripePaymentIntentId: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: DateSchema,
  completedAt: DateSchema.optional(),
  transactionId: z.string().optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

/**
 * Authentication schemas
 */
export const AuthSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    email_confirmed_at: DateSchema.optional(),
    phone_confirmed_at: DateSchema.optional(),
    phone: z.string().optional(),
  }),
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number().min(0),
    token_type: z.enum(['bearer']),
    user: z.object({
      id: z.string(),
    }).optional(),
  }),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  statusCode: z.number().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * List response schema
 */
export const ListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    hasMore: z.boolean().optional(),
  });

/**
 * Paginated response helper
 */
export function createListSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return ListResponseSchema(itemSchema);
}

/**
 * Validator function to validate API responses
 */
export function validateResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      throw new Error(`Response validation failed: ${JSON.stringify(details)}`);
    }
    throw error;
  }
}

/**
 * Safe validation - returns parsed data or throws typed error
 */
export function safeValidateResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    return {
      success: true,
      data: schema.parse(data),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
