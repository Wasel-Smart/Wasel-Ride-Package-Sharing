import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMockSupabase = () => ({
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  });

vi.mock('../src/utils/supabase/client.ts', () => ({
  supabase: null,
  supabaseUrl: '',
}));

describe('auth.test.ts', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock('../../src/utils/supabase/client.ts', () => ({
      supabase: mockSupabase,
      supabaseUrl: '',
    }));
  });

  it('signIn with valid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' }, user: { id: 'user-1' } },
      error: null,
    });

    const { authAPI: api } = await import('../../src/services/auth');
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

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signIn('test@example.com', 'wrong')).rejects.toThrow('Incorrect email or password.');
  });

  it('signIn with email not confirmed error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Email not confirmed' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signIn('test@example.com', 'password')).rejects.toThrow('Please confirm your email before signing in.');
  });

  it('signIn normalizes too many requests error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Too many requests', code: 'over_request_rate_limit' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signIn('test@example.com', 'password')).rejects.toThrow('Too many attempts. Please wait a moment and try again.');
  });

  it('signIn normalizes user not found error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'User not found', code: 'user_not_found' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signIn('test@example.com', 'password')).rejects.toThrow('Account not found. Please check your email or sign up.');
  });

  it('signIn normalizes invalid email error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email', code: 'email_address_invalid' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signIn('test@example.com', 'password')).rejects.toThrow('Please enter a valid email address.');
  });

  it('signUp normalizes weak password error', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'Password is too weak', code: 'weak_password' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signUp({ email: 'test@example.com', password: 'pass', firstName: 'J', lastName: 'D', phone: '' })).rejects.toThrow('Password is too weak. Please choose a stronger password.');
  });

  it('signUp normalizes signup disabled error', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'Signup disabled', code: 'signup_disabled' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signUp({ email: 'test@example.com', password: 'pass', firstName: 'J', lastName: 'D', phone: '' })).rejects.toThrow('Sign-up is currently disabled. Please contact support.');
  });

  it('signUp with valid data', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    });

    const { authAPI: api } = await import('../../src/services/auth');
    const result = await api.signUp({ email: 'test@example.com', password: 'password123', firstName: 'John', lastName: 'Doe', phone: '+962770000000' });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: expect.objectContaining({
        data: { full_name: 'John Doe', phone: '+962770000000' },
        emailRedirectTo: expect.any(String),
      }),
    });
    expect(result.user?.id).toBe('user-1');
  });

  it('signUp normalizes already registered error', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signUp({ email: 'test@example.com', password: 'pass', firstName: 'J', lastName: 'D', phone: '' })).rejects.toThrow('This email is already registered.');
  });

  it('signOut', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signOut()).resolves.toBeUndefined();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('getSession', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });

    const { authAPI: api } = await import('../../src/services/auth');
    const result = await api.getSession();
    expect(result.session?.access_token).toBe('token');
  });

  it('signIn throws on supabase not configured', async () => {
    vi.doMock('../../src/utils/supabase/client.ts', () => ({
      supabase: null,
      supabaseUrl: '',
    }));

    const { authAPI: api } = await import('../../src/services/auth');
    await expect(api.signIn('a@b.com', 'pass')).rejects.toThrow('Supabase auth is not configured');
  });

  it('signUp with empty phone omits phone field', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { authAPI: api } = await import('../../src/services/auth');
    await api.signUp({ email: 'test@example.com', password: 'password', firstName: 'John', lastName: 'Doe', phone: '' });

    const callArgs = mockSupabase.auth.signUp.mock.calls[0];
    expect((callArgs as unknown as any[])[0].options.data).toEqual({ full_name: 'John Doe' });
  });
});
