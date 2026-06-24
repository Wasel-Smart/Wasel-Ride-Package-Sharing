import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateQuery } from '../middleware/validate.js';
import {
  CreateRideSchema,
  CancelRideSchema,
  ScheduleRideSchema,
  SearchRidesSchema,
  PaymentChargeSchema,
  PaymentRefundSchema,
  PaymentVerifySchema,
  CreateScheduledPickupSchema,
  UpdateScheduledPickupSchema,
  BusSearchSchema,
  BusBookSchema,
  ActivityQuerySchema,
} from '../types/index.js';

const router = Router();
const fakeRides = new Map();
const fakePaymentMethods = new Map();
const fakeScheduledPickups = new Map();
const fakeBusRoutes: Record<string, unknown>[] = [
  {
    routeId: 'bus-001',
    origin: 'Amman',
    destination: 'Irbid',
    departureTime: '08:00',
    arrivalTime: '09:30',
    price: 3.5,
    availableSeats: 24,
    operator: 'JETT',
    amenities: ['wifi', 'ac', 'usb'],
  },
  {
    routeId: 'bus-002',
    origin: 'Amman',
    destination: 'Aqaba',
    departureTime: '09:00',
    arrivalTime: '04:00',
    price: 12.0,
    availableSeats: 18,
    operator: 'JETT',
    amenities: ['wifi', 'ac', 'reclining'],
  },
  {
    routeId: 'bus-003',
    origin: 'Amman',
    destination: 'Salt',
    departureTime: '10:00',
    arrivalTime: '10:45',
    price: 1.5,
    availableSeats: 30,
    operator: 'Salt Bus Co',
    amenities: ['ac'],
  },
  {
    routeId: 'bus-004',
    origin: 'Amman',
    destination: 'Zarqa',
    departureTime: '07:30',
    arrivalTime: '08:00',
    price: 1.0,
    availableSeats: 40,
    operator: 'Zarqa Express',
    amenities: ['ac'],
  },
  {
    routeId: 'bus-005',
    origin: 'Amman',
    destination: 'Madaba',
    departureTime: '11:00',
    arrivalTime: '11:40',
    price: 1.2,
    availableSeats: 28,
    operator: 'Madaba Transit',
    amenities: ['ac', 'wifi'],
  },
];

function generateRequestId(req: Express.Request): string {
  return (req as Express.Request & { requestId?: string }).requestId ?? 'unknown';
}

