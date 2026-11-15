/**
 * tests/utils/observability-config.test.ts
 *
 * Unit tests for src/utils/observability-config.ts
 */

import { describe, it, expect } from 'vitest';
import {
  validateObservabilityConfig,
  validateObservabilityConfigStrict,
} from '@/utils/observability-config';

const baseEnv = {
  VITE_SENTRY_DSN: 'https://abc123@sentry.io/456',
  VITE_APP_INSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc123-def456',
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.wasel.jo/v1/traces',
};

describe('validateObservabilityConfig()', () => {
  it('returns no issues when all keys are set with real values', () => {
    const issues = validateObservabilityConfig(baseEnv, false);
    expect(issues).toHaveLength(0);
  });

  it('flags missing Sentry DSN as error in production', () => {
    const env = { ...baseEnv, VITE_SENTRY_DSN: undefined };
    const issues = validateObservabilityConfig(env, true);
    expect(issues.some(i => i.key === 'VITE_SENTRY_DSN' && i.severity === 'error')).toBe(true);
  });

  it('flags missing App Insights as error in production', () => {
    const env = { ...baseEnv, VITE_APP_INSIGHTS_CONNECTION_STRING: undefined };
    const issues = validateObservabilityConfig(env, true);
    expect(issues.some(i => i.key === 'VITE_APP_INSIGHTS_CONNECTION_STRING' && i.severity === 'error')).toBe(true);
  });

  it('flags missing Sentry DSN as warning in non-production', () => {
    const env = { ...baseEnv, VITE_SENTRY_DSN: undefined };
    const issues = validateObservabilityConfig(env, false);
    expect(issues.some(i => i.key === 'VITE_SENTRY_DSN' && i.severity === 'warning')).toBe(true);
  });

  it('flags placeholder Sentry DSN', () => {
    const env = { ...baseEnv, VITE_SENTRY_DSN: 'paste_your_sentry_dsn_here' };
    const issues = validateObservabilityConfig(env, true);
    expect(issues.some(i => i.key === 'VITE_SENTRY_DSN' && i.severity === 'error')).toBe(true);
  });

  it('flags placeholder App Insights connection string', () => {
    const env = { ...baseEnv, VITE_APP_INSIGHTS_CONNECTION_STRING: 'your_app_insights_connection_string' };
    const issues = validateObservabilityConfig(env, true);
    expect(issues.some(i => i.key === 'VITE_APP_INSIGHTS_CONNECTION_STRING' && i.severity === 'error')).toBe(true);
  });

  it('flags placeholder OTLP endpoint as warning', () => {
    const env = { ...baseEnv, VITE_OTEL_EXPORTER_OTLP_ENDPOINT: 'placeholder_otel_endpoint' };
    const issues = validateObservabilityConfig(env, true);
    expect(issues.some(i => i.key === 'VITE_OTEL_EXPORTER_OTLP_ENDPOINT' && i.severity === 'warning')).toBe(true);
  });

  it('returns warnings (not errors) for missing keys in non-production', () => {
    const issues = validateObservabilityConfig({}, false);
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
    const warnings = issues.filter(i => i.severity === 'warning');
    expect(warnings.length).toBe(2); // Sentry + App Insights
  });
});

describe('validateObservabilityConfigStrict()', () => {
  it('returns ok:true when no errors', () => {
    const result = validateObservabilityConfigStrict(baseEnv, false);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns ok:false when errors exist', () => {
    const env = { ...baseEnv, VITE_SENTRY_DSN: undefined };
    const result = validateObservabilityConfigStrict(env, true);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
