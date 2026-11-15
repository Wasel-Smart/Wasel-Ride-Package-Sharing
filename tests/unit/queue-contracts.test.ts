import { describe, it, expect } from 'vitest';
import { QUEUE_CONTRACTS, EVENT_TYPE_TO_TOPIC, type QueueTopic } from '@/platform/queue-contracts';
import { PLATFORM_SERVICES } from '@/platform/service-topology';

describe('queue contract topology', () => {
  it('every topic has exactly one owning worker', () => {
    const topics = QUEUE_CONTRACTS.map(c => c.topic);
    const unique = new Set(topics);
    expect(topics.length).toBe(unique.size);
  });

  it('every contract has a DLQ topic matching <topic>.dlq', () => {
    for (const contract of QUEUE_CONTRACTS) {
      expect(contract.deadLetterTopic).toBe(`${contract.topic}.dlq`);
    }
  });

  it('retry policy values are within safe bounds', () => {
    for (const contract of QUEUE_CONTRACTS) {
      expect(contract.retryPolicy.maxAttempts).toBeGreaterThanOrEqual(1);
      expect(contract.retryPolicy.maxAttempts).toBeLessThanOrEqual(10);
      expect(['fixed', 'exponential']).toContain(contract.retryPolicy.backoffStrategy);
    }
  });

  it('every event-to-topic mapping targets a known contract topic', () => {
    const knownTopics = new Set<QueueTopic>(QUEUE_CONTRACTS.map(c => c.topic));
    for (const [event, topic] of Object.entries(EVENT_TYPE_TO_TOPIC)) {
      expect(knownTopics.has(topic as QueueTopic), `${event} maps to unknown topic ${topic}`).toBe(true);
    }
  });

  it('package lifecycle events without a dedicated topic are not mapped', () => {
    // PackageAssigned and PackagePickedUp have no dedicated queue topic.
    // They must NOT be routed to packages.created (wrong semantic).
    expect(EVENT_TYPE_TO_TOPIC).not.toHaveProperty('PackageAssigned');
    expect(EVENT_TYPE_TO_TOPIC).not.toHaveProperty('PackagePickedUp');
  });

  it('in-progress ride state transition is not mapped to a queue topic', () => {
    // RideStarted is a local lifecycle transition only — no worker action needed.
    expect(EVENT_TYPE_TO_TOPIC).not.toHaveProperty('RideStarted');
  });

  it('payment events map to their correct semantic topics', () => {
    expect(EVENT_TYPE_TO_TOPIC.PaymentAuthorized).toBe('payments.authorized');
    expect(EVENT_TYPE_TO_TOPIC.PaymentCaptured).toBe('payments.captured');
  });
});

describe('service topology contract', () => {
  it('every worker service owns or consumes at least one topic', () => {
    const workers = PLATFORM_SERVICES.filter(s => s.workload === 'worker');
    for (const worker of workers) {
      const hasTopics =
        (worker.ownsTopics && worker.ownsTopics.length > 0) ||
        (worker.consumesTopics && worker.consumesTopics.length > 0);
      expect(hasTopics, `${worker.name} has no topic ownership`).toBe(true);
    }
  });

  it('every consumed topic has a matching queue contract', () => {
    const contractTopics = new Set<string>(QUEUE_CONTRACTS.map(c => c.topic));
    for (const service of PLATFORM_SERVICES) {
      for (const topic of service.consumesTopics ?? []) {
        expect(contractTopics.has(topic), `${service.name} consumes unknown topic ${topic}`).toBe(true);
      }
    }
  });

  it('every owned topic has a matching queue contract', () => {
    const contractTopics = new Set<string>(QUEUE_CONTRACTS.map(c => c.topic));
    for (const service of PLATFORM_SERVICES) {
      for (const topic of service.ownsTopics ?? []) {
        expect(contractTopics.has(topic), `${service.name} owns unknown topic ${topic}`).toBe(true);
      }
    }
  });

  it('SLO availability values are valid percentage strings', () => {
    for (const service of PLATFORM_SERVICES) {
      expect(service.slo.availability).toMatch(/^\d{2,3}(\.\d+)?%$/);
    }
  });
});

describe('getQueueContract', () => {
  it('returns the contract for a known topic', async () => {
    const { getQueueContract } = await import('@/platform/queue-contracts');
    const contract = getQueueContract('rides.requested');
    expect(contract).toBeDefined();
    expect(contract?.owner).toBe('matching-worker');
    expect(contract?.deadLetterTopic).toBe('rides.requested.dlq');
  });

  it('returns undefined for an unknown topic', async () => {
    const { getQueueContract } = await import('@/platform/queue-contracts');
    expect(getQueueContract('unknown.topic' as never)).toBeUndefined();
  });
});

describe('getServiceDefinition', () => {
  it('returns the definition for a known service', async () => {
    const { getServiceDefinition } = await import('@/platform/service-topology');
    const def = getServiceDefinition('payment-service');
    expect(def).toBeDefined();
    expect(def?.boundedContext).toBe('payments');
    expect(def?.slo.availability).toBe('99.95%');
  });

  it('returns undefined for an unknown service', async () => {
    const { getServiceDefinition } = await import('@/platform/service-topology');
    expect(getServiceDefinition('unknown-service' as never)).toBeUndefined();
  });
});