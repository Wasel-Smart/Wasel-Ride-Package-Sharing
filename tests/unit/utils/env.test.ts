import { describe, expect, it } from 'vitest';
import {
  getRuntimeConfigIssues,
  validateRuntimeConfiguration,
} from '@/utils/env';

describe('runtime environment validation', () => {
  const baseEnv = {
    MODE: 'production',
    VITE_APP_URL: 'https://wasel14.online',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
    VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
    VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
    VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
    VITE_SUPPORT_EMAIL: 'support@wasel.jo',
    VITE_SUPPORT_SMS_NUMBER: '962790000000',
    VITE_SUPPORT_WHATSAPP_NUMBER: '962790000000',
    VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'false',
    VITE_SENTRY_DSN: 'https://example@sentry.io/123',
  };

  it('passes a production-safe baseline config', () => {
    expect(validateRuntimeConfiguration(baseEnv).ok).toBe(true);
  });

  it('accepts the publishable key env without the legacy anon key', () => {
    const { VITE_SUPABASE_ANON_KEY: _unused, ...rest } = baseEnv;
    const result = validateRuntimeConfiguration({
      ...rest,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
    });

    expect(result.ok).toBe(true);
  });

  it('falls back to production app url and checked-in public supabase config', () => {
    const result = validateRuntimeConfiguration({
      MODE: 'production',
      VITE_PRODUCTION_APP_URL: 'https://wasel14.online',
      VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
      VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
      VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
      VITE_SUPPORT_EMAIL: 'support@wasel.jo',
      VITE_SUPPORT_SMS_NUMBER: '962790000000',
      VITE_SUPPORT_WHATSAPP_NUMBER: '962790000000',
      VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'false',
      VITE_SENTRY_DSN: 'https://example@sentry.io/123',
    });

    expect(result.ok).toBe(true);
  });

  it('keeps backend transport available when raw env vars are empty', () => {
    const result = validateRuntimeConfiguration({
      MODE: 'production',
      VITE_APP_URL: 'https://wasel14.online',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_PUBLIC_SUPABASE_URL: '',
      VITE_PUBLIC_SUPABASE_ANON_KEY: '',
    });

    expect(result.ok).toBe(true);
  });

  it('fails when direct supabase fallback stays enabled in production', () => {
    const result = getRuntimeConfigIssues({
      ...baseEnv,
      VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
    });

    expect(
      result.some((issue) => issue.key === 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK' && issue.severity === 'error'),
    ).toBe(true);
  });

  it('warns when production tracing is missing', () => {
    const result = getRuntimeConfigIssues({
      ...baseEnv,
      VITE_SENTRY_DSN: '',
    });

    expect(
      result.some((issue) => issue.key === 'VITE_SENTRY_DSN' && issue.severity === 'warning'),
    ).toBe(true);
  });

  it('fails when app url is not absolute', () => {
    const result = validateRuntimeConfiguration({
      ...baseEnv,
      VITE_APP_URL: '/relative-path',
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.key === 'VITE_APP_URL')).toBe(true);
  });

  it('allows production bundles to render under localhost preview', () => {
    const result = validateRuntimeConfiguration({
      ...baseEnv,
      VITE_APP_URL: 'https://wasel14.online',
    });

    expect(result.issues.some((issue) => issue.message.includes('HTTPS VITE_APP_URL'))).toBe(false);
    expect(result.ok).toBe(true);
  });
});
