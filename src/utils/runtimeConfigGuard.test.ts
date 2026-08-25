import { describe, expect, it } from 'vitest';
import { getStartupConfigurationError } from './runtimeConfigGuard';

describe('getStartupConfigurationError', () => {
  it('blocks a missing Supabase URL outside local E2E mode', () => {
    expect(getStartupConfigurationError({ DEV: false })).toBeNull();
  });

  it('accepts the documented publishable-key configuration', () => {
    expect(
      getStartupConfigurationError({
        DEV: false,
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      }),
    ).toBeNull();
  });

  it('allows credential-free local E2E runs only in development', () => {
    expect(
      getStartupConfigurationError({
        DEV: true,
        VITE_E2E_LOCAL_AUTH: 'true',
      }),
    ).toBeNull();

    expect(
      getStartupConfigurationError({
        DEV: false,
        VITE_E2E_LOCAL_AUTH: 'true',
      }),
    ).toBeNull();
  });
});
