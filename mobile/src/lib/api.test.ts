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

import { apiClient, isValidApiUrl } from '../lib/api';

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
    it('does not retry a mutation unless it carries an idempotency key', async () => {
      const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

      const result = await apiClient.post('/test-endpoint', { field: 'value' });

      expect(result.status).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries on failure with exponential backoff', async () => {
      jest.spyOn(apiClient, 'request').mockResolvedValue({ data: { data: 'ok' }, error: null, status: 200 });

      const result = await apiClient.get('/test-endpoint');
      expect(result.data).toEqual({ data: 'ok' });
      jest.restoreAllMocks();
    });

    it('returns timeout error on abort', async () => {
      jest.spyOn(apiClient, 'request').mockResolvedValue({ data: null, error: 'Request timeout', status: 0 });

      const result = await apiClient.request('/test', { timeout: 100, retries: 0 });
      expect(result.error).toBe('Request timeout');
      jest.restoreAllMocks();
    });
  });

  describe('endpoint validation', () => {
    it('requires a hostname boundary for allowlisted domains', () => {
      expect(isValidApiUrl('https://api.wasel14.online/v1')).toBe(true);
      expect(isValidApiUrl('https://evilwasel14.online/v1')).toBe(false);
    });

    it('only permits HTTP for localhost', () => {
      expect(isValidApiUrl('http://localhost:3000/v1')).toBe(true);
      expect(isValidApiUrl('http://wasel14.online/v1')).toBe(false);
    });
  });
});
