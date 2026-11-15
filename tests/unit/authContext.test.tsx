import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useContext, useEffect } from 'react';
import { AuthContext, AuthProvider, type AuthContextType } from '@/contexts/auth/AuthContext';

const authApiMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  createProfile: vi.fn(),
}));

// ── Supabase client mock ──────────────────────────────────────────────────────
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();

const mockSupabaseClient = {
  auth: {
    onAuthStateChange: mockOnAuthStateChange,
    getSession: mockGetSession,
    signInWithPassword: mockSignInWithPassword,
    signUp: mockSignUp,
    signOut: mockSignOut,
    updateUser: mockUpdateUser,
    resetPasswordForEmail: mockResetPasswordForEmail,
  },
};

vi.mock('@/contexts/auth/auth-service', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  loadProfileFromBackend: vi.fn().mockResolvedValue(null),
  authAPI: authApiMocks,
}));

vi.mock('@/services/auth', () => ({
  authAPI: authApiMocks,
}));

vi.mock('@/utils/sessionManager', () => ({
  sessionManager: { startSession: vi.fn(), endSession: vi.fn() },
}));

vi.mock('@/utils/env', () => ({
  getAuthCallbackUrl: vi.fn(() => 'https://wasel14.online/auth/callback'),
  resolveAuthRedirectOrigin: vi.fn(() => 'https://wasel14.online'),
}));

vi.mock('@/utils/sanitization', () => ({
  sanitizeLogMessage: vi.fn((s: string) => s),
}));

vi.mock('@/utils/oauthErrors', () => ({
  parseOAuthError: vi.fn(() => null),
}));

import { getSupabaseClient, loadProfileFromBackend } from '@/contexts/auth/auth-service';
import { authAPI } from '@/services/auth';

// ── Helper: consumer component ────────────────────────────────────────────────
function AuthConsumer() {
  const ctx = useContext(AuthContext);
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="user">{ctx.user?.email ?? 'null'}</span>
      <span data-testid="backend">{String(ctx.isBackendConnected)}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  localStorage.removeItem('wasel_user_session');
  document.cookie = 'wasel-auth-token=; Max-Age=0; path=/';
  document.cookie = 'wasel-auth-token=test-session; path=/';

  // Restore default mock returns cleared by vi.clearAllMocks()
  vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as never);
  vi.mocked(loadProfileFromBackend).mockResolvedValue(null);

  // Default: onAuthStateChange fires INITIAL_SESSION with no session
  mockOnAuthStateChange.mockImplementation((cb: (event: string, session: null) => void) => {
    setTimeout(() => cb('INITIAL_SESSION', null), 0);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthProvider — initialization', () => {
  it('starts in loading state and resolves to not-loading with no session', async () => {
    renderProvider();
    expect(screen.getByTestId('loading').textContent).toBe('true');
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('sets user and isBackendConnected when INITIAL_SESSION has a session', async () => {
    const fakeUser = { id: 'u1', email: 'rider@wasel.jo', user_metadata: {} };
    const fakeSession = { user: fakeUser, access_token: 'tok' };

    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: typeof fakeSession) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', fakeSession), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('rider@wasel.jo'));
    expect(screen.getByTestId('backend').textContent).toBe('true');
  });

  it('falls back to local E2E session when VITE_E2E_LOCAL_AUTH is true', async () => {
    const localUser = {
      id: 'e2e-user', name: 'E2E Rider', email: 'e2e@wasel.jo', role: 'rider',
      balance: 0, rating: 5, trips: 0, verified: false,
      verificationLevel: 'level_0', walletStatus: 'active', emailVerified: false,
      phoneVerified: false, twoFactorEnabled: false, trustScore: 0, backendMode: 'supabase',
    };

    // Seed localStorage before render
    localStorage.setItem('wasel_user_session', JSON.stringify(localUser));

    // Patch import.meta.env for this test
    const originalEnv = import.meta.env.VITE_E2E_LOCAL_AUTH;
    vi.stubEnv('VITE_E2E_LOCAL_AUTH', 'true');

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('e2e@wasel.jo');

    // Restore
    vi.unstubAllEnvs();
    if (originalEnv !== undefined) {
      vi.stubEnv('VITE_E2E_LOCAL_AUTH', originalEnv);
    }
    localStorage.removeItem('wasel_user_session');
  });

  it('handles missing Supabase client gracefully (no crash)', async () => {
    vi.mocked(getSupabaseClient).mockReturnValueOnce(null as never);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('backend').textContent).toBe('false');
  });

  it('skips Supabase initialization for a visitor with no auth cookie', async () => {
    document.cookie = 'wasel-auth-token=; Max-Age=0; path=/';
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });
});

