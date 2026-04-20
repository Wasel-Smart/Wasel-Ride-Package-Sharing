import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCheckSupabaseConnection,
  mockTrackAPICall,
} = vi.hoisted(() => ({
  mockCheckSupabaseConnection: vi.fn(),
  mockTrackAPICall: vi.fn(),
}));

vi.mock('../../../src/utils/supabase/info', () => ({
  projectId: 'proj-1',
  publicAnonKey: 'anon-key',
}));

vi.mock('../../../src/utils/supabase/client', () => ({
  checkSupabaseConnection: (...args: unknown[]) => mockCheckSupabaseConnection(...args),
  supabase: null,
  supabaseUrl: 'https://example.supabase.co',
}));

vi.mock('../../../src/utils/logging', () => ({
  trackAPICall: (...args: unknown[]) => mockTrackAPICall(...args),
}));

describe('services/core performance behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.wasel.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deduplicates concurrent probeBackendHealth requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { probeBackendHealth } = await import('../../../src/services/core');
    await Promise.all([probeBackendHealth(), probeBackendHealth(), probeBackendHealth()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent GET requests in fetchWithRetry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { fetchWithRetry } = await import('../../../src/services/core');
    const [first, second] = await Promise.all([
      fetchWithRetry('https://api.wasel.test/trips'),
      fetchWithRetry('https://api.wasel.test/trips'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual({ ok: true });
    await expect(second.json()).resolves.toEqual({ ok: true });
    expect(mockTrackAPICall).toHaveBeenCalled();
  });
});
