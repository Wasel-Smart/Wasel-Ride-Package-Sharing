import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError, NotFoundError, ConflictError } from '../middleware/errors.js';
import {
  CreateRideSchema,
  CancelRideSchema,
  ScheduleRideSchema,
  SearchRidesSchema,
  PaymentChargeSchema,
  PaymentRefundSchema,
  PaymentVerifySchema,
} from '../types/index.js';

const router = Router();
const fakeRides = new Map();
const fakePaymentMethods = new Map();

function generateRequestId(req: Express.Request): string {
  return (req as Express.Request & { requestId?: string }).requestId ?? 'unknown';
}

function generateTraceId(req: Express.Request): string | undefined {
  return (req.headers['x-trace-id'] as string | undefined) ?? undefined;
}

function rideResponse(ride: Record<string, unknown>) {
  return {
    id: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId ?? null,
    vehicleId: ride.vehicleId ?? null,
    origin: ride.origin,
    destination: ride.destination,
    status: ride.status,
    seats: ride.seats,
    fare: ride.fare,
    distance: ride.distance,
    duration: ride.duration,
    requestedAt: ride.requestedAt,
    matchedAt: ride.matchedAt ?? null,
    startedAt: ride.startedAt ?? null,
    completedAt: ride.completedAt ?? null,
    cancelledAt: ride.cancelledAt ?? null,
  };
}

router.use(authenticate);

router.post('/rides', requireRole(['rider', 'admin', 'driver']), validate(CreateRideSchema), async (req: any, res) => {
  const userId = req.userId ?? 'unknown';
  const rideId = `ride_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const ride: Record<string, unknown> = {
    id: rideId,
    riderId: userId,
    driverId: null,
    vehicleId: null,
    origin: {
      latitude: req.body.originLat,
      longitude: req.body.originLng,
      address: req.body.originAddress,
    },
    destination: {
      latitude: req.body.destLat,
      longitude: req.body.destLng,
      address: req.body.destAddress,
    },
    status: 'requested',
    seats: req.body.seats,
    requestedAt: new Date().toISOString(),
  };

  fakeRides.set(rideId, ride);
  res.status(201).json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.get('/rides/search', async (req: any, res) => {
  const params = SearchRidesSchema.parse({
    originLat: req.query.originLat,
    originLng: req.query.originLng,
    destLat: req.query.destLat,
    destLng: req.query.destLng,
    radiusKm: req.query.radiusKm,
    limit: req.query.limit,
  });

  res.json({
    success: true,
    data: { rides: [], total: 0, pagination: { limit: params.limit ?? 20, offset: 0 } },
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.get('/rides/status/:id', async (req: any, res) => {
  const { id } = req.params;
  const ride = fakeRides.get(id);
  if (!ride) throw new NotFoundError('Ride not found');

  res.json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/rides/schedule', requireRole(['rider', 'admin']), validate(ScheduleRideSchema), async (req: any, res) => {
  const { rideId, scheduledFor } = req.body;
  const ride = fakeRides.get(rideId);
  if (!ride) throw new NotFoundError('Ride not found');
  if ((ride.status as string) !== 'requested') throw new ConflictError('Ride cannot be scheduled in current status');

  ride.status = 'scheduled';
  ride.scheduledFor = scheduledFor;
  fakeRides.set(rideId, ride);

  res.json({
    success: true,
    data: { rideId, status: 'scheduled' },
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/rides/cancel', requireRole(['rider', 'admin', 'driver']), validate(CancelRideSchema), async (req: any, res) => {
  const { rideId } = req.body;
  const ride = fakeRides.get(rideId);
  if (!ride) throw new NotFoundError('Ride not found');
  if (['completed', 'cancelled'].includes(ride.status as string)) throw new ConflictError('Ride is already terminal');

  ride.status = 'cancelled';
  ride.cancelledAt = new Date().toISOString();
  fakeRides.set(rideId, ride);

  res.status(204).send();
});

router.patch('/rides/:id', authenticate, validate(CreateRideSchema.partial()), async (req: any, res) => {
  const { id } = req.params;
  const ride = fakeRides.get(id);
  if (!ride) throw new NotFoundError('Ride not found');

  Object.assign(ride, req.body);
  fakeRides.set(id, ride);

  res.json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.get('/payments/methods/:id', authenticate, async (req: any, res) => {
  const { id } = req.params;
  const method = fakePaymentMethods.get(id);
  if (!method) throw new NotFoundError('Payment method not found');

  res.json({
    success: true,
    data: method,
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/payments/charge', requireRole(['rider', 'admin']), validate(PaymentChargeSchema), async (req: any, res) => {
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const response = {
    id: paymentId,
    status: 'succeeded',
    amount: req.body.amount,
    currency: req.body.currency,
    provider: 'stripe',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: response,
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/payments/refund', requireRole(['rider', 'admin', 'operator']), validate(PaymentRefundSchema), async (req: any, res) => {
  const { paymentId, reason } = req.body;
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const response = {
    id: refundId,
    paymentId,
    status: 'succeeded',
    amount: req.body.amount ?? 1000,
    reason,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: response,
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/payments/verify', authenticate, validate(PaymentVerifySchema), async (req: any, res) => {
  const response = {
    verified: true,
    providerTransactionId: req.body.providerTransactionId,
    status: 'succeeded',
    verifiedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: response,
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

export default router;
