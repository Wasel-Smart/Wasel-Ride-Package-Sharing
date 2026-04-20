import type * as CoreService from '../../../src/services/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CoreModule = typeof CoreService;

let core: CoreModule;

async function loadCoreModule() {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://api.test.com');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('VITE_SUPABASE_URL', '');
  global.fetch = vi.fn();
  core = await import('../../../src/services/core');
}

function createMockResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createAbortAwareFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException('Request aborted', 'AbortError'));
        return;
      }

      signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Request aborted', 'AbortError')),
        { once: true },
      );
    });
  });
}

describe('Core Service', () => {
  beforeEach(async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });
    await loadCoreModule();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  describe('fetchWithRetry', () => {
    it('should successfully fetch data', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse(200, { data: 'test' }));

      const response = await core.fetchWithRetry('https://api.test.com/data');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should retry on 502 error', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(createMockResponse(502))
        .mockResolvedValueOnce(createMockResponse(200, { ok: true }));

      const response = await core.fetchWithRetry('https://api.test.com/data', {}, 2, 10);

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError('Network error'));

      await expect(core.fetchWithRetry('https://api.test.com/data', {}, 0)).rejects.toThrow(
        'Network error',
      );
    });

    it('should respect timeout', async () => {
      vi.mocked(global.fetch).mockImplementation(createAbortAwareFetch());

      await expect(
        core.fetchWithRetry('https://api.test.com/data', { timeout: 50 }, 0),
      ).rejects.toThrow();
    });

    it('should deduplicate concurrent GET requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(200, { ok: true }));

      const [response1, response2] = await Promise.all([
        core.fetchWithRetry('https://api.test.com/data'),
        core.fetchWithRetry('https://api.test.com/data'),
      ]);

      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate POST requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(200, { ok: true }));

      await Promise.all([
        core.fetchWithRetry('https://api.test.com/data', { method: 'POST', body: '{}' }),
        core.fetchWithRetry('https://api.test.com/data', { method: 'POST', body: '{}' }),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('probeBackendHealth', () => {
    it('should return healthy status on successful probe', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse(200, { ok: true }));

      const snapshot = await core.probeBackendHealth(1000);

      expect(snapshot.backendStatus).toBe('healthy');
      expect(snapshot.edgeFunctionAvailable).toBe(true);
    });

    it('should return offline status when network is down', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: false,
      });

      const snapshot = await core.probeBackendHealth();

      expect(snapshot.networkOnline).toBe(false);
      expect(snapshot.backendStatus).toBe('offline');
    });

    it('should handle probe timeout', async () => {
      vi.mocked(global.fetch).mockImplementation(createAbortAwareFetch());

      const snapshot = await core.probeBackendHealth(50);

      expect(snapshot.backendStatus).toBe('degraded');
    });
  });

  describe('warmUpServer', () => {
    it('should warm up server successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse(200, { ok: true }));

      await core.warmUpServer();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      vi.useFakeTimers();
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(createMockResponse(503, { error: 'retry' }))
        .mockResolvedValueOnce(createMockResponse(200, { ok: true }));

      const warmUpPromise = core.warmUpServer();
      await vi.advanceTimersByTimeAsync(2_000);
      await warmUpPromise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