describe('AuthProvider — signIn', () => {
  it('subscribes to Supabase when a visitor starts sign-in after lazy guest startup', async () => {
    document.cookie = 'wasel-auth-token=; Max-Age=0; path=/';
    const fakeUser = { id: 'u-lazy', email: 'lazy@wasel.jo', user_metadata: {} };
    const fakeSession = { user: fakeUser, access_token: 'lazy-token' };
    vi.mocked(authAPI.signIn).mockResolvedValue({ user: fakeUser, session: fakeSession } as never);

    let ctx!: AuthContextType;
    function Capture() {
      const value = useContext(AuthContext);
      useEffect(() => { ctx = value; }, [value]);
      return null;
    }

    render(<AuthProvider><Capture /></AuthProvider>);
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(getSupabaseClient).not.toHaveBeenCalled();

    await act(async () => {
      await ctx.signIn('lazy@wasel.jo', 'password123');
    });

    expect(mockOnAuthStateChange).toHaveBeenCalled();
    expect(ctx.user?.email).toBe('lazy@wasel.jo');
  });

  it('returns null error and sets user on success', async () => {
    const fakeUser = { id: 'u2', email: 'driver@wasel.jo', user_metadata: {} };
    const fakeSession = { user: fakeUser, access_token: 'tok2' };
    vi.mocked(authAPI.signIn).mockResolvedValue({ user: fakeUser, session: fakeSession } as never);

    let ctx!: AuthContextType;
    function Capture() {
      const value = useContext(AuthContext);
      useEffect(() => { ctx = value; }, [value]);
      return null;
    }

    await act(async () => {
      render(<AuthProvider><Capture /></AuthProvider>);
    });

    let result!: { error: unknown };
    await act(async () => {
      result = await ctx.signIn('driver@wasel.jo', 'password123');
    });

    expect(result.error).toBeNull();
    expect(vi.mocked(authAPI.signIn)).toHaveBeenCalledWith('driver@wasel.jo', 'password123');
  });

  it('returns an error when signIn throws', async () => {
    vi.mocked(authAPI.signIn).mockRejectedValue(new Error('Invalid credentials'));

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: { error: unknown };
    await act(async () => { result = await ctx.signIn('bad@wasel.jo', 'wrong'); });

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Invalid credentials');
  });
});

describe('AuthProvider — signUp', () => {
  it('returns requiresEmailConfirmation=true when no session is returned', async () => {
    vi.mocked(authAPI.signUp).mockResolvedValue({ user: { id: 'u3' }, session: null } as never);

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: Awaited<ReturnType<typeof ctx.signUp>>;
    await act(async () => {
      result = await ctx.signUp('new@wasel.jo', 'pass', 'New User');
    });

    expect(result.error).toBeNull();
    expect(result.requiresEmailConfirmation).toBe(true);
  });

  it('returns error when backend is not configured', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null as never);

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: Awaited<ReturnType<typeof ctx.signUp>>;
    await act(async () => {
      result = await ctx.signUp('x@wasel.jo', 'pass', 'X');
    });

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('Backend not configured');
  });
});

describe('AuthProvider — signOut', () => {
  it('clears user and session after signOut', async () => {
    vi.mocked(authAPI.signOut).mockResolvedValue(undefined);

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });
    await act(async () => { await ctx.signOut(); });

    expect(ctx.user).toBeNull();
    expect(ctx.session).toBeNull();
  });
});

describe('AuthProvider — updateProfile', () => {
  it('returns error when no user is logged in', async () => {
    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: { error: unknown };
    await act(async () => { result = await ctx.updateProfile({ full_name: 'New Name' }); });

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('No user logged in');
  });

  it('returns null error on successful profile update', async () => {
    const fakeUser = { id: 'u4', email: 'u@wasel.jo', user_metadata: {} };
    const fakeSession = { user: fakeUser, access_token: 'tok4' };

    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: typeof fakeSession) => void) => {
      setTimeout(() => cb('SIGNED_IN', fakeSession), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    vi.mocked(authAPI.updateProfile).mockResolvedValue({ success: true } as never);
    vi.mocked(loadProfileFromBackend).mockResolvedValue({ id: 'u4', full_name: 'New Name' } as never);

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });
    await waitFor(() => expect(ctx.user).not.toBeNull());

    let result!: { error: unknown };
    await act(async () => { result = await ctx.updateProfile({ full_name: 'New Name' }); });

    expect(result.error).toBeNull();
  });
});

describe('AuthProvider — resetPassword', () => {
  it('returns null error on success', async () => {
    mockSupabaseClient.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: { error: unknown };
    await act(async () => { result = await ctx.resetPassword('rider@wasel.jo'); });

    expect(result.error).toBeNull();
  });

  it('returns error when backend is not configured', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null as never);

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: { error: unknown };
    await act(async () => { result = await ctx.resetPassword('x@wasel.jo'); });

    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('AuthProvider — changePassword', () => {
  it('returns null error on success', async () => {
    mockSupabaseClient.auth.updateUser = vi.fn().mockResolvedValue({ error: null });

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: { error: unknown };
    await act(async () => { result = await ctx.changePassword('newSecurePass!1'); });

    expect(result.error).toBeNull();
  });

  it('returns error when backend is not configured', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null as never);

    let ctx!: AuthContextType;
    function Capture() { const value = useContext(AuthContext); useEffect(() => { ctx = value; }, [value]); return null; }

    await act(async () => { render(<AuthProvider><Capture /></AuthProvider>); });

    let result!: { error: unknown };
    await act(async () => { result = await ctx.changePassword('newpass'); });

    expect(result.error).toBeInstanceOf(Error);
  });
});
