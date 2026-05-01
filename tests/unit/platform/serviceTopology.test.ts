import { describe, expect, it } from 'vitest';
import { QUEUE_CONTRACTS } from '@/platform/queue-contracts';
import {
  PLATFORM_SERVICES,
  getServiceDefinition,
} from '@/platform/service-topology';

describe('service topology', () => {
  it('defines unique platform services', () => {
    const names = PLATFORM_SERVICES.map((service) => service.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers every queue owner in the service catalog', () => {
    for (const contract of QUEUE_CONTRACTS) {
      const owner = getServiceDefinition(contract.owner);
      expect(owner).toBeDefined();
      expect(owner?.workload).toBe('worker');
    }
  });

  it('maps every queue topic to either an owning or consuming service', () => {
    for (const contract of QUEUE_CONTRACTS) {
      const linkedService = PLATFORM_SERVICES.find((service) => {
        return (
          service.ownsTopics?.includes(contract.topic) ||
          service.consumesTopics?.includes(contract.topic)
        );
      });

      expect(linkedService, `No service mapping found for ${contract.topic}`).toBeDefined();
    }
  });

  it('keeps critical services on explicit SLOs', () => {
    for (const serviceName of [
      'api-gateway',
      'ride-matching-service',
      'package-delivery-service',
      'payment-service',
    ] as const) {
      const service = getServiceDefinition(serviceName);
      expect(service?.slo.availability).toBeTruthy();
    }
  });
});
