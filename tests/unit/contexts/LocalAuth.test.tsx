import { act, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockGetProfile = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/services/auth', () => ({
  authAPI: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    signIn: vi.fn(),
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
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

vi.mock('@/utils/env', () => ({
  getConfig: () => ({
    enableDemoAccount: false,
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
    window.localStorage.clear();
    mockGetProfile.mockResolvedValue({ profile: null });
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
});
