import { describe, it, expect } from 'vitest';
import { getRouteMeta, isProtectedRoute, ROUTE_META } from '../routeMeta';

describe('routeMeta', () => {
  it('returns metadata for known routes', () => {
    const meta = getRouteMeta('/app/find-ride');
    expect(meta).toBeDefined();
    expect(meta?.title).toBe('Find Ride');
    expect(meta?.requiresAuth).toBe(true);
  });

  it('returns metadata for nested routes', () => {
    const meta = getRouteMeta('/app/wallet/transactions');
    expect(meta).toBeDefined();
    expect(meta?.path).toBe('/app/wallet');
  });

  it('returns undefined for unknown routes', () => {
    const meta = getRouteMeta('/unknown/path');
    expect(meta).toBeUndefined();
  });

  it('identifies protected routes', () => {
    expect(isProtectedRoute('/app/find-ride')).toBe(true);
    expect(isProtectedRoute('/app/wallet')).toBe(true);
    expect(isProtectedRoute('/app/privacy')).toBe(false);
    expect(isProtectedRoute('/')).toBe(false);
  });

  it('has analytics keys for all routes', () => {
    ROUTE_META.forEach(meta => {
      expect(meta.analyticsKey).toBeDefined();
      expect(meta.analyticsKey && meta.analyticsKey.length).toBeGreaterThan(0);
    });
  });
});
