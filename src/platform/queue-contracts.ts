export type QueueTopic =
  | 'rides.requested'
  | 'rides.assigned'
  | 'rides.completed'
  | 'packages.created'
  | 'packages.location-updated'
  | 'packages.delivered'
  | 'payments.authorized'
  | 'payments.captured'
  | 'notifications.dispatch';

export type WorkerServiceName =
  | 'matching-worker'
  | 'package-worker'
  | 'payment-worker'
  | 'notification-worker'
  | 'ops-worker';

export interface QueueContractDefinition {
  topic: QueueTopic;
  owner: WorkerServiceName;
  retryPolicy: {
    maxAttempts: number;
    backoffStrategy: 'fixed' | 'exponential';
  };
  deadLetterTopic?: `${QueueTopic}.dlq`;
}

export const QUEUE_CONTRACTS: readonly QueueContractDefinition[] = [
  {
    topic: 'rides.requested',
    owner: 'matching-worker',
    retryPolicy: { maxAttempts: 5, backoffStrategy: 'exponential' },
    deadLetterTopic: 'rides.requested.dlq',
  },
  {
    topic: 'rides.assigned',
    owner: 'notification-worker',
    retryPolicy: { maxAttempts: 5, backoffStrategy: 'exponential' },
    deadLetterTopic: 'rides.assigned.dlq',
  },
  {
    topic: 'rides.completed',
    owner: 'ops-worker',
    retryPolicy: { maxAttempts: 3, backoffStrategy: 'fixed' },
    deadLetterTopic: 'rides.completed.dlq',
  },
  {
    topic: 'packages.created',
    owner: 'package-worker',
    retryPolicy: { maxAttempts: 5, backoffStrategy: 'exponential' },
    deadLetterTopic: 'packages.created.dlq',
  },
  {
    topic: 'packages.location-updated',
    owner: 'package-worker',
    retryPolicy: { maxAttempts: 3, backoffStrategy: 'fixed' },
    deadLetterTopic: 'packages.location-updated.dlq',
  },
  {
    topic: 'packages.delivered',
    owner: 'notification-worker',
    retryPolicy: { maxAttempts: 5, backoffStrategy: 'exponential' },
    deadLetterTopic: 'packages.delivered.dlq',
  },
  {
    topic: 'payments.authorized',
    owner: 'payment-worker',
    retryPolicy: { maxAttempts: 5, backoffStrategy: 'exponential' },
    deadLetterTopic: 'payments.authorized.dlq',
  },
  {
    topic: 'payments.captured',
    owner: 'ops-worker',
    retryPolicy: { maxAttempts: 3, backoffStrategy: 'fixed' },
    deadLetterTopic: 'payments.captured.dlq',
  },
  {
    topic: 'notifications.dispatch',
    owner: 'notification-worker',
    retryPolicy: { maxAttempts: 8, backoffStrategy: 'exponential' },
    deadLetterTopic: 'notifications.dispatch.dlq',
  },
] as const;

export function getQueueContract(topic: QueueTopic): QueueContractDefinition | undefined {
  return QUEUE_CONTRACTS.find((contract) => contract.topic === topic);
}
