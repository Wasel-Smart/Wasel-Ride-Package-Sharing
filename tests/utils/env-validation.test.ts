/**
 * tests/utils/env-validation.test.ts
 *
 * Unit tests for src/utils/env/validation.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as envResolvers from '@/utils/env/resolvers';
type EnvSource = envResolvers.EnvSource;
import {
  validateRuntimeConfiguration,
  getRuntimeConfigIssues,
} from '@/utils/env/validation';

vi.mock('@/utils/env/resolvers', async (importOriginal) => {
  const actual = await importOriginal<typeof envResolvers>();
  return {
    ...actual,
    readEnvSource: vi.fn(),
    resolveAppUrl: vi.fn(),
    resolveSupabaseUrl: vi.fn(),
    resolveSupabasePublicKey: vi.fn(),
    resolveApiUrl: vi.fn(),
    getSupabaseProjectRefFromUrl: vi.fn(),
    getSupabaseProjectRefFromJwt: vi.fn(),
    isAbsoluteHttpUrl: vi.fn((v: string) => /^https?:\/\//.test(v)),
    trimConfiguredValue: vi.fn((v: string | undefined) => (typeof v === 'string' ? v.trim() : '')),
  };
});

const mockReadEnvSource = vi.mocked(envResolvers.readEnvSource);
const mockResolveAppUrl = vi.mocked(envResolvers.resolveAppUrl);
const mockResolveSupabaseUrl = vi.mocked(envResolvers.resolveSupabaseUrl);
const mockResolveSupabasePublicKey = vi.mocked(envResolvers.resolveSupabasePublicKey);
const mockResolveApiUrl = vi.mocked(envResolvers.resolveApiUrl);
const mockGetSupabaseProjectRefFromUrl = vi.mocked(envResolvers.getSupabaseProjectRefFromUrl);
const mockGetSupabaseProjectRefFromJwt = vi.mocked(envResolvers.getSupabaseProjectRefFromJwt);

const baseEnv: EnvSource = {
  VITE_APP_URL: 'https://www.wasel14.online',
  VITE_SUPABASE_URL: 'https://zexlxabdcsjefptmjhuq.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
  VITE_SENTRY_DSN: 'https://abc@sentry.io/123',
  VITE_APP_INSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc123-def456',
  MODE: 'production',
  NODE_ENV: 'production',
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'false',
  VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
  VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
  VITE_SUPPORT_EMAIL: 'support@wasel.jo',
  VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
  VITE_SUPPORT_SMS_NUMBER: '+962791234567',
  VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
  VITE_SUPPORT_WHATSAPP_NUMBER: '+962791234567',
};

function setupEnv(overrides: Partial<EnvSource> = {}) {
  const full: EnvSource = { ...baseEnv, ...overrides };
  mockReadEnvSource.mockReturnValue(full);
  mockResolveAppUrl.mockReturnValue(full.VITE_APP_URL as string);
  mockResolveSupabaseUrl.mockReturnValue(full.VITE_SUPABASE_URL as string);
  mockResolveSupabasePublicKey.mockReturnValue(full.VITE_SUPABASE_PUBLISHABLE_KEY as string);
  mockResolveApiUrl.mockReturnValue(undefined as unknown as string);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupEnv();
});

describe('validateRuntimeConfiguration()', () => {
  it('returns ok:true and no errors for a valid production config', () => {
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(true);
    expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
  });

  it('returns errors when VITE_APP_URL is missing', () => {
    setupEnv({ VITE_APP_URL: undefined });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_APP_URL' && i.severity === 'error')).toBe(true);
  });

  it('returns errors when VITE_APP_URL is not HTTPS in production', () => {
    setupEnv({ VITE_APP_URL: 'http://www.wasel14.online' });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_APP_URL' && i.severity === 'error')).toBe(true);
  });

  it('returns errors when VITE_SUPABASE_URL is missing', () => {
    setupEnv({ VITE_SUPABASE_URL: undefined });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_SUPABASE_URL')).toBe(true);
  });

  it('returns errors when Supabase URL is not HTTPS in production', () => {
    setupEnv({ VITE_SUPABASE_URL: 'http://zexlxabdcsjefptmjhuq.supabase.co' });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_SUPABASE_URL' && i.severity === 'error')).toBe(true);
  });

  it('returns error when VITE_SENTRY_DSN is missing in production (observability fails closed)', () => {
    setupEnv({ VITE_SENTRY_DSN: undefined });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_SENTRY_DSN' && i.severity === 'error')).toBe(true);
  });

  it('returns error when direct Supabase fallback is enabled in production', () => {
    setupEnv({ VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true' });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK')).toBe(true);
  });

  it('skips strict checks in development mode when E2E local auth is enabled', () => {
    setupEnv({
      MODE: 'development',
      NODE_ENV: 'development',
      VITE_E2E_LOCAL_AUTH: 'true',
    });
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(true);
  });

  it('detects Supabase project mismatch between URL and key', () => {
    setupEnv();
    mockGetSupabaseProjectRefFromUrl.mockReturnValue('proj-a');
    mockGetSupabaseProjectRefFromJwt.mockReturnValue('proj-b');
    const result = validateRuntimeConfiguration();
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.key === 'VITE_SUPABASE_PUBLISHABLE_KEY')).toBe(true);
  });
});

describe('getRuntimeConfigIssues()', () => {
  it('returns an array of RuntimeConfigIssue objects', () => {
    setupEnv();
    const issues = getRuntimeConfigIssues();
    expect(Array.isArray(issues)).toBe(true);
    if (issues.length > 0) {
      expect(issues[0]).toHaveProperty('key');
      expect(issues[0]).toHaveProperty('message');
      expect(issues[0]).toHaveProperty('severity');
    }
  });
});
