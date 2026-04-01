import { afterEach, describe, expect, it, vi } from 'vitest';

const importInfo = async () => import('@/utils/supabase/info');

describe('supabase public config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to the shipped public project config when env vars are placeholders', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://your-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'your-anon-key-here');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('https://djccmatubyyudeosrngm.supabase.co');
    expect(info.projectId).toBe('djccmatubyyudeosrngm');
    expect(info.publicAnonKey).toBe('sb_publishable_Iy-jArsso0ehGKQ83kuiDg_1T-cl9zE');
    expect(info.hasSupabasePublicConfig).toBe(true);
  });

  it('prefers explicit env values when they are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'custom-anon-key');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('https://custom-project.supabase.co');
    expect(info.projectId).toBe('custom-project');
    expect(info.publicAnonKey).toBe('custom-anon-key');
  });
});
