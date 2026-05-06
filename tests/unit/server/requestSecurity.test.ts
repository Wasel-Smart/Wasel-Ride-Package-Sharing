import { describe, expect, it } from 'vitest';
import {
  buildAllowedOrigins,
  buildPublicHealthPayload,
  isRuntimeAdminEnabled,
  resolveAllowedOrigin,
} from '../../../supabase/functions/make-server-0b1f4071/_shared/request-security';

describe('request security helpers', () => {
  it('includes the app base url and local development origins', () => {
    const allowed = buildAllowedOrigins('https://wasel14.online');

    expect(allowed).toContain('https://wasel14.online');
    expect(allowed).toContain('http://localhost:5173');
    expect(allowed).toContain('http://127.0.0.1:4173');
  });

  it('accepts explicitly configured additional origins', () => {
    const allowed = buildAllowedOrigins(
      'https://wasel14.online',
      'https://admin.wasel14.online, https://preview.wasel14.online',
    );

    expect(allowed).toContain('https://admin.wasel14.online');
    expect(allowed).toContain('https://preview.wasel14.online');
  });

  it('resolves only trusted origins', () => {
    expect(
      resolveAllowedOrigin('https://wasel14.online', 'https://wasel14.online'),
    ).toBe('https://wasel14.online');
    expect(
      resolveAllowedOrigin('https://malicious.example', 'https://wasel14.online'),
    ).toBeNull();
  });

  it('treats runtime admin access as opt-in only', () => {
    expect(isRuntimeAdminEnabled('true')).toBe(true);
    expect(isRuntimeAdminEnabled('TRUE')).toBe(true);
    expect(isRuntimeAdminEnabled('false')).toBe(false);
    expect(isRuntimeAdminEnabled(undefined)).toBe(false);
  });

  it('keeps the public health payload minimal', () => {
    expect(buildPublicHealthPayload('make-server-0b1f4071')).toEqual({
      ok: true,
      service: 'make-server-0b1f4071',
    });
  });
});
