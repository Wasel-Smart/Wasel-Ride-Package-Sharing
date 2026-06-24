import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  AppError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../middleware/errors.js';
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

function generateRequestId(req: Request): string {
  return (req as Request & { requestId?: string }).requestId ?? 'unknown';
}

function generateTraceId(req: Request): string | undefined {
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

router.post('/rides', requireRole(['rider', 'admin', 'driver']), validate(CreateRideSchema), async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId ?? 'unknown';
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

router.get('/rides/search', validateQuery(SearchRidesSchema), async (req: Request, res: Response) => {
  const params = SearchRidesSchema.parse(req.query);
  const userId = (req as Request & { userId?: string }).userId;
  const results = Array.from(fakeRides.values())
    .filter((r: Record<string, unknown>) => (r.riderId as string) !== userId)
    .slice(0, params.limit ?? 20);

  res.json({
    success: true,
    data: { rides: results.map(rideResponse), total: results.length, pagination: { limit: params.limit ?? 20, offset: 0 } },
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.get('/rides/status/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const ride = fakeRides.get(id);
  if (!ride) {
    res.json({
      success: true,
      data: null,
      metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
    });
    return;
  }

  res.json({
    success: true,
    data: rideResponse(ride),
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/rides/schedule', requireRole(['rider', 'admin']), validate(ScheduleRideSchema), async (req: Request, res: Response) => {
  const { rideId, scheduledFor } = req.body;
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
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/rides/cancel', requireRole(['rider', 'admin', 'driver']), validate(CancelRideSchema), async (_req: Request, res: Response) => {
  res.status(204).send();
});

router.patch('/rides/:id', authenticate, validate(CreateRideSchema.partial()), async (req: Request, res: Response) => {
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

router.get('/payments/methods/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const method = fakePaymentMethods.get(id);
  if (!method) throw new NotFoundError('Payment method not found');

  res.json({
    success: true,
    data: method,
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/payments/charge', requireRole(['rider', 'admin']), validate(PaymentChargeSchema), async (req: Request, res: Response) => {
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

router.post('/payments/refund', requireRole(['rider', 'admin', 'operator']), validate(PaymentRefundSchema), async (req: Request, res: Response) => {
  const { reason } = req.body;
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const response = {
    id: refundId,
    paymentId: req.body.paymentId,
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

router.post('/payments/verify', authenticate, validate(PaymentVerifySchema), async (req: Request, res: Response) => {
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

router.get('/scheduled-pickups', authenticate, validateQuery(ActivityQuerySchema), async (req: Request, res: Response) => {
  const { limit, offset, type } = ActivityQuerySchema.parse(req.query);
  const userId = (req as Request & { userId?: string }).userId;
  const take = limit ?? 20;
  const skip = offset ?? 0;

  const userPickups = Array.from(fakeScheduledPickups.values())
    .filter((p: Record<string, unknown>) => (p.userId as string) === userId)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(b.scheduledAt as string).getTime() - new Date(a.scheduledAt as string).getTime()
    );

  const page = userPickups.slice(skip, skip + take);

  res.json({
    success: true,
    data: {
      pickups: page.map(scheduledPickupResponse),
      total: userPickups.length,
      pagination: { limit: take, offset: skip, hasMore: skip + take < userPickups.length },
    },
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/scheduled-pickups', authenticate, validate(CreateScheduledPickupSchema), async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId;
  const pickupId = `pickup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const pickup: Record<string, unknown> = {
    id: pickupId,
    userId,
    itemType: req.body.itemType,
    status: 'scheduled',
    pickupLocation: req.body.pickupLocation,
    pickupLat: req.body.pickupLat,
    pickupLng: req.body.pickupLng,
    dropoffLocation: req.body.dropoffLocation ?? null,
    dropoffLat: req.body.dropoffLat ?? null,
    dropoffLng: req.body.dropoffLng ?? null,
    scheduledAt: req.body.scheduledAt,
    recurringPattern: req.body.recurringPattern ?? 'none',
    notes: req.body.notes ?? null,
    contactName: req.body.contactName ?? null,
    contactPhone: req.body.contactPhone ?? null,
    createdAt: now,
    updatedAt: now,
  };

  fakeScheduledPickups.set(pickupId, pickup);

  res.status(201).json({
    success: true,
    data: scheduledPickupResponse(pickup),
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.put('/scheduled-pickups/:id', authenticate, validate(UpdateScheduledPickupSchema), async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId;
  const { id } = req.params;
  const pickup = fakeScheduledPickups.get(id);

  if (!pickup) throw new NotFoundError('Scheduled pickup not found');
  if ((pickup.userId as string) !== userId) {
    throw new ForbiddenError('Not authorized to modify this pickup');
  }

  if (req.body.status) pickup.status = req.body.status;
  if (req.body.scheduledAt) pickup.scheduledAt = req.body.scheduledAt;
  if (req.body.recurringPattern) pickup.recurringPattern = req.body.recurringPattern;
  if (req.body.notes !== undefined) pickup.notes = req.body.notes;
  if (req.body.status === 'cancelled') {
    pickup.cancelledAt = new Date().toISOString();
    pickup.cancellationReason = req.body.cancellationReason ?? null;
  }
  pickup.updatedAt = new Date().toISOString();

  fakeScheduledPickups.set(id, pickup);

  res.json({
    success: true,
    data: scheduledPickupResponse(pickup),
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.delete('/scheduled-pickups/:id', authenticate, async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId;
  const { id } = req.params;
  const pickup = fakeScheduledPickups.get(id);

  if (!pickup) throw new NotFoundError('Scheduled pickup not found');
  if ((pickup.userId as string) !== userId) {
    throw new ForbiddenError('Not authorized to delete this pickup');
  }

  fakeScheduledPickups.delete(id);

  res.status(204).send();
});

router.get('/bus/routes', validateQuery(BusSearchSchema), async (req: Request, res: Response) => {
  const params = BusSearchSchema.parse(req.query);

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
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.post('/bus/bookings', authenticate, validate(BusBookSchema), async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId;
  const bookingId = `bus_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const ticketCode = `BUS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const now = new Date().toISOString();
  const route = fakeBusRoutes.find(
    (r: Record<string, unknown>) => (r.routeId as string) === req.body.routeId
  );

  const booking = {
    id: bookingId,
    userId,
    routeId: req.body.routeId,
    route: route ?? null,
    seats: req.body.seats,
    scheduleDate: req.body.scheduleDate,
    departureTime: req.body.departureTime,
    pickupStop: req.body.pickupStop,
    dropoffStop: req.body.dropoffStop,
    seatPreference: req.body.seatPreference ?? 'any',
    totalPrice: route ? ((route.price as number) * req.body.seats) : 0,
    ticketCode,
    status: 'confirmed',
    source: 'server',
    createdAt: now,
    updatedAt: now,
  };

  res.status(201).json({
    success: true,
    data: { booking, ticketCode, bookingId },
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

router.get('/activity', authenticate, validateQuery(ActivityQuerySchema), async (req: Request, res: Response) => {
  const params = ActivityQuerySchema.parse(req.query);
  const userId = (req as Request & { userId?: string }).userId;
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const activityItems: Array<Record<string, unknown>> = [];

  fakeRides.forEach((ride: Record<string, unknown>) => {
    if ((ride.riderId as string) === userId) {
      const requestedAt = ride.requestedAt as string;
      activityItems.push({
        id: ride.id,
        type: 'ride',
        status: ride.status,
        title: 'Ride',
        subtitle: `${ride.origin?.address ?? 'Unknown'} → ${ride.destination?.address ?? 'Unknown'}`,
        date: requestedAt.split('T')[0],
        time: requestedAt.split('T')[1].slice(0, 5),
        amount: ride.fare ?? 0,
        createdAt: ride.requestedAt,
      });
    }
  });

  fakeScheduledPickups.forEach((pickup: Record<string, unknown>) => {
    if ((pickup.userId as string) === userId) {
      const scheduledAt = pickup.scheduledAt as string;
      activityItems.push({
        id: pickup.id,
        type: 'scheduled',
        status: pickup.status,
        title: `${String(pickup.itemType)} pickup`,
        subtitle: `${String(pickup.pickupLocation)}${pickup.dropoffLocation ? ' → ' + String(pickup.dropoffLocation) : ''}`,
        date: scheduledAt.split('T')[0],
        time: scheduledAt.split('T')[1].slice(0, 5),
        amount: (pickup.estimatedPrice as number | undefined) ?? 0,
        createdAt: pickup.createdAt,
      });
    }
  });

  activityItems.sort((a, b) =>
    new Date((b.createdAt as string) ?? '').getTime() - new Date((a.createdAt as string) ?? '').getTime()
  );

  let filtered = activityItems;
  if (params.type) {
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
    metadata: { requestId: generateRequestId(req), timestamp: new Date().toISOString(), version: 'v1', traceId: generateTraceId(req) },
  });
});

export default router;
