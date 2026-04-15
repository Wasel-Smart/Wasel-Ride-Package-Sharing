import { afterEach, describe, expect, it, vi } from 'vitest';

const importEnvironment = async () => import('@/utils/environment');

describe('environment config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails validation when the public Supabase env vars are missing', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENABLE_DEMO_DATA', 'false');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const environment = await importEnvironment();
    expect(() => environment.validateEnvironmentConfig()).toThrow('VITE_SUPABASE_URL is not configured');
  });

  it('accepts explicit protected-environment configuration', async () => {
    vi.stubEnv('VITE_APP_ENV', 'staging');
    vi.stubEnv('VITE_APP_URL', 'https://staging.wasel.jo');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'staging-anon-key');
    vi.stubEnv('VITE_ENABLE_DEMO_DATA', 'false');
    vi.stubEnv('VITE_ENABLE_SYNTHETIC_TRIPS', 'false');
    vi.stubEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', 'false');
    vi.stubEnv('VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', 'false');

    const environment = await importEnvironment();
    expect(() => environment.validateEnvironmentConfig()).not.toThrow();
  });
});
