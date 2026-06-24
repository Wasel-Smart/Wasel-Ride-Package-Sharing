import { z } from 'zod';
export const CoordinateSchema = z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
});
export const RideRequestSchema = z.object({
    rideId: z.string().uuid(),
    origin: CoordinateSchema,
    destination: CoordinateSchema,
    seats: z.number().int().min(1).max(8),
    riderId: z.string().uuid().optional(),
    requestedAt: z.string().datetime().optional(),
});
export const PaymentAuthorizationSchema = z.object({
    paymentId: z.string().uuid(),
    providerId: z.string(),
    amount: z.number().int().positive(),
    currency: z.string().length(3),
    rideId: z.string().uuid().optional(),
    packageId: z.string().uuid().optional(),
    escrowStatus: z.enum(['authorized', 'released', 'cancelled']).optional(),
});
export const PaymentRefundSchema = z.object({
    paymentId: z.string().uuid(),
    amount: z.number().int().positive(),
    reason: z.string().optional(),
});
const EventEnvelopeSchema = z.object({
    id: z.string().optional(),
    type: z.string(),
    payload: z.record(z.unknown()),
    producer: z.string().optional(),
    traceId: z.string().optional(),
    occurredAt: z.string().optional(),
});
export const RideCompletionSchema = z.object({
    rideId: z.string().uuid(),
    driverId: z.string().uuid(),
    riderId: z.string().uuid(),
    fare: z.number().nonNegative(),
    distance: z.number().nonNegative(),
    duration: z.number().nonNegative(),
    origin: CoordinateSchema,
    destination: CoordinateSchema,
    completedAt: z.string().datetime(),
});
export const PaymentCaptureSchema = z.object({
    paymentId: z.string().uuid(),
    rideId: z.string().uuid().optional(),
    packageId: z.string().uuid().optional(),
    capturedAmount: z.number().int().nonNegative(),
    providerTransactionId: z.string(),
    capturedAt: z.string().datetime(),
});
