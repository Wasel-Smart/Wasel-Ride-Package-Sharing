import { beforeEach, describe, expect, it } from 'vitest';
import { createDemandAlert, getDemandAlerts, getDemandStats } from '../../../src/services/demandCapture';

describe('demandCapture', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deduplicates active alerts for the same corridor', () => {
    const first = createDemandAlert({
      from: 'Amman',
      to: 'Aqaba',
      date: '2099-01-01',
      service: 'ride',
    });
    const second = createDemandAlert({
      from: 'Amman',
      to: 'Aqaba',
      date: '2099-01-01',
      service: 'ride',
    });

    expect(first.id).toBe(second.id);
    expect(getDemandAlerts()).toHaveLength(1);
    expect(getDemandStats().rides).toBe(1);
  });
});
