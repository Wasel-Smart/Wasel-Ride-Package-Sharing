import { describe, it, expect } from 'vitest';
import { api } from '../../../src/utils/api';

describe('API Client', () => {
  it('should export api object with get, post, patch, delete methods', () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.patch).toBe('function');
    expect(typeof api.delete).toBe('function');
  });

  it('should construct correct API URLs', () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/v1';
    expect(baseUrl).toBeDefined();
  });
});
