import { describe, expect, it } from 'vitest';
import { buildCorridorCommercialSnapshot } from '../../../src/services/corridorCommercial';

describe('corridorCommercial', () => {
  it('builds recurring contract snapshots across corporate, school, and provider lanes', async () => {
    const snapshot = await buildCorridorCommercialSnapshot();

    expect(snapshot.contracts.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.totalRecurringRevenueJod).toBeGreaterThan(0);
    expect(snapshot.topContract?.corridorLabel).toBeTruthy();
    expect(snapshot.recommendedCommercialAction).toContain('Scale');
  });
});
