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