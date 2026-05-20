import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateDirectDemandAlert = vi.fn();

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectDemandAlert: (...args: unknown[]) => mockCreateDirectDemandAlert(...args),
  getDirectDemandAlerts: vi.fn(async () => []),
}));

vi.mock('../../../src/services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(async () => undefined),
}));

import {
  clearDemandAlertsCache,
  createDemandAlert,
  getDemandAlerts,
  getDemandStats,
} from '../../../src/services/demandCapture';

describe('demandCapture', () => {
  beforeEach(() => {
    clearDemandAlertsCache();
    mockCreateDirectDemandAlert.mockImplementation(async ({ from, to, date, service }: any) => ({
      id: `alert-${from}-${to}-${service}`,
      origin_city: from,
      destination_city: to,
      requested_date: date,
      service_type: service,
      seats_or_slots: 1,
      status: 'active',
      created_at: '2099-01-01T08:00:00Z',
    }));
  });

  it('deduplicates active alerts for the same corridor', async () => {
    const first = await createDemandAlert({
      from: 'Amman',
      to: 'Aqaba',
      date: '2099-01-01',
      service: 'ride',
    });
    const second = await createDemandAlert({
      from: 'Amman',
      to: 'Aqaba',
      date: '2099-01-01',
      service: 'ride',
    });

    expect(first.id).toBe(second.id);
    expect(getDemandAlerts()).toHaveLength(1);
    expect(getDemandStats().rides).toBe(1);
    expect(mockCreateDirectDemandAlert).toHaveBeenCalledTimes(1);
  });
});
