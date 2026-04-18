import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeAuthReturnTo,
  buildAuthPagePath,
  buildAuthReturnTo,
  persistAuthReturnTo,
  readPersistedAuthReturnTo,
  consumePersistedAuthReturnTo,
} from '@/utils/authFlow';

const STORAGE_KEY = 'wasel_auth_return_to';
const DEFAULT_RETURN = '/app/find-ride';

describe('normalizeAuthReturnTo', () => {
  it('returns fallback for null', () => {
    expect(normalizeAuthReturnTo(null)).toBe(DEFAULT_RETURN);
  });

  it('returns fallback for undefined', () => {
    expect(normalizeAuthReturnTo(undefined)).toBe(DEFAULT_RETURN);
  });

  it('returns fallback for empty string', () => {
    expect(normalizeAuthReturnTo('')).toBe(DEFAULT_RETURN);
  });

  it('returns fallback for whitespace-only string', () => {
    expect(normalizeAuthReturnTo('   ')).toBe(DEFAULT_RETURN);
  });

  it('returns fallback for path not starting with /', () => {
    expect(normalizeAuthReturnTo('app/find-ride')).toBe(DEFAULT_RETURN);
  });

  it('returns fallback for path starting with //', () => {
    expect(normalizeAuthReturnTo('//evil.com')).toBe(DEFAULT_RETURN);
  });

  it('returns valid path starting with /', () => {
    expect(normalizeAuthReturnTo('/app/my-trips')).toBe('/app/my-trips');
  });

  it('trims whitespace from valid path', () => {
    expect(normalizeAuthReturnTo('  /app/wallet  ')).toBe('/app/wallet');
  });

  it('uses custom fallback when provided', () => {
    expect(normalizeAuthReturnTo(null, '/app/home')).toBe('/app/home');
  });

  it('handles path with query params', () => {
    expect(normalizeAuthReturnTo('/app/my-trips?tab=rides')).toBe('/app/my-trips?tab=rides');
  });
});

describe('buildAuthPagePath', () => {
  it('builds signin path by default', () => {
    const path = buildAuthPagePath();
    expect(path).toContain('/app/auth');
    expect(path).toContain('tab=signin');
  });

  it('builds signup path when specified', () => {
    const path = buildAuthPagePath('signup');
    expect(path).toContain('tab=signup');
  });

  it('includes returnTo param', () => {
    const path = buildAuthPagePath('signin', '/app/wallet');
    expect(path).toContain('returnTo=');
    expect(decodeURIComponent(path)).toContain('/app/wallet');
  });

  it('defaults to find-ride returnTo', () => {
    const path = buildAuthPagePath('signin');
    expect(decodeURIComponent(path)).toContain(DEFAULT_RETURN);
  });

  it('starts with /app/auth', () => {
    expect(buildAuthPagePath()).toMatch(/^\/app\/auth\?/);
  });
});

describe('buildAuthReturnTo', () => {
  it('returns valid path unchanged', () => {
    expect(buildAuthReturnTo('/app/find-ride')).toBe('/app/find-ride');
  });

  it('appends search string with leading ?', () => {
    expect(buildAuthReturnTo('/app/trips', '?tab=rides')).toBe('/app/trips?tab=rides');
  });

  it('auto-prefixes ? on bare search string', () => {
    expect(buildAuthReturnTo('/app/trips', 'tab=rides')).toBe('/app/trips?tab=rides');
  });

  it('appends hash with leading #', () => {
    expect(buildAuthReturnTo('/app/profile', '', '#security')).toBe('/app/profile#security');
  });

  it('auto-prefixes # on bare hash', () => {
    expect(buildAuthReturnTo('/app/profile', '', 'security')).toBe('/app/profile#security');
  });

  it('returns fallback for invalid path', () => {
    expect(buildAuthReturnTo('evil.com')).toBe(DEFAULT_RETURN);
  });

  it('combines pathname + search + hash', () => {
    expect(buildAuthReturnTo('/app/page', '?x=1', '#top')).toBe('/app/page?x=1#top');
  });

  it('omits search when empty', () => {
    expect(buildAuthReturnTo('/app/page', '')).toBe('/app/page');
  });

  it('omits hash when empty', () => {
    expect(buildAuthReturnTo('/app/page', '', '')).toBe('/app/page');
  });
});

describe('localStorage auth return-to persistence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('persists and reads a return path', () => {
    persistAuthReturnTo('/app/wallet');
    expect(readPersistedAuthReturnTo()).toBe('/app/wallet');
  });

  it('returns default when nothing is persisted', () => {
    expect(readPersistedAuthReturnTo()).toBe(DEFAULT_RETURN);
  });

  it('ignores invalid persisted value and returns fallback', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-valid-path');
    expect(readPersistedAuthReturnTo()).toBe(DEFAULT_RETURN);
  });

  it('uses custom fallback when nothing stored', () => {
    expect(readPersistedAuthReturnTo('/app/bus')).toBe('/app/bus');
  });

  it('consumePersistedAuthReturnTo returns value and clears storage', () => {
    persistAuthReturnTo('/app/driver');
    const value = consumePersistedAuthReturnTo();
    expect(value).toBe('/app/driver');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('consumePersistedAuthReturnTo returns default when nothing stored', () => {
    expect(consumePersistedAuthReturnTo()).toBe(DEFAULT_RETURN);
  });

  it('handles setItem failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => persistAuthReturnTo('/app/wallet')).not.toThrow();
    spy.mockRestore();
  });

  it('handles getItem failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readPersistedAuthReturnTo()).toBe(DEFAULT_RETURN);
    spy.mockRestore();
  });

  it('handles removeItem failure gracefully in consume', () => {
    persistAuthReturnTo('/app/packages');
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => consumePersistedAuthReturnTo()).not.toThrow();
    spy.mockRestore();
  });
});
