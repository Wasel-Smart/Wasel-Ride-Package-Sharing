import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GEO_KEYS } from '@/platform/geo-adapter';

describe('GEO_KEYS', () => {
  it('exposes driver and package namespaces', () => {
    expect(GEO_KEYS.DRIVERS).toBe('geo:drivers:available');
    expect(GEO_KEYS.PACKAGES).toBe('geo:packages:in_transit');
  });
});

describe('getGeoAdapter — no-op fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure REDIS_URL is absent so the no-op path is taken
    delete process.env.REDIS_URL;
  });

  it('returns a no-op adapter when REDIS_URL is not set', async () => {
    const { getGeoAdapter } = await import('@/platform/geo-adapter');
    const adapter = await getGeoAdapter();

    // No-op methods must resolve without throwing
    await expect(adapter.upsert('key', { id: 'x', lat: 31.9, lng: 35.9 })).resolves.toBeUndefined();
    await expect(adapter.remove('key', 'x')).resolves.toBeUndefined();
    await expect(adapter.nearby('key', 31.9, 35.9, 5000)).resolves.toEqual([]);
  });
});
