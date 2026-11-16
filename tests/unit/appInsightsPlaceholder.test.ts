import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the ApplicationInsights SDK so tests never hit the network.
// `ApplicationInsights` must be a real constructor: `appInsights.ts` calls
// `new ApplicationInsights(...)`, and an arrow mock implementation throws
// "is not a constructor" (swallowed by the production try/catch), leaving the
// instance null and failing the "initializes when valid" assertion.
vi.mock('@microsoft/applicationinsights-web', () => {
  class MockApplicationInsights {
    addTelemetryInitializer = vi.fn();
    loadAppInsights = vi.fn();
    trackPageView = vi.fn();
    trackMetric = vi.fn();
    trackEvent = vi.fn();
    trackException = vi.fn();
    unload = vi.fn();
  }
  return {
    ApplicationInsights: MockApplicationInsights,
    DistributedTracingModes: { AI: 0 },
  };
});

vi.mock('@/utils/analyticsConsent', () => ({
  hasAnalyticsConsent: vi.fn(() => true),
}));

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

describe('appInsights — placeholder detection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('does not initialize when connection string is absent', async () => {
    vi.stubEnv('VITE_APP_INSIGHTS_CONNECTION_STRING', '');
    const { initializeAppInsights, getAppInsights } = await import('@/utils/appInsights');
    initializeAppInsights();
    expect(getAppInsights()).toBeNull();
  });

  it('does not initialize when connection string is a placeholder', async () => {
    vi.stubEnv('VITE_APP_INSIGHTS_CONNECTION_STRING', 'paste_your_connection_string_here');
    const { initializeAppInsights, getAppInsights } = await import('@/utils/appInsights');
    initializeAppInsights();
    expect(getAppInsights()).toBeNull();
  });

  it('does not initialize when connection string lacks InstrumentationKey', async () => {
    vi.stubEnv('VITE_APP_INSIGHTS_CONNECTION_STRING', 'IngestionEndpoint=https://eastus.in.applicationinsights.azure.com/');
    const { initializeAppInsights, getAppInsights } = await import('@/utils/appInsights');
    initializeAppInsights();
    expect(getAppInsights()).toBeNull();
  });

  it('does not initialize when connection string lacks a valid region host', async () => {
    vi.stubEnv('VITE_APP_INSIGHTS_CONNECTION_STRING', 'InstrumentationKey=abc123;IngestionEndpoint=https://example.com/');
    const { initializeAppInsights, getAppInsights } = await import('@/utils/appInsights');
    initializeAppInsights();
    expect(getAppInsights()).toBeNull();
  });

  it('initializes when connection string looks valid', async () => {
    vi.stubEnv(
      'VITE_APP_INSIGHTS_CONNECTION_STRING',
      'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://eastus.in.applicationinsights.azure.com/',
    );
    const { initializeAppInsights, getAppInsights } = await import('@/utils/appInsights');
    initializeAppInsights();
    expect(getAppInsights()).not.toBeNull();
  });

  it('disableAppInsights sets instance to null', async () => {
    vi.stubEnv(
      'VITE_APP_INSIGHTS_CONNECTION_STRING',
      'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://eastus.in.applicationinsights.azure.com/',
    );
    const { initializeAppInsights, disableAppInsights, getAppInsights } = await import('@/utils/appInsights');
    initializeAppInsights();
    disableAppInsights();
    expect(getAppInsights()).toBeNull();
  });

  it('disableAppInsights is safe when never initialized', async () => {
    const { disableAppInsights } = await import('@/utils/appInsights');
    expect(() => disableAppInsights()).not.toThrow();
  });

  it('trackCustomEvent does not throw when not initialized', async () => {
    const { trackCustomEvent } = await import('@/utils/appInsights');
    expect(() => trackCustomEvent('test_event', { count: 1 })).not.toThrow();
  });

  it('trackException does not throw when not initialized', async () => {
    const { trackException } = await import('@/utils/appInsights');
    expect(() => trackException(new Error('test'))).not.toThrow();
  });

  it('trackMetric does not throw when not initialized', async () => {
    const { trackMetric } = await import('@/utils/appInsights');
    expect(() => trackMetric('latency', 120)).not.toThrow();
  });
});
