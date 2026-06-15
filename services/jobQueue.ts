export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD';

export type JobType =
  | 'match_driver'
  | 'send_notification'
  | 'process_payment'
  | 'retry_failed_job'
  | 'ride_state_transition'
  | 'webhook_process'
  | 'sync_booking'
  | 'send_email';

export interface Job<T = Record<string, unknown>> {
  id: string;
  job_type: JobType;
  payload: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  run_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  last_error?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface EnqueueOptions {
  priority?: number;
  idempotencyKey?: string;
  delaySeconds?: number;
  maxAttempts?: number;
}

const queuedJobs = new Map<string, Job>();

function createJobId(type: JobType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueue<T extends Record<string, unknown> = Record<string, unknown>>(
  jobType: JobType,
  payload: T,
  options: EnqueueOptions = {},
): Promise<string | null> {
  const duplicate = options.idempotencyKey
    ? Array.from(queuedJobs.values()).find(
        (job) => job.idempotency_key === options.idempotencyKey && job.status !== 'DEAD',
      )
    : null;

  if (duplicate) {
    return duplicate.id;
  }

  const now = new Date();
  const id = createJobId(jobType);
  queuedJobs.set(id, {
    id,
    job_type: jobType,
    payload,
    status: 'PENDING',
    priority: options.priority ?? 5,
    attempts: 0,
    max_attempts: options.maxAttempts ?? 5,
    run_at: new Date(now.getTime() + (options.delaySeconds ?? 0) * 1000).toISOString(),
    idempotency_key: options.idempotencyKey,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  return id;
}

export const jobs = {
  matchDriver(rideId: string, attempt = 1) {
    return enqueue('match_driver', { rideId, attempt }, {
      priority: 1,
      idempotencyKey: `match_driver:${rideId}:${attempt}`,
    });
  },

  sendNotification(userId: string, channel: string, templateId: string, data: unknown) {
    return enqueue('send_notification', { userId, channel, templateId, data }, {
      priority: 3,
      idempotencyKey: `notif:${userId}:${templateId}:${Date.now()}`,
    });
  },

  processPayment(paymentIntentId: string, webhookId: string) {
    return enqueue('process_payment', { paymentIntentId, webhookId }, {
      priority: 1,
      idempotencyKey: `payment:${paymentIntentId}`,
    });
  },

  retryDead(originalJobId: string) {
    return enqueue('retry_failed_job', { originalJobId }, {
      priority: 4,
      idempotencyKey: `retry:${originalJobId}:${Date.now()}`,
    });
  },

  rideTransition(rideId: string, fromStatus: string, toStatus: string, actorId?: string) {
    return enqueue(
      'ride_state_transition',
      { rideId, fromStatus, toStatus, actorId: actorId ?? null },
      {
        priority: 1,
        idempotencyKey: `ride_tx:${rideId}:${fromStatus}:${toStatus}`,
      },
    );
  },
};

export interface QueueMetrics {
  pending: number;
  processing: number;
  dead: number;
  completed_today: number;
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return Array.from(queuedJobs.values()).reduce<QueueMetrics>(
    (accumulator, job) => {
      if (job.status === 'PENDING') {accumulator.pending += 1;}
      if (job.status === 'PROCESSING') {accumulator.processing += 1;}
      if (job.status === 'DEAD') {accumulator.dead += 1;}
      if (job.status === 'COMPLETED' && job.completed_at) {
        if (new Date(job.completed_at) >= startOfDay) {
          accumulator.completed_today += 1;
        }
      }
      return accumulator;
    },
    { pending: 0, processing: 0, dead: 0, completed_today: 0 },
  );
}

export async function getDeadLetterJobs(): Promise<Job[]> {
  return Array.from(queuedJobs.values()).filter((job) => job.status === 'DEAD');
}

type QueueChangeHandler = (job: Job) => void;

export function subscribeToDeadLetterQueue(_handler: QueueChangeHandler): () => void {
  return () => undefined;
}