function generateTraceId(req: Express.Request): string | undefined {
  return req.headers['x-trace-id'] as string | undefined;
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

function scheduledPickupResponse(pickup: Record<string, unknown>) {
  return {
    id: pickup.id,
    userId: pickup.userId,
    itemType: pickup.itemType,
    status: pickup.status,
    pickupLocation: pickup.pickupLocation,
    pickupLat: pickup.pickupLat,
    pickupLng: pickup.pickupLng,
    dropoffLocation: pickup.dropoffLocation ?? null,
    dropoffLat: pickup.dropoffLat ?? null,
    dropoffLng: pickup.dropoffLng ?? null,
    scheduledAt: pickup.scheduledAt,
    recurringPattern: pickup.recurringPattern ?? 'none',
    notes: pickup.notes ?? null,
    contactName: pickup.contactName ?? null,
    contactPhone: pickup.contactPhone ?? null,
    createdAt: pickup.createdAt,
    updatedAt: pickup.updatedAt,
    cancelledAt: pickup.cancelledAt ?? null,
    cancellationReason: pickup.cancellationReason ?? null,
  };
}

router.use(authenticate);

router.post('/rides', requireRole(['rider', 'admin', 'driver']), validate(CreateRideSchema), async (_req: any, res) => {
  const userId = _req.userId ?? 'unknown';
  const rideId = `ride_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const ride: Record<string, unknown> = {
    id: rideId,
    riderId: userId,
    driverId: null,
    vehicleId: null,
    origin: {
      latitude: _req.body.originLat,
      longitude: _req.body.originLng,
      address: _req.body.originAddress,
    },
    destination: {
      latitude: _req.body.destLat,
      longitude: _req.body.destLng,
      address: _req.body.destAddress,
    },
    status: 'requested',
    seats: _req.body.seats,
    requestedAt: new Date().toISOString(),
  };

  fakeRides.set(rideId, ride);
  res.status(201).json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.get('/rides/search', validateQuery(SearchRidesSchema), async (_req: any, res) => {
  const q = _req.query as Record<string, string | number | undefined>;
  const params = SearchRidesSchema.parse({
    originLat: q.originLat,
    originLng: q.originLng,
    destLat: q.destLat,
    destLng: q.destLng,
    radiusKm: q.radiusKm,
    limit: q.limit,
  });

  const results = Array.from(fakeRides.values())
    .filter((r: Record<string, unknown>) => (r.riderId as string) !== (_req.userId as string))
    .slice(0, params.limit ?? 20);

  res.json({
    success: true,
    data: { rides: results.map(rideResponse), total: results.length, pagination: { limit: params.limit ?? 20, offset: 0 } },
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.get('/rides/status/:id', async (_req: any, res) => {
  const { id } = _req.params;
  const ride = fakeRides.get(id);
  if (!ride) {
    res.json({
      success: true,
      data: null,
      metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
    });
    return;
  }

  res.json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/rides/schedule', requireRole(['rider', 'admin']), validate(ScheduleRideSchema), async (_req: any, res) => {
  const { rideId, scheduledFor } = _req.body;
  const ride = fakeRides.get(rideId);
  if (!ride) throw new NotFoundError('Ride not found');
  if ((ride.status as string) !== 'requested') {
    throw new ConflictError('Ride cannot be scheduled in current status');
  }

  ride.status = 'scheduled';
  ride.scheduledFor = scheduledFor;
  fakeRides.set(rideId, ride);

  res.json({
    success: true,
    data: { rideId, status: 'scheduled' },
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/rides/cancel', requireRole(['rider', 'admin', 'driver']), validate(CancelRideSchema), async (_req: any, res) => {
  const { rideId } = _req.body;
  const ride = fakeRides.get(rideId);
  if (!ride) throw new NotFoundError('Ride not found');
  if (['completed', 'cancelled'].includes(ride.status as string)) {
    throw new ConflictError('Ride is already terminal');
  }

  ride.status = 'cancelled';
  ride.cancelledAt = new Date().toISOString();
  fakeRides.set(rideId, ride);

  res.status(204).send();
});

router.patch('/rides/:id', authenticate, validate(CreateRideSchema.partial()), async (_req: any, res) => {
  const { id } = _req.params;
  const ride = fakeRides.get(id);
  if (!ride) throw new NotFoundError('Ride not found');

  Object.assign(ride, _req.body);
  fakeRides.set(id, ride);

  res.json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.get('/payments/methods/:id', authenticate, async (_req: any, res) => {
  const { id } = _req.params;
  const method = fakePaymentMethods.get(id);
  if (!method) throw new NotFoundError('Payment method not found');

  res.json({
    success: true,
    data: method,
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/payments/charge', requireRole(['rider', 'admin']), validate(PaymentChargeSchema), async (_req: any, res) => {
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const response = {
    id: paymentId,
    status: 'succeeded',
    amount: _req.body.amount,
    currency: _req.body.currency,
    provider: 'stripe',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: response,
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/payments/refund', requireRole(['rider', 'admin', 'operator']), validate(PaymentRefundSchema), async (_req: any, res) => {
  const { reason } = _req.body;
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const response = {
    id: refundId,
    paymentId: _req.body.paymentId,
    status: 'succeeded',
    amount: _req.body.amount ?? 1000,
    reason,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: response,
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/payments/verify', authenticate, validate(PaymentVerifySchema), async (_req: any, res) => {
  const response = {
    verified: true,
    providerTransactionId: _req.body.providerTransactionId,
    status: 'succeeded',
    verifiedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: response,
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.get('/scheduled-pickups', authenticate, async (_req: any, res) => {
  const userId = _req.userId;
  const q = _req.query as Record<string, string | number | undefined>;
  const limit = Math.min(q.limit ? Number(q.limit) : 20, 50);
  const offset = q.offset ? Number(q.offset) : 0;

  const userPickups = Array.from(fakeScheduledPickups.values())
    .filter((p: Record<string, unknown>) => (p.userId as string) === userId)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(b.scheduledAt as string).getTime() - new Date(a.scheduledAt as string).getTime()
    );

  const page = userPickups.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      pickups: page.map(scheduledPickupResponse),
      total: userPickups.length,
      pagination: { limit, offset, hasMore: offset + limit < userPickups.length },
    },
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/scheduled-pickups', authenticate, validate(CreateScheduledPickupSchema), async (_req: any, res) => {
  const userId = _req.userId;
  const pickupId = `pickup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const pickup: Record<string, unknown> = {
    id: pickupId,
    userId,
    itemType: _req.body.itemType,
    status: 'scheduled',
    pickupLocation: _req.body.pickupLocation,
    pickupLat: _req.body.pickupLat,
    pickupLng: _req.body.pickupLng,
    dropoffLocation: _req.body.dropoffLocation ?? null,
    dropoffLat: _req.body.dropoffLat ?? null,
    dropoffLng: _req.body.dropoffLng ?? null,
    scheduledAt: _req.body.scheduledAt,
    recurringPattern: _req.body.recurringPattern ?? 'none',
    notes: _req.body.notes ?? null,
    contactName: _req.body.contactName ?? null,
    contactPhone: _req.body.contactPhone ?? null,
    createdAt: now,
    updatedAt: now,
  };

  fakeScheduledPickups.set(pickupId, pickup);

  res.status(201).json({
    success: true,
    data: scheduledPickupResponse(pickup),
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.put('/scheduled-pickups/:id', authenticate, validate(UpdateScheduledPickupSchema), async (_req: any, res) => {
  const userId = _req.userId;
  const { id } = _req.params;
  const pickup = fakeScheduledPickups.get(id);

  if (!pickup) throw new NotFoundError('Scheduled pickup not found');
  if ((pickup.userId as string) !== userId) {
    throw new ForbiddenError('Not authorized to modify this pickup');
  }

  if (_req.body.status) pickup.status = _req.body.status;
  if (_req.body.scheduledAt) pickup.scheduledAt = _req.body.scheduledAt;
  if (_req.body.recurringPattern) pickup.recurringPattern = _req.body.recurringPattern;
  if (_req.body.notes !== undefined) pickup.notes = _req.body.notes;
  if (_req.body.status === 'cancelled') {
    pickup.cancelledAt = new Date().toISOString();
    pickup.cancellationReason = _req.body.cancellationReason ?? null;
  }
  pickup.updatedAt = new Date().toISOString();

  fakeScheduledPickups.set(id, pickup);

  res.json({
    success: true,
    data: scheduledPickupResponse(pickup),
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.delete('/scheduled-pickups/:id', authenticate, async (_req: any, res) => {
  const userId = _req.userId;
  const { id } = _req.params;
  const pickup = fakeScheduledPickups.get(id);

  if (!pickup) throw new NotFoundError('Scheduled pickup not found');
  if ((pickup.userId as string) !== userId) {
    throw new ForbiddenError('Not authorized to delete this pickup');
  }

  fakeScheduledPickups.delete(id);

  res.status(204).send();
});

router.get('/bus/routes', validateQuery(BusSearchSchema), async (_req: any, res) => {
  const q = _req.query as Record<string, string | number | undefined>;
  const params = BusSearchSchema.parse({
    origin: q.origin,
    destination: q.destination,
    date: q.date,
    seats: q.seats,
  });

  let results = [...fakeBusRoutes];
  if (params.origin) {
    const originLower = params.origin.toLowerCase();
    results = results.filter((r: Record<string, unknown>) =>
      ((r.origin as string) ?? '').toLowerCase().includes(originLower)
    );
  }
  if (params.destination) {
    const destLower = params.destination.toLowerCase();
    results = results.filter((r: Record<string, unknown>) =>
      ((r.destination as string) ?? '').toLowerCase().includes(destLower)
    );
  }
  if (params.seats) {
    results = results.filter((r: Record<string, unknown>) =>
      (r.availableSeats as number) >= params.seats!
    );
  }

  res.json({
    success: true,
    data: { routes: results, total: results.length },
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.post('/bus/bookings', authenticate, validate(BusBookSchema), async (_req: any, res) => {
  const userId = _req.userId;
  const bookingId = `bus_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const ticketCode = `BUS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const now = new Date().toISOString();
  const route = fakeBusRoutes.find(
    (r: Record<string, unknown>) => (r.routeId as string) === _req.body.routeId
  );

  const booking = {
    id: bookingId,
    userId,
    routeId: _req.body.routeId,
    route: route ?? null,
    seats: _req.body.seats,
    scheduleDate: _req.body.scheduleDate,
    departureTime: _req.body.departureTime,
    pickupStop: _req.body.pickupStop,
    dropoffStop: _req.body.dropoffStop,
    seatPreference: _req.body.seatPreference ?? 'any',
    totalPrice: route ? ((route.price as number) * _req.body.seats) : 0,
    ticketCode,
    status: 'confirmed',
    source: 'server',
    createdAt: now,
    updatedAt: now,
  };

  res.status(201).json({
    success: true,
    data: { booking, ticketCode, bookingId },
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

router.get('/activity', authenticate, validateQuery(ActivityQuerySchema), async (_req: any, res) => {
  const q = _req.query as Record<string, string | number | undefined>;
  const params = ActivityQuerySchema.parse({
    limit: q.limit,
    offset: q.offset,
    type: q.type,
    fromDate: q.fromDate,
    toDate: q.toDate,
  });

  const userId = _req.userId;
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const activityItems: Record<string, unknown>[] = [];

  fakeRides.forEach((ride: Record<string, unknown>) => {
    if ((ride.riderId as string) === userId) {
      activityItems.push({
        id: ride.id,
        type: 'ride',
        status: ride.status,
        title: 'Ride',
        subtitle: `${ride.origin?.address ?? 'Unknown'} → ${ride.destination?.address ?? 'Unknown'}`,
        date: new Date(ride.requestedAt as string).toISOString().split('T')[0],
        time: new Date(ride.requestedAt as string).toISOString().split('T')[1].slice(0, 5),
        amount: ride.fare ?? 0,
        createdAt: ride.requestedAt,
      });
    }
  });

  fakeScheduledPickups.forEach((pickup: Record<string, unknown>) => {
    if ((pickup.userId as string) === userId) {
      activityItems.push({
        id: pickup.id,
        type: 'scheduled',
        status: pickup.status,
        title: `${pickup.itemType as string} pickup`,
        subtitle: `${pickup.pickupLocation as string}${pickup.dropoffLocation ? ' → ' + (pickup.dropoffLocation as string) : ''}`,
        date: new Date(pickup.scheduledAt as string).toISOString().split('T')[0],
        time: new Date(pickup.scheduledAt as string).toISOString().split('T')[1].slice(0, 5),
        amount: pickup.estimatedPrice ?? 0,
        createdAt: pickup.createdAt,
      });
    }
  });

  activityItems.sort((a, b) =>
    new Date((b.createdAt as string) ?? '').getTime() - new Date((a.createdAt as string) ?? '').getTime()
  );

  let filtered = activityItems;
  if (params.type && params.type !== 'payment') {
    filtered = activityItems.filter((item: Record<string, unknown>) =>
      (item.type as string) === params.type
    );
  }
  if (params.fromDate) {
    filtered = filtered.filter((item: Record<string, unknown>) =>
      (item.date as string) >= (params.fromDate as string).split('T')[0]
    );
  }
  if (params.toDate) {
    filtered = filtered.filter((item: Record<string, unknown>) =>
      (item.date as string) <= (params.toDate as string).split('T')[0]
    );
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  res.json({
    success: true,
    data: { items: page, total, pagination: { limit, offset, hasMore: offset + limit < total } },
    metadata: { requestId: generateRequestId(_req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(_req) },
  });
});

export default router;
