import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMockSupabase = () => {
  return {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  };
};

vi.mock('@/utils/supabase/client.ts', () => ({
  supabase: null,
  supabaseUrl: '',
}));

describe('auth.test.ts', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock('@/utils/supabase/client.ts', () => ({
      supabase: mockSupabase,
      supabaseUrl: '',
    }));
  });

  it('signIn with valid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' }, user: { id: 'user-1' } },
      error: null,
    });

    const { authAPI: api } = await import('@/services/auth');
    const result = await api.signIn('test@example.com', 'password123');

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.session?.access_token).toBe('token');
  });

  it('signIn with invalid credentials normalizes error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const { authAPI: api } = await import('@/services/auth');
    await expect(api.signIn('test@example.com', 'wrong')).rejects.toThrow('Incorrect email or password.');
  });

  it('signIn with email not confirmed error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Email not confirmed' },
    });

    const { authAPI: api } = await import('@/services/auth');
    await expect(api.signIn('test@example.com', 'password')).rejects.toThrow('Please confirm your email before signing in.');
  });

  it('signUp with valid data', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    });

    const { authAPI: api } = await import('@/services/auth');
    const result = await api.signUp('test@example.com', 'password123', 'John', 'Doe', '+962770000000');

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: expect.objectContaining({
        data: { full_name: 'John Doe', phone: '+962770000000' },
      }),
    });
    expect(result.user?.id).toBe('user-1');
  });

  it('signUp normalizes already registered error', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });

    const { authAPI: api } = await import('@/services/auth');
    await expect(api.signUp('test@example.com', 'pass', 'J', 'D', '')).rejects.toThrow('This email is already registered.');
  });

  it('signOut', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { authAPI: api } = await import('@/services/auth');
    await expect(api.signOut()).resolves.toBeUndefined();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('getSession', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });

    const { authAPI: api } = await import('@/services/auth');
    const result = await api.getSession();
    expect(result.session?.access_token).toBe('token');
  });

  it('signIn throws on supabase not configured', async () => {
    vi.doMock('@/utils/supabase/client.ts', () => ({
      supabase: null,
      supabaseUrl: '',
    }));

    const { authAPI: api } = await import('@/services/auth');
    await expect(api.signIn('a@b.com', 'pass')).rejects.toThrow('Supabase auth is not configured');
  });

  it('signUp with empty phone omits phone field', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { authAPI: api } = await import('@/services/auth');
    await api.signUp('test@example.com', 'password', 'John', 'Doe', '');

    const callArgs = mockSupabase.auth.signUp.mock.calls[0];
    expect((callArgs as unknown as any[])[0].options.data).toEqual({ full_name: 'John Doe' });
  });
});
