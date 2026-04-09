import { describe, expect, it } from 'vitest';
import { getExecutionOperatingSystemSnapshot } from '../../../src/services/executionOperatingSystem';

describe('executionOperatingSystem', () => {
  it('exposes a managed operating model with explicit governance primitives', () => {
    const snapshot = getExecutionOperatingSystemSnapshot();

    expect(snapshot.maturityScore).toBe(6.5);
    expect(snapshot.targetScore).toBe(10);
    expect(snapshot.maturityLevel).toBe('managed');
    expect(snapshot.owners.length).toBeGreaterThanOrEqual(5);
    expect(snapshot.kpis.some((kpi) => kpi.id === 'type-check-debt')).toBe(true);
    expect(snapshot.enforcementRules).toContain('No release with failing verification gates.');
  });
});
