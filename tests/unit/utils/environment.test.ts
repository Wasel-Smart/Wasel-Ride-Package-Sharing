import { afterEach, describe, expect, it, vi } from 'vitest';

const importEnvironment = async () => import('@/utils/environment');

describe('environment config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the shipped public Supabase config when deploy-time env vars are missing', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENABLE_DEMO_DATA', 'false');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const environment = await importEnvironment();
    const config = environment.getEnvironmentConfig();

    expect(config.supabaseUrl).toBe('https://djccmatubyyudeosrngm.supabase.co');
    expect(config.supabaseKey).toBe('sb_publishable_Iy-jArsso0ehGKQ83kuiDg_1T-cl9zE');
    expect(() => environment.validateEnvironmentConfig()).not.toThrow();
  });
});
