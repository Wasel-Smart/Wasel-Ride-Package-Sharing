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
        apiUrl: 'https://api.test.supabase.co',
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

import { apiClient } from '../lib/api';
import { mobileAuth } from '../services/auth';

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('returns error for invalid URL', async () => {
      const result = await apiClient.request('https://malicious.example.com/data');
      expect(result.error).toBe('Invalid or unauthorized URL');
      expect(result.data).toBeNull();
    });

    it('rejects private IP ranges', async () => {
      const result = await apiClient.request('http://192.168.1.1/api');
      expect(result.error).toBe('Invalid or unauthorized URL');
    });

    it('rejects non-https on non-localhost URLs', async () => {
      const result = await apiClient.request('ftp://supabase.co/data');
      expect(result.error).toBe('Invalid or unauthorized URL');
    });
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
      const fetchSpy = jest.spyOn(global, 'fetch');
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'ok' }),
        } as unknown as Response);

      const result = await apiClient.get('/test-endpoint');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ data: 'ok' });
    });

    it('returns timeout error on abort', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      fetchSpy.mockRejectedValueOnce(abortError);

      const result = await apiClient.request('/test', { timeout: 100, retries: 0 });
      expect(result.error).toBe('Request timeout');
    });
  });
});
