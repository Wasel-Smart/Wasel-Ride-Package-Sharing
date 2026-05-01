import type { QueueTopic, WorkerServiceName } from './queue-contracts';

export type PlatformServiceName =
  | 'api-gateway'
  | 'identity-service'
  | 'ride-matching-service'
  | 'package-delivery-service'
  | 'payment-service'
  | 'notification-service'
  | WorkerServiceName;

export type PlatformWorkloadType = 'edge' | 'api' | 'worker';

export interface ServiceLevelObjective {
  availability: string;
  p95Latency?: string;
  freshness?: string;
}

export interface PlatformServiceDefinition {
  name: PlatformServiceName;
  workload: PlatformWorkloadType;
  boundedContext: string;
  responsibilities: readonly string[];
  dependencies: readonly string[];
  dataStores: readonly string[];
  ownsTopics?: readonly QueueTopic[];
  consumesTopics?: readonly QueueTopic[];
  slo: ServiceLevelObjective;
}

export const PLATFORM_SERVICES: readonly PlatformServiceDefinition[] = [
  {
    name: 'api-gateway',
    workload: 'edge',
    boundedContext: 'edge',
    responsibilities: [
      'Versioned API routing',
      'Gateway auth enforcement',
      'Rate limiting and request tracing',
    ],
    dependencies: ['identity-service', 'ride-matching-service', 'package-delivery-service', 'payment-service'],
    dataStores: ['none'],
    slo: { availability: '99.9%', p95Latency: '<250ms' },
  },
  {
    name: 'identity-service',
    workload: 'api',
    boundedContext: 'identity',
    responsibilities: [
      'Session issuance and refresh rotation',
      'Role resolution',
      'Sensitive mutation verification',
    ],
    dependencies: ['supabase-auth'],
    dataStores: ['postgres'],
    slo: { availability: '99.95%', p95Latency: '<200ms' },
  },
  {
    name: 'ride-matching-service',
    workload: 'api',
    boundedContext: 'rides',
    responsibilities: [
      'Ride request intake',
      'Ride lifecycle transitions',
      'Driver match publishing',
    ],
    dependencies: ['api-gateway', 'matching-worker'],
    dataStores: ['postgres', 'postgis', 'redis-geo'],
    ownsTopics: ['rides.requested', 'rides.assigned', 'rides.completed'],
    slo: { availability: '99.9%', p95Latency: '<700ms' },
  },
  {
    name: 'package-delivery-service',
    workload: 'api',
    boundedContext: 'packages',
    responsibilities: [
      'Package lifecycle orchestration',
      'Package escrow handoff state',
      'Real-time tracking updates',
    ],
    dependencies: ['api-gateway', 'package-worker'],
    dataStores: ['postgres', 'postgis', 'redis-geo'],
    ownsTopics: ['packages.created', 'packages.location-updated', 'packages.delivered'],
    slo: { availability: '99.9%', p95Latency: '<400ms', freshness: '<5s' },
  },
  {
    name: 'payment-service',
    workload: 'api',
    boundedContext: 'payments',
    responsibilities: [
      'Payment authorization orchestration',
      'Escrow release requests',
      'Refund initiation',
    ],
    dependencies: ['api-gateway', 'payment-worker'],
    dataStores: ['postgres'],
    ownsTopics: ['payments.authorized', 'payments.captured'],
    slo: { availability: '99.95%', p95Latency: '<350ms' },
  },
  {
    name: 'notification-service',
    workload: 'api',
    boundedContext: 'communications',
    responsibilities: [
      'Message template dispatch',
      'Multi-channel delivery orchestration',
      'Operator broadcast entry point',
    ],
    dependencies: ['notification-worker'],
    dataStores: ['postgres'],
    ownsTopics: ['notifications.dispatch'],
    slo: { availability: '99.9%', p95Latency: '<250ms' },
  },
  {
    name: 'matching-worker',
    workload: 'worker',
    boundedContext: 'rides',
    responsibilities: [
      'Driver supply scoring',
      'Match execution',
      'Assignment retries',
    ],
    dependencies: ['ride-matching-service'],
    dataStores: ['redis-geo', 'postgres'],
    consumesTopics: ['rides.requested'],
    slo: { availability: '99.9%', freshness: '<15s' },
  },
  {
    name: 'package-worker',
    workload: 'worker',
    boundedContext: 'packages',
    responsibilities: [
      'Package assignment',
      'Tracking normalization',
      'Delivery closeout',
    ],
    dependencies: ['package-delivery-service'],
    dataStores: ['postgres', 'postgis', 'redis-geo'],
    consumesTopics: ['packages.created', 'packages.location-updated'],
    slo: { availability: '99.9%', freshness: '<10s' },
  },
  {
    name: 'payment-worker',
    workload: 'worker',
    boundedContext: 'payments',
    responsibilities: [
      'Settlement capture',
      'Retryable provider reconciliation',
      'Refund processing',
    ],
    dependencies: ['payment-service'],
    dataStores: ['postgres'],
    consumesTopics: ['payments.authorized'],
    slo: { availability: '99.95%', freshness: '<30s' },
  },
  {
    name: 'notification-worker',
    workload: 'worker',
    boundedContext: 'communications',
    responsibilities: [
      'Push delivery',
      'SMS and WhatsApp delivery',
      'Delivery retry and DLQ handling',
    ],
    dependencies: ['notification-service'],
    dataStores: ['postgres'],
    consumesTopics: ['rides.assigned', 'packages.delivered', 'notifications.dispatch'],
    slo: { availability: '99.9%', freshness: '<2s' },
  },
  {
    name: 'ops-worker',
    workload: 'worker',
    boundedContext: 'operations',
    responsibilities: [
      'Operational aggregates',
      'Settlement reporting',
      'Corridor intelligence',
    ],
    dependencies: ['ride-matching-service', 'payment-service'],
    dataStores: ['postgres'],
    consumesTopics: ['rides.completed', 'payments.captured'],
    slo: { availability: '99.5%', freshness: '<5m' },
  },
] as const;

export function getServiceDefinition(
  name: PlatformServiceName,
): PlatformServiceDefinition | undefined {
  return PLATFORM_SERVICES.find((service) => service.name === name);
}
