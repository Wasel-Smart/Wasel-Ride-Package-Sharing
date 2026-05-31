import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchWithRetry = vi.fn();
const mockGetAuthDetails = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  publicAnonKey: 'anon-key',
  createEdgeHeaders: (headers?: HeadersInit, userToken?: string) => {
    const finalHeaders = new Headers(headers ?? {});
    finalHeaders.set('apikey', 'anon-key');
    if (userToken) {
      finalHeaders.set('Authorization', `Bearer ${userToken}`);
    }
    return finalHeaders;
  },
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
  getAuthDetails: () => mockGetAuthDetails(),
}));

vi.mock('../../../src/utils/env', () => ({
  getConfig: () => mockGetConfig(),
}));

import {
  BackendRequestError,
  getSecureBackendFallbackError,
  requestEdgeJson,
  runBackendWorkflow,
} from '../../../src/services/backendWorkflow';

function response(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

describe('backendWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockGetConfig.mockReturnValue({ allowDirectSupabaseFallback: true });
  });

  it('adds auth headers for required edge requests', async () => {
    mockFetchWithRetry.mockResolvedValue(response({ ok: true }));

    await requestEdgeJson({
      path: '/profile/user-123',
      authMode: 'required',
      operation: 'Load profile',
    });

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/profile/user-123',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
      undefined,
    );

    const headers = (mockFetchWithRetry.mock.calls[0] as unknown[])[1] as { headers: Headers };
    const hdr = headers.headers;
    expect(hdr.get('Authorization')).toBe('Bearer token-123');
    expect(hdr.get('apikey')).toBe('anon-key');
  });

  it('uses the apikey header for public edge requests', async () => {
    mockFetchWithRetry.mockResolvedValue(response({ ok: true }));

    await requestEdgeJson({
      path: '/health',
      authMode: 'public',
      operation: 'Probe backend health',
    });

    const headers = mockFetchWithRetry.mock.calls[0]![1]!.headers as Headers;
    expect(headers.get('apikey')).toBe('anon-key');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('falls back when the edge request fails with a recoverable backend error', async () => {
    const fallback = vi.fn(async () => ({ source: 'fallback' }));

    const result = await runBackendWorkflow({
      operation: 'Trip creation',
      authMode: 'required',
      edge: async () => {
        throw new BackendRequestError('degraded', { status: 503, recoverable: true });
      },
      fallback,
    });

    expect(fallback).toHaveBeenCalledWith({ token: 'token-123', userId: 'user-123' });
    expect(result).toEqual({ source: 'fallback' });
  });

  it('does not fall back on non-recoverable edge errors', async () => {
    const fallback = vi.fn(async () => ({ source: 'fallback' }));

    await expect(runBackendWorkflow({
      operation: 'Trip creation',
      authMode: 'required',
      edge: async () => {
        throw new BackendRequestError('invalid payload', { status: 400, recoverable: false });
      },
      fallback,
    })).rejects.toThrow('invalid payload');

    expect(fallback).not.toHaveBeenCalled();
  });

  it('fails closed for write fallbacks when direct fallback is disabled', async () => {
    mockGetConfig.mockReturnValue({ allowDirectSupabaseFallback: false });

    await expect(runBackendWorkflow({
      operation: 'Profile update',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      edge: async () => {
        throw new BackendRequestError('gateway timeout', { status: 504, recoverable: true });
      },
      fallback: async () => ({ ok: true }),
    })).rejects.toThrow(getSecureBackendFallbackError('Profile update').message);
  });

  it('uses fallback immediately when edge transport is unavailable', async () => {
    const fallback = vi.fn(async () => ({ source: 'fallback' }));

    const result = await runBackendWorkflow({
      operation: 'Trip search',
      authMode: 'public',
      edgeAvailable: false,
      edge: async () => ({ source: 'edge' }),
      fallback,
    });

    expect(fallback).toHaveBeenCalledWith({});
    expect(result).toEqual({ source: 'fallback' });
  });
});
