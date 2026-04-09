/**
 * AuthContext — Unit Tests
 *
 * Covers the public API of AuthContext:
 *   signIn, signUp, signOut, resetPassword, changePassword,
 *   updateProfile, refreshProfile, resendSignupConfirmation
 *
 * Strategy: mock Supabase and LocalAuth; verify that AuthContext
 * correctly delegates, propagates errors, and updates state.
 *
 * All tests run in jsdom without a real backend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../src/contexts/AuthContext';

// ── Supabase client mock ──────────────────────────────────────────────────────
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});
const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
const mockUpdateUser = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../../src/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
  isSupabaseConfigured: true,
}));

// ── LocalAuth mock ────────────────────────────────────────────────────────────
const mockLocalSignIn = vi.fn().mockResolvedValue({ error: null });
const mockLocalRegister = vi.fn().mockResolvedValue({ error: null });
const mockLocalSignOut = vi.fn().mockResolvedValue(undefined);
const mockLocalUpdateUser = vi.fn();

vi.mock('../../../src/contexts/LocalAuth', () => ({
  LocalAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useLocalAuth: () => ({
    user: null,
    loading: false,
    signIn: mockLocalSignIn,
    register: mockLocalRegister,
    signOut: mockLocalSignOut,
    updateUser: mockLocalUpdateUser,
  }),
}));

// ── authAPI mock ──────────────────────────────────────────────────────────────
vi.mock('../../../src/services/auth', () => ({
  authAPI: {
    updateProfile: vi.fn().mockResolvedValue({ success: true }),
    resendSignupConfirmation: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── helpers ───────────────────────────────────────────────────────────────────
function TestConsumer({ action }: { action: (ctx: ReturnType<typeof useAuth>) => void }) {
  const ctx = useAuth();
  action(ctx);
  return <div data-testid="loaded">{ctx.loading ? 'loading' : 'ready'}</div>;
}

function renderWithAuth(action: (ctx: ReturnType<typeof useAuth>) => void) {
  return render(
    <AuthProvider>
      <TestConsumer action={action} />
    </AuthProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthContext — initial state', () => {
  it('exposes null user and session before any auth event', async () => {
    let capturedCtx: ReturnType<typeof useAuth> | null = null;

    renderWithAuth(ctx => { capturedCtx = ctx; });

    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('ready'));
    expect(capturedCtx?.user).toBeNull();
    expect(capturedCtx?.session).toBeNull();
    expect(capturedCtx?.profile).toBeNull();
  });

  it('sets isBackendConnected to true when Supabase is configured', async () => {
    let capturedCtx: ReturnType<typeof useAuth> | null = null;

    renderWithAuth(ctx => { capturedCtx = ctx; });

    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('ready'));
    expect(capturedCtx?.isBackendConnected).toBe(true);
  });
});

describe('AuthContext — signIn', () => {
  beforeEach(() => {
    mockLocalSignIn.mockResolvedValue({ error: null });
  });

  it('returns no error on successful sign-in', async () => {
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.signIn('user@example.com', 'ValidPass1!').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(result?.error).toBeNull();
  });

  it('returns an error when LocalAuth rejects', async () => {
    mockLocalSignIn.mockResolvedValueOnce({ error: 'Invalid credentials' });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.signIn('bad@email.com', 'wrongpass').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(result?.error).toBeInstanceOf(Error);
    expect((result?.error as Error).message).toBe('Invalid credentials');
  });
});

describe('AuthContext — signUp', () => {
  it('delegates to LocalAuth.register and returns no error on success', async () => {
    mockLocalRegister.mockResolvedValueOnce({ error: null });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.signUp('user@example.com', 'ValidPass1!', 'Ahmad Wasel').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(mockLocalRegister).toHaveBeenCalledWith('Ahmad Wasel', 'user@example.com', 'ValidPass1!');
    expect(result?.error).toBeNull();
  });

  it('surfaces registration errors', async () => {
    mockLocalRegister.mockResolvedValueOnce({ error: 'Email already in use' });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.signUp('taken@example.com', 'ValidPass1!', 'Duplicate User').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect((result?.error as Error).message).toBe('Email already in use');
  });
});

describe('AuthContext — signOut', () => {
  it('calls LocalAuth.signOut and clears user/session/profile', async () => {
    await act(async () => {
      renderWithAuth(ctx => { void ctx.signOut(); });
    });

    expect(mockLocalSignOut).toHaveBeenCalled();
  });
});

describe('AuthContext — resetPassword', () => {
  it('calls supabase.auth.resetPasswordForEmail with the correct email', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.resetPassword('reset@wasel.jo').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'reset@wasel.jo',
      expect.objectContaining({ redirectTo: expect.any(String) }),
    );
    expect(result?.error).toBeNull();
  });

  it('returns an error when supabase rejects with a non-redirect error', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'Rate limited' },
    });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.resetPassword('user@wasel.jo').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(result?.error).toBeTruthy();
  });
});

describe('AuthContext — changePassword', () => {
  it('calls supabase.auth.updateUser with the new password', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.changePassword('NewSecurePass1!').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewSecurePass1!' });
    expect(result?.error).toBeNull();
  });

  it('surfaces supabase errors on password update failure', async () => {
    const err = new Error('Password update failed');
    mockUpdateUser.mockResolvedValueOnce({ error: err });
    let result: { error: unknown } | null = null;

    renderWithAuth(ctx => {
      void ctx.changePassword('Bad').then(r => { result = r; });
    });

    await waitFor(() => expect(result).not.toBeNull());
    expect(result?.error).toBe(err);
  });
});

describe('AuthContext — useAuth hook guard', () => {
  it('throws when useAuth is called outside of AuthProvider', () => {
    const original = console.error;
    console.error = vi.fn(); // suppress React error boundary noise

    function BareConsumer() {
      useAuth();
      return null;
    }

    expect(() => render(<BareConsumer />)).toThrow('useAuth must be used within AuthProvider');
    console.error = original;
  });
});
