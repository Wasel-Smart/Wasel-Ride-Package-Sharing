import { describe, expect, it } from 'vitest';
import {
  getQueueContract,
  QUEUE_CONTRACTS,
} from '../../../src/platform/queue-contracts';

describe('queue contracts', () => {
  it('defines dead-letter and retry policy metadata for every topic', () => {
    expect(QUEUE_CONTRACTS.length).toBeGreaterThan(0);

    for (const contract of QUEUE_CONTRACTS) {
      expect(contract.retryPolicy.maxAttempts).toBeGreaterThan(0);
      expect(contract.deadLetterTopic).toMatch(/\.dlq$/);
    }
  });

  it('resolves individual topic contracts', () => {
    expect(getQueueContract('rides.requested')?.owner).toBe('matching-worker');
    expect(getQueueContract('notifications.dispatch')?.owner).toBe(
      'notification-worker',
    );
  });
});
