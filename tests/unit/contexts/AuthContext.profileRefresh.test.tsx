import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});
const mockLoadProfile = vi.fn().mockResolvedValue(null);

vi.mock('../../../src/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../../src/contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    register: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

vi.mock('../../../src/services/auth', () => ({
  authAPI: {
    updateProfile: vi.fn(),
    resendSignupConfirmation: vi.fn(),
  },
}));

vi.mock('../../../src/contexts/authContextHelpers', () => ({
  buildUpdatedLocalUser: vi.fn((_user, updates) => updates),
  createLocalAuthProfile: vi.fn((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.name,
  })),
  createLocalAuthUser: vi.fn((user) => ({
    id: user.id,
    email: user.email,
  })),
  loadProfile: (...args: unknown[]) => mockLoadProfile(...args),
  normalizeOperationError: vi.fn((error: unknown, fallback: string) => (
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : fallback)
  )),
  shouldIgnoreProfileError: vi.fn(() => false),
  shouldRefreshProfile: vi.fn((event: string, session: { user?: unknown } | null) => (
    Boolean(session?.user) && event === 'SIGNED_IN'
  )),
  signInWithOAuthProvider: vi.fn().mockResolvedValue({ error: null }),
}));

import { AuthProvider, useAuth } from '../../../src/contexts/AuthContext';

function CaptureState({
  onRender,
}: {
  onRender: (ctx: ReturnType<typeof useAuth>) => void;
}) {
  const ctx = useAuth();
  onRender(ctx);
  return <div data-testid="auth-state">{ctx.loading ? 'loading' : 'ready'}</div>;
}

describe('AuthContext profile refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockLoadProfile.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reloads the profile when the authenticated user changes', async () => {
    mockLoadProfile
      .mockResolvedValueOnce({ id: 'user-1', full_name: 'User One' })
      .mockResolvedValueOnce({ id: 'user-2', full_name: 'User Two' });

    let capturedCtx: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <CaptureState onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));

    const authStateChangeHandler = mockOnAuthStateChange.mock.calls[0]?.[0] as
      | ((event: string, session: { user?: { id: string; email?: string } } | null) => Promise<void>)
      | undefined;

    expect(authStateChangeHandler).toBeTypeOf('function');

    await act(async () => {
      await authStateChangeHandler?.('SIGNED_IN', { user: { id: 'user-1', email: 'one@example.com' } });
    });

    await waitFor(() => expect(capturedCtx?.profile?.id).toBe('user-1'));

    await act(async () => {
      await authStateChangeHandler?.('SIGNED_IN', { user: { id: 'user-2', email: 'two@example.com' } });
    });

    await waitFor(() => expect(capturedCtx?.user?.id).toBe('user-2'));
    await waitFor(() => expect(capturedCtx?.profile?.id).toBe('user-2'));
  });
});
