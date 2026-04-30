import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadProfile = vi.fn().mockResolvedValue(null);

vi.mock('../../../src/utils/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

let mockLocalAuthState = {
  user: null as null | { id: string; name: string; email: string },
  authUser: null as null | { id: string; email: string },
  session: null as null | { access_token: string },
  loading: false,
};

vi.mock('../../../src/contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    ...mockLocalAuthState,
    signIn: vi.fn(),
    register: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    refreshAuthState: vi.fn(),
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
    mockLoadProfile.mockResolvedValue(null);
    mockLocalAuthState = {
      user: null,
      authUser: null,
      session: null,
      loading: false,
    };
  });

  it('reloads the profile when the authenticated user changes', async () => {
    mockLoadProfile
      .mockResolvedValueOnce({ id: 'user-1', full_name: 'User One' })
      .mockResolvedValueOnce({ id: 'user-2', full_name: 'User Two' });

    let capturedCtx: ReturnType<typeof useAuth> | null = null;

    const { rerender } = render(
      <AuthProvider>
        <CaptureState onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));

    mockLocalAuthState = {
      user: { id: 'user-1', name: 'User One', email: 'one@example.com' },
      authUser: { id: 'user-1', email: 'one@example.com' },
      session: { access_token: 'token-1' },
      loading: false,
    };

    rerender(
      <AuthProvider>
        <CaptureState onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(capturedCtx?.profile?.id).toBe('user-1'));

    mockLocalAuthState = {
      user: { id: 'user-2', name: 'User Two', email: 'two@example.com' },
      authUser: { id: 'user-2', email: 'two@example.com' },
      session: { access_token: 'token-2' },
      loading: false,
    };

    rerender(
      <AuthProvider>
        <CaptureState onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(capturedCtx?.user?.id).toBe('user-2'));
    await waitFor(() => expect(capturedCtx?.profile?.id).toBe('user-2'));
  });
});
