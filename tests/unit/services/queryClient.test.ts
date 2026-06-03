import { describe, expect, it } from 'vitest';
import { createWaselQueryClient } from '../../../src/services/queryClient';
import { STALE_TIMES } from '../../../src/utils/performance/cacheStrategy';

describe('createWaselQueryClient', () => {
  it('centralizes cache defaults for deduplication and retries', () => {
    const client = createWaselQueryClient({ notifyOnError: false });
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(STALE_TIMES.MY_TRIPS);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.queries?.refetchOnReconnect).toBe(true);
    expect(defaults.queries?.retry).toBe(2);
    expect(defaults.mutations?.retry).toBe(3);
  });
});
