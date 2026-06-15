import { afterEach, describe, expect, it, vi } from 'vitest';

const importInfo = async () => import('@/utils/supabase/info');

describe('supabase public config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('treats placeholder env values as not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://your-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'your-anon-key-here');
    vi.stubEnv('VITE_SUPABASE_PROJECT_URL', 'https://your-project.supabase.co');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', 'https://your-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'your-anon-key-here');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', 'your-anon-key-here');

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
    vi.stubEnv('VITE_SUPABASE_PROJECT_URL', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', '');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('https://custom-project.supabase.co');
    expect(info.projectId).toBe('custom-project');
    expect(info.publicAnonKey).toBe('custom-anon-key');
  });

  it('rejects malformed Supabase urls even when a key is present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('VITE_SUPABASE_PROJECT_URL', 'not-a-url');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'custom-anon-key');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', '');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('');
    expect(info.projectId).toBe('');
    expect(info.publicAnonKey).toBe('custom-anon-key');
    expect(info.hasSupabasePublicConfig).toBe(false);
  });

  it('uses the checked-in public fallback during development when env vars are missing', async () => {
    vi.stubEnv('MODE', 'development');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('https://djccmatubyyudeosrngm.supabase.co');
    expect(info.projectId).toBe('djccmatubyyudeosrngm');
    expect(info.publicAnonKey).toContain('eyJhbGciOiJIUzI1Ni');
    expect(info.hasSupabasePublicConfig).toBe(true);
  });

  it('keeps explicit Supabase env values even when e2e local auth is enabled', async () => {
    vi.stubEnv('VITE_E2E_LOCAL_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'custom-anon-key');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_PROJECT_URL', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', '');

    const info = await importInfo();

    expect(info.publicSupabaseUrl).toBe('https://custom-project.supabase.co');
    expect(info.projectId).toBe('custom-project');
    expect(info.publicAnonKey).toBe('custom-anon-key');
    expect(info.hasSupabasePublicConfig).toBe(true);
  });
});
