import { describe, it, expect, vi } from 'vitest';
import { createPackage, getPackage, getMyPackages } from '../../../src/services/packageApi';

describe('PackageApi Service Extended', () => {
  it('getPackage should call correct endpoint', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'pkg-123' } }),
    } as Response);

    await getPackage('pkg-123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/packages/pkg-123'),
      expect.any(Object),
    );
    mockFetch.mockRestore();
  });

  it('getMyPackages should call correct endpoint', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    await getMyPackages();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/packages/sender/me'),
      expect.any(Object),
    );
    mockFetch.mockRestore();
  });
});
