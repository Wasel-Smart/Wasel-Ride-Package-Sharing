import { act, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockGetProfile = vi.fn();
const mockSignIn = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/services/auth', () => ({
  authAPI: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('@/utils/supabase/client', () => ({
  initSupabaseListeners: vi.fn(() => () => undefined),
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

vi.mock('@/utils/env', () => ({
  getConfig: () => ({
    enableLocalAuth: false,
  }),
}));

import { LocalAuthProvider, useLocalAuth } from '@/contexts/LocalAuth';

function Probe() {
  const { user, loading } = useLocalAuth();

  return (
    <div data-testid="auth-state">
      {loading ? 'loading' : 'ready'}|{user?.email ?? 'guest'}
    </div>
  );
}

function Capture({
  onRender,
}: {
  onRender: (ctx: ReturnType<typeof useLocalAuth>) => void;
}) {
  const ctx = useLocalAuth();
  onRender(ctx);
  return <Probe />;
}

function seedStoredSupabaseUser() {
  window.localStorage.setItem(
    'wasel_local_user_v2',
    JSON.stringify({
      id: 'user-1',
      name: 'Laith',
      email: 'laith@example.com',
      role: 'rider',
      balance: 0,
      rating: 4.9,
      trips: 12,
      verified: true,
      sanadVerified: true,
      verificationLevel: 'level_3',
      walletStatus: 'active',
      joinedAt: '2026-04-01',
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      backendMode: 'supabase',
    }),
  );
}

describe('LocalAuthProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/app/auth');
    window.localStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetProfile.mockResolvedValue({ profile: null });
    mockSignIn.mockResolvedValue({ user: null, session: null });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('releases loading when auth bootstrap stalls but a cached user exists', async () => {
    seedStoredSupabaseUser();
    mockGetSession.mockReturnValue(new Promise(() => {}));

    render(
      <LocalAuthProvider>
        <Probe />
      </LocalAuthProvider>,
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('loading|laith@example.com');

    await act(async () => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('ready|laith@example.com');
  });

  it('releases loading when auth bootstrap stalls without a cached user', async () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));

    render(
      <LocalAuthProvider>
        <Probe />
      </LocalAuthProvider>,
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('loading|guest');

    await act(async () => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('ready|guest');
  });

  it('defers profile sync work until after the auth state callback returns', async () => {
    render(
      <LocalAuthProvider>
        <Probe />
      </LocalAuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('ready|guest');

    const authStateChangeHandler = mockOnAuthStateChange.mock.calls[0]?.[0] as
      | ((event: string, session: { user?: { id: string; email: string; created_at: string; user_metadata: Record<string, never> } } | null) => void)
      | undefined;

    expect(authStateChangeHandler).toBeTypeOf('function');

    act(() => {
      authStateChangeHandler?.('SIGNED_IN', {
        user: {
          id: 'user-1',
          email: 'laith@example.com',
          created_at: '2026-04-01T00:00:00.000Z',
          confirmed_at: '2026-04-01T00:00:00.000Z',
          user_metadata: {},
        },
      });
    });

    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId('auth-state')).toHaveTextContent('ready|laith@example.com');

    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it('finishes sign-in even when the profile lookup stalls', async () => {
    mockGetProfile.mockImplementation(() => new Promise(() => {}));
    const stalledUser = {
      id: 'user-2',
      email: 'stalled@example.com',
      created_at: '2026-04-01T00:00:00.000Z',
      confirmed_at: '2026-04-01T00:00:00.000Z',
      user_metadata: {},
    };
    mockSignIn.mockResolvedValue({
      user: stalledUser,
      session: {
        user: stalledUser,
      },
    });

    let capturedCtx: ReturnType<typeof useLocalAuth> | null = null;

    render(
      <LocalAuthProvider>
        <Capture onRender={(ctx) => { capturedCtx = ctx; }} />
      </LocalAuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('ready|guest');

    let result: { error: string | null } | null = null;

    await act(async () => {
      const signInPromise = capturedCtx!.signIn('stalled@example.com', 'secret');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(3100);
      await Promise.resolve();
      await Promise.resolve();
      result = await signInPromise;
    });

    expect(result).toEqual({ error: null });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('ready|stalled@example.com');
  });
});
