import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasAnalyticsConsent,
  isDoNotTrackEnabled,
  isTrustedAnalyticsEndpoint,
} from '@/utils/performance';

describe('performance analytics safeguards', () => {
  const originalDoNotTrack = navigator.doNotTrack;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      value: null,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      value: originalDoNotTrack,
    });
    vi.restoreAllMocks();
  });

  it('requires explicit analytics consent', () => {
    expect(hasAnalyticsConsent()).toBe(false);

    window.localStorage.setItem('consent-analytics', 'true');
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('honors browser do-not-track signals', () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      configurable: true,
      value: '1',
    });

    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it('accepts secure analytics endpoints', () => {
    expect(isTrustedAnalyticsEndpoint('https://analytics.wasel14.online/vitals')).toBe(true);
  });

  it('rejects malformed analytics endpoints', () => {
    expect(isTrustedAnalyticsEndpoint('javascript:alert(1)')).toBe(false);
  });
});
