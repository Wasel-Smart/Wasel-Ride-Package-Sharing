import { describe, expect, it } from 'vitest';
import { getRuntimeConfigIssues, validateRuntimeConfiguration } from '@/utils/env/validation';
import type { EnvSource } from '@/utils/env/resolvers';

const validEnv: EnvSource = {
  MODE: 'test',
  VITE_APP_URL: 'https://wasel14.online',
  VITE_API_URL: 'https://api.wasel14.online',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  VITE_SENTRY_DSN: 'https://abc@sentry.io/123',
  VITE_APP_INSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc123-def456',
};

describe('runtime environment validation', () => {
  it('accepts a complete public runtime configuration', () => {
    expect(validateRuntimeConfiguration(validEnv)).toEqual({ ok: true, issues: [] });
  });

  it('reports missing and malformed required URLs and Supabase settings', () => {
    const result = validateRuntimeConfiguration({
      MODE: 'production',
      VITE_APP_URL: 'not-a-url',
      VITE_API_URL: 'relative/api',
      VITE_SUPABASE_URL: 'not-a-url',
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map(issue => issue.key)).toEqual(expect.arrayContaining([
      'VITE_APP_URL',
      'VITE_API_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_SUPABASE_URL',
    ]));
  });

  it('skips configuration checks for explicit local end-to-end auth', () => {
    expect(getRuntimeConfigIssues({ MODE: 'test', VITE_E2E_LOCAL_AUTH: 'true' })).toEqual([]);
  });

  it('warns on production observability gaps and rejects insecure production options', () => {
    const issues = getRuntimeConfigIssues({
      ...validEnv,
      MODE: 'production',
      VITE_APP_URL: 'http://wasel14.online',
      VITE_SUPABASE_URL: 'http://project.supabase.co',
      VITE_SENTRY_DSN: undefined,
      VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
      VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
      VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
      VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
    });

    expect(issues.map(issue => issue.key)).toEqual(expect.arrayContaining([
      'VITE_APP_URL',
      'VITE_SUPABASE_URL',
      'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK',
      'VITE_SENTRY_DSN',
      'VITE_SUPPORT_EMAIL',
      'VITE_SUPPORT_SMS_NUMBER',
      'VITE_SUPPORT_WHATSAPP_NUMBER',
    ]));
  });
});
