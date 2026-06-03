import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSignUp = vi.fn();
const mockGetProfile = vi.fn();
const mockCreateProfile = vi.fn();
const mockEndSession = vi.fn();
const mockStartSession = vi.fn();

vi.mock('@/services/auth', () => ({
  authAPI: {
    signUp: (...args: unknown[]) => mockSignUp(...args),
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    createProfile: (...args: unknown[]) => mockCreateProfile(...args),
  },
}));

vi.mock('@/utils/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/utils/sessionManager', () => ({
  sessionManager: {
    startSession: (...args: unknown[]) => mockStartSession(...args),
    endSession: (...args: unknown[]) => mockEndSession(...args),
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function SignUpProbe() {
  const { signUp, user } = useAuth();

  return (
    <div>
      <div data-testid="signed-in">{user ? 'yes' : 'no'}</div>
      <button
        type="button"
        onClick={async () => {
          const result = await signUp(
            'sara@example.com',
            'Password1!',
            'Sara Ali',
            '+962790000000',
            '/app',
          );
          document.body.dataset.requiresConfirmation = String(
            result.requiresEmailConfirmation ?? false,
          );
        }}
      >
        sign up
      </button>
    </div>
  );
}

describe('AuthProvider signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete document.body.dataset.requiresConfirmation;
    mockGetProfile.mockResolvedValue({ profile: null });
    mockCreateProfile.mockResolvedValue({ profile: null });
  });

  it('requires email confirmation when Supabase returns a user without a session', async () => {
    mockSignUp.mockResolvedValue({
      user: {
        id: 'auth-user-1',
        email: 'sara@example.com',
        user_metadata: { full_name: 'Sara Ali' },
      },
      session: null,
    });

    render(
      <AuthProvider>
        <SignUpProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign up' }));

    await waitFor(() => {
      expect(document.body.dataset.requiresConfirmation).toBe('true');
    });

    expect(screen.getByTestId('signed-in')).toHaveTextContent('no');
  });
});
