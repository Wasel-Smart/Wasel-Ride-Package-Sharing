jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        apiUrl: 'https://wasel14.online',
      },
    },
  },
}));

jest.mock('react-native-url-polyfill/auto', () => ({}));

jest.mock('../services/auth', () => ({
  mobileAuth: {
    getAccessToken: jest.fn(),
  },
}));

jest.mock('./config', () => ({
  waselMobileConfig: {
    hasSupabase: true,
    apiUrl: 'https://wasel14.online',
    authRedirectUrl: 'wasel://auth/callback',
  },
}));

import { apiClient } from '../lib/api';

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('HTTP methods', () => {
    it('get delegates to request with GET method', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValue({ data: { ok: true }, error: null, status: 200 });
      await apiClient.get('/test');
      expect(spy).toHaveBeenCalledWith('/test', { method: 'GET' });
    });

    it('post delegates to request with POST method', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValue({ data: null, error: null, status: 201 });
      await apiClient.post('/test', { field: 'value' });
      expect(spy).toHaveBeenCalledWith('/test', { method: 'POST', body: { field: 'value' } });
    });

    it('put delegates to request with PUT method', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValue({ data: null, error: null, status: 200 });
      await apiClient.put('/test', { field: 'value' });
      expect(spy).toHaveBeenCalledWith('/test', { method: 'PUT', body: { field: 'value' } });
    });

    it('patch delegates to request with PATCH method', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValue({ data: null, error: null, status: 200 });
      await apiClient.patch('/test', { field: 'value' });
      expect(spy).toHaveBeenCalledWith('/test', { method: 'PATCH', body: { field: 'value' } });
    });

    it('delete delegates to request with DELETE method', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValue({ data: null, error: null, status: 204 });
      await apiClient.delete('/test');
      expect(spy).toHaveBeenCalledWith('/test', { method: 'DELETE' });
    });
  });

  describe('retry behavior', () => {
    it('retries on failure with exponential backoff', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'ok' }),
        } as unknown as Response);
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

      const result = await apiClient.get('/test-endpoint');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ data: 'ok' });
    });

    it('returns timeout error on abort', async () => {
      const mockFetch = jest.fn();
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);
      (globalThis as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

      const result = await apiClient.request('/test', { timeout: 100, retries: 0 });
      expect(result.error).toBe('Request timeout');
    });
  });
});
