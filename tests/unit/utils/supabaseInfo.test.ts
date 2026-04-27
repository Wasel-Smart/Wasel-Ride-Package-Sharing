import { afterEach, describe, expect, it, vi } from 'vitest';

const importInfo = async () => import('@/utils/supabase/info');

describe('supabase public config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not resolve placeholder env vars into a usable public config', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://your-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'your-anon-key-here');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', '');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('');
    expect(info.projectId).toBe('');
    expect(info.publicAnonKey).toBe('');
    expect(info.hasSupabasePublicConfig).toBe(false);
  });

  it('prefers explicit env values when they are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'custom-anon-key');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', '');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('https://custom-project.supabase.co');
    expect(info.projectId).toBe('custom-project');
    expect(info.publicAnonKey).toBe('custom-anon-key');
  });
});
