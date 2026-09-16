import { describe, it, expect } from 'vitest';
import { ROUTE_META, getRouteMeta, isProtectedRoute } from '../../router/routeMeta';

describe('Route Meta', () => {
  it('has no duplicate paths', () => {
    const paths = ROUTE_META.map(m => m.path);
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(duplicates).toEqual([]);
  });

  it('all /app routes are protected', () => {
    const appRoutes = ROUTE_META.filter(m => m.path.startsWith('/app') && !m.path.includes(':'));
    const unprotected = appRoutes.filter(m => !m.requiresAuth);
    expect(unprotected).toEqual([]);
  });

  it('getRouteMeta finds existing routes', () => {
    expect(getRouteMeta('/app/find-ride')?.path).toBe('/app/find-ride');
    expect(getRouteMeta('/app/wallet')?.path).toBe('/app/wallet');
    expect(getRouteMeta('/')).toBeDefined();
    expect(getRouteMeta('/nonexistent')).toBeUndefined();
  });

  it('isProtectedRoute works correctly', () => {
    expect(isProtectedRoute('/app/find-ride')).toBe(true);
    expect(isProtectedRoute('/app')).toBe(false);
    expect(isProtectedRoute('/')).toBe(false);
  });
});