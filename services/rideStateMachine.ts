import { enqueue, jobs } from './jobQueue';
import { trackBusinessEvent } from './businessEvents';

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHING'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

const TRANSITIONS: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['DRIVER_ASSIGNED', 'FAILED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['DRIVER_ARRIVING', 'CANCELLED'],
  DRIVER_ARRIVING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: ['MATCHING'],
};

type RideEvent = {
  rideId: string;
  fromStatus?: RideStatus;
  toStatus: RideStatus;
  actorId?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
};

type StoredRideEvent = RideEvent & {
  createdAt: string;
  eventType: string;
};

const rideEventHistory = new Map<string, StoredRideEvent[]>();

export function canTransition(from: RideStatus, to: RideStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

function appendRideEvent(event: RideEvent): void {
  const existing = rideEventHistory.get(event.rideId) ?? [];
  existing.push({
    ...event,
    createdAt: new Date().toISOString(),
    eventType: `ride.${event.toStatus.toLowerCase()}`,
  });
  rideEventHistory.set(event.rideId, existing);
}

export async function transitionRide(event: RideEvent): Promise<void> {
  const { rideId, fromStatus, toStatus, actorId, payload = {} } = event;

  if (fromStatus && !canTransition(fromStatus, toStatus)) {
    throw new Error(
      `[RideStateMachine] Invalid transition ${fromStatus} -> ${toStatus} for ride ${rideId}`,
    );
  }

  appendRideEvent(event);

  void trackBusinessEvent(`ride_${toStatus.toLowerCase()}` as never, actorId, {
    rideId,
    fromStatus,
    toStatus,
    ...payload,
  });

  await dispatchPostTransitionJobs(rideId, toStatus, actorId, payload);
}

async function dispatchPostTransitionJobs(
  rideId: string,
  status: RideStatus,
  actorId?: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  switch (status) {
    case 'REQUESTED':
      if (payload?.alreadyQueued !== true) {
        await jobs.matchDriver(rideId, 1);
      }
      break;
    case 'MATCHING':
      if (payload?.alreadyQueued !== true) {
        const attempt = typeof payload?.attempt === 'number' ? payload.attempt : 0;
        await jobs.matchDriver(rideId, attempt + 1);
      }
      break;
    case 'DRIVER_ASSIGNED':
      if (typeof payload?.passengerId === 'string') {
        await jobs.sendNotification(payload.passengerId, 'push', 'driver_assigned', {
          rideId,
          ...payload,
        });
      }
      break;
    case 'COMPLETED':
      if (typeof payload?.paymentIntentId === 'string') {
        await enqueue(
          'process_payment',
          { paymentIntentId: payload.paymentIntentId, rideId },
          {
            priority: 1,
            idempotencyKey: `payment:${payload.paymentIntentId}:capture`,
          },
        );
      }
      break;
    case 'FAILED': {
      const attempt = typeof payload?.attempt === 'number' ? payload.attempt : 1;
      if (attempt < 3) {
        await enqueue(
          'match_driver',
          { rideId, attempt: attempt + 1 },
          {
            priority: 1,
            idempotencyKey: `match_driver:${rideId}:${attempt + 1}`,
            delaySeconds: attempt * 10,
          },
        );
      } else if (actorId) {
        await jobs.sendNotification(actorId, 'push', 'no_driver_found', { rideId });
      }
      break;
    }
    default:
      break;
  }
}

export const rideStateMachine = {
  request: (rideId: string, actorId: string, payload?: Record<string, unknown>) =>
    transitionRide({
      rideId,
      toStatus: 'REQUESTED',
      actorId,
      payload,
      idempotencyKey: `ride:request:${rideId}`,
    }),

  startMatching: (rideId: string) =>
    transitionRide({
      rideId,
      fromStatus: 'REQUESTED',
      toStatus: 'MATCHING',
      idempotencyKey: `ride:matching:${rideId}`,
    }),

  assignDriver: (rideId: string, driverId: string) =>
    transitionRide({
      rideId,
      fromStatus: 'MATCHING',
      toStatus: 'DRIVER_ASSIGNED',
      actorId: driverId,
      payload: { driverId },
      idempotencyKey: `ride:assigned:${rideId}:${driverId}`,
    }),

  driverArriving: (rideId: string, driverId: string) =>
    transitionRide({
      rideId,
      fromStatus: 'DRIVER_ASSIGNED',
      toStatus: 'DRIVER_ARRIVING',
      actorId: driverId,
      idempotencyKey: `ride:arriving:${rideId}`,
    }),

  start: (rideId: string, actorId: string) =>
    transitionRide({
      rideId,
      fromStatus: 'DRIVER_ARRIVING',
      toStatus: 'IN_PROGRESS',
      actorId,
      idempotencyKey: `ride:start:${rideId}`,
    }),

  complete: (rideId: string, actorId: string, paymentIntentId?: string) =>
    transitionRide({
      rideId,
      fromStatus: 'IN_PROGRESS',
      toStatus: 'COMPLETED',
      actorId,
      payload: paymentIntentId ? { paymentIntentId } : {},
      idempotencyKey: `ride:complete:${rideId}`,
    }),

  cancel: (rideId: string, actorId: string, reason?: string) =>
    transitionRide({
      rideId,
      toStatus: 'CANCELLED',
      actorId,
      payload: reason ? { reason } : {},
      idempotencyKey: `ride:cancel:${rideId}:${actorId}`,
    }),

  fail: (rideId: string, reason: string, attempt = 1) =>
    transitionRide({
      rideId,
      toStatus: 'FAILED',
      payload: { reason, attempt },
      idempotencyKey: `ride:fail:${rideId}:${attempt}`,
    }),
};

export async function getRideEventHistory(rideId: string) {
  return rideEventHistory.get(rideId) ?? [];
}
