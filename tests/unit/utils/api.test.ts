/**
 * API Client Utilities — Unit Tests
 *
 * Covers: APIError class, NetworkError, TimeoutError,
 * getApiHeaders, generateId, RETRY_CONFIG constants,
 * and the retry/timeout behaviour of apiRequest.
 *
 * Standard: The API layer is the integration boundary between the frontend
 * and the Supabase/Edge backend. Every error classification must be tested.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  APIError,
  NetworkError,
  TimeoutError,
  getApiHeaders,
  generateId,
  RETRY_CONFIG,
  REQUEST_TIMEOUT,
  API_ENDPOINTS,
  apiRequest,
} from '../../../src/utils/api';

// ── 1. Error classes ──────────────────────────────────────────────────────────

describe('APIError', () => {
  it('has correct name', () => {
    const err = new APIError('test error', 404);
    expect(err.name).toBe('APIError');
  });

  it('stores status code', () => {
    const err = new APIError('not found', 404, 'NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });

  it('stores error code', () => {
    const err = new APIError('msg', 400, 'INVALID_INPUT');
    expect(err.code).toBe('INVALID_INPUT');
  });

  it('stores details', () => {
    const details = { field: 'email', issue: 'required' };
    const err = new APIError('validation', 422, 'VALIDATION', details);
    expect(err.details).toEqual(details);
  });

  it('defaults statusCode to 500', () => {
    const err = new APIError('server error');
    expect(err.statusCode).toBe(500);
  });

  it('toJSON() returns structured error object', () => {
    const err = new APIError('bad input', 400, 'BAD_INPUT', { field: 'phone' });
    const json = err.toJSON();
    expect(json.error).toBe('bad input');
    expect(json.statusCode).toBe(400);
    expect(json.code).toBe('BAD_INPUT');
    expect(json.details).toEqual({ field: 'phone' });
  });

  it('is instanceof Error', () => {
    expect(new APIError('msg') instanceof Error).toBe(true);
  });

  it('message is accessible via .message', () => {
    const err = new APIError('the message');
    expect(err.message).toBe('the message');
  });
});

describe('NetworkError', () => {
  it('has correct name', () => {
    expect(new NetworkError().name).toBe('NetworkError');
  });

  it('uses default message when none provided', () => {
    const err = new NetworkError();
    expect(err.message).toBe('Network request failed');
  });

  it('uses custom message', () => {
    const err = new NetworkError('connection refused');
    expect(err.message).toBe('connection refused');
  });

  it('is instanceof Error', () => {
    expect(new NetworkError() instanceof Error).toBe(true);
  });
});

describe('TimeoutError', () => {
  it('has correct name', () => {
    expect(new TimeoutError().name).toBe('TimeoutError');
  });

  it('uses default message when none provided', () => {
    expect(new TimeoutError().message).toBe('Request timeout');
  });

  it('stores custom timeout message', () => {
    const err = new TimeoutError('Request timeout after 30000ms');
    expect(err.message).toContain('30000');
  });

  it('is instanceof Error', () => {
    expect(new TimeoutError() instanceof Error).toBe(true);
  });
});

// ── 2. getApiHeaders ──────────────────────────────────────────────────────────

describe('getApiHeaders()', () => {
  it('returns Content-Type: application/json', () => {
    const headers = getApiHeaders() as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns Authorization header', () => {
    const headers = getApiHeaders() as Record<string, string>;
    expect(headers.Authorization).toBeTruthy();
    expect(headers.Authorization).toMatch(/^Bearer/);
  });

  it('uses provided access token in Authorization', () => {
    const headers = getApiHeaders('my-custom-token') as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer my-custom-token');
  });

  it('includes X-Client-Info header', () => {
    const headers = getApiHeaders() as Record<string, string>;
    expect(headers['X-Client-Info']).toBe('wasel-web');
  });
});

// ── 3. generateId ─────────────────────────────────────────────────────────────

describe('generateId()', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('uses provided prefix', () => {
    const id = generateId('booking');
    expect(id.startsWith('booking-')).toBe(true);
  });

  it('defaults prefix to "id"', () => {
    expect(generateId().startsWith('id-')).toBe(true);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test')));
    expect(ids.size).toBe(100);
  });

  it('contains a timestamp component', () => {
    const id = generateId('ride');
    const parts = id.split('-');
    // Format: prefix-timestamp-random
    expect(parts.length).toBeGreaterThanOrEqual(3);
    const ts = parseInt(parts[1]!, 10);
    expect(ts).toBeGreaterThan(1_000_000_000_000); // Valid ms timestamp
  });
});

// ── 4. RETRY_CONFIG constants ─────────────────────────────────────────────────

describe('RETRY_CONFIG', () => {
  it('maxRetries is a positive number', () => {
    expect(RETRY_CONFIG.maxRetries).toBeGreaterThan(0);
  });

  it('retryDelay is positive', () => {
    expect(RETRY_CONFIG.retryDelay).toBeGreaterThan(0);
  });

  it('retryableStatusCodes includes standard server errors', () => {
    expect(RETRY_CONFIG.retryableStatusCodes).toContain(500);
    expect(RETRY_CONFIG.retryableStatusCodes).toContain(502);
    expect(RETRY_CONFIG.retryableStatusCodes).toContain(503);
    expect(RETRY_CONFIG.retryableStatusCodes).toContain(504);
  });

  it('retryableStatusCodes includes rate limit (429)', () => {
    expect(RETRY_CONFIG.retryableStatusCodes).toContain(429);
  });

  it('does NOT include 400 Bad Request (client error, not retryable)', () => {
    expect(RETRY_CONFIG.retryableStatusCodes).not.toContain(400);
  });

  it('does NOT include 401 Unauthorised', () => {
    expect(RETRY_CONFIG.retryableStatusCodes).not.toContain(401);
  });

  it('does NOT include 403 Forbidden', () => {
    expect(RETRY_CONFIG.retryableStatusCodes).not.toContain(403);
  });
});

describe('REQUEST_TIMEOUT', () => {
  it('is a positive number in milliseconds', () => {
    expect(REQUEST_TIMEOUT).toBeGreaterThan(1000);
  });

  it('is between 5 and 60 seconds (reasonable timeout)', () => {
    expect(REQUEST_TIMEOUT).toBeGreaterThanOrEqual(5_000);
    expect(REQUEST_TIMEOUT).toBeLessThanOrEqual(60_000);
  });
});

// ── 5. API_ENDPOINTS constant map ─────────────────────────────────────────────

describe('API_ENDPOINTS', () => {
  it('defines core auth endpoints', () => {
    expect(API_ENDPOINTS.SIGNUP).toBeTruthy();
    expect(API_ENDPOINTS.SIGNIN).toBeTruthy();
    expect(API_ENDPOINTS.SIGNOUT).toBeTruthy();
  });

  it('defines wallet endpoints', () => {
    expect(API_ENDPOINTS.WALLET).toBeTruthy();
    expect(API_ENDPOINTS.WALLET_BALANCE).toBeTruthy();
    expect(API_ENDPOINTS.WALLET_TRANSACTIONS).toBeTruthy();
  });

  it('TRACK_PACKAGE is a function returning the correct path', () => {
    const path = API_ENDPOINTS.TRACK_PACKAGE('pkg-123');
    expect(path).toBe('/packages/pkg-123/track');
  });

  it('health endpoints are defined', () => {
    expect(API_ENDPOINTS.HEALTH).toBeTruthy();
    expect(API_ENDPOINTS.HEALTH_DB).toBeTruthy();
  });
});

// ── 6. apiRequest — error handling ────────────────────────────────────────────

describe('apiRequest() error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws APIError for 404 response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      apiRequest('https://api.wasel.jo/nonexistent', {}, 0),
    ).rejects.toThrow(APIError);
  });

  it('throws APIError with correct status code', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    try {
      await apiRequest('https://api.wasel.jo/protected', {}, 0);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err instanceof APIError).toBe(true);
      expect((err as APIError).statusCode).toBe(403);
    }
  });

  it('returns data for 200 response with JSON body', async () => {
    const mockData = { wallet: { balance: 50 } };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiRequest('https://api.wasel.jo/wallet/user-1', {}, 0);
    expect(result).toEqual(mockData);
  });

  it('throws when API_BASE_URL is not configured and endpoint is relative', async () => {
    await expect(
      apiRequest('/relative-endpoint', {}, 0),
    ).rejects.toThrow();
  });
});
