import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry, probeBackendHealth, warmUpServer } from '../../../src/services/core';

// Mock fetch
global.fetch = vi.fn();

describe('Core Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('fetchWithRetry', () => {
    it('should successfully fetch data', async () => {
      const mockResponse = { ok: true, status: 200, json: async () => ({ data: 'test' }) };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const response = await fetchWithRetry('https://api.test.com/data');
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should retry on 502 error', async () => {
      const failResponse = { ok: false, status: 502 };
      const successResponse = { ok: true, status: 200 };
      
      (global.fetch as any)
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(successResponse);

      const response = await fetchWithRetry('https://api.test.com/data', {}, 2, 100);
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new TypeError('Network error'));

      await expect(
        fetchWithRetry('https://api.test.com/data', {}, 0)
      ).rejects.toThrow('Network error');
    });

    it('should respect timeout', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(
        fetchWithRetry('https://api.test.com/data', { timeout: 100 }, 0)
      ).rejects.toThrow();
    });

    it('should deduplicate concurrent GET requests', async () => {
      const mockResponse = { ok: true, status: 200, clone: () => mockResponse };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const [response1, response2] = await Promise.all([
        fetchWithRetry('https://api.test.com/data'),
        fetchWithRetry('https://api.test.com/data'),
      ]);

      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate POST requests', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await Promise.all([
        fetchWithRetry('https://api.test.com/data', { method: 'POST', body: '{}' }),
        fetchWithRetry('https://api.test.com/data', { method: 'POST', body: '{}' }),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('probeBackendHealth', () => {
    it('should return healthy status on successful probe', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const snapshot = await probeBackendHealth(1000);
      
      expect(snapshot.backendStatus).toBe('healthy');
      expect(snapshot.edgeFunctionAvailable).toBe(true);
    });

    it('should return offline status when network is down', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const snapshot = await probeBackendHealth();
      
      expect(snapshot.networkOnline).toBe(false);
      expect(snapshot.backendStatus).toBe('offline');
    });

    it('should handle probe timeout', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const snapshot = await probeBackendHealth(100);
      
      expect(snapshot.backendStatus).not.toBe('healthy');
    });
  });

  describe('warmUpServer', () => {
    it('should warm up server successfully', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await warmUpServer();
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      const failResponse = { ok: false, status: 503 };
      const successResponse = { ok: true, status: 200 };
      
      (global.fetch as any)
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(successResponse);

      await warmUpServer();
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
