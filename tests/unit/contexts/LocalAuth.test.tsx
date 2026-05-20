import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { LocalAuthProvider, useLocalAuth } from '@/contexts/LocalAuth';

function Consumer() {
  const { user, loading, register, signIn, updateUser } = useLocalAuth();

  return (
    <div>
      <div>{loading ? 'loading' : 'ready'}</div>
      <div>{user?.name ?? 'no-user'}</div>
      <div>{user?.phone ?? 'no-phone'}</div>
      <div>{user?.verificationLevel ?? 'no-level'}</div>
      <button
        type="button"
        onClick={() => {
          void register('Sara Ali', 'sara@example.com', 'password123', '+962790000000');
        }}
      >
        register
      </button>
      <button
        type="button"
        onClick={() => {
          void signIn('sara@example.com', 'password123');
        }}
      >
        signin
      </button>
      <button
        type="button"
        onClick={() => {
          updateUser({ phone: '+962790000001', phoneVerified: false });
        }}
      >
        update
      </button>
    </div>
  );
}

describe('LocalAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps the canonical auth context into the Wasel user shape', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'sara@example.com',
        phone: '+962790000000',
        created_at: '2026-05-01T08:00:00.000Z',
        email_confirmed_at: '2026-05-01T08:05:00.000Z',
        phone_confirmed_at: null,
        user_metadata: { full_name: 'Sara Ali' },
      },
      profile: {
        full_name: 'Sara Ali',
        phone_number: '+962790000000',
        role: 'driver',
        wallet_balance: 12,
        rating: 4.9,
        trip_count: 18,
        sanad_verified: true,
        verification_level: 'level_3',
        wallet_status: 'active',
        two_factor_enabled: true,
      },
      loading: false,
      isBackendConnected: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <LocalAuthProvider>
        <Consumer />
      </LocalAuthProvider>,
    );

    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument();
    expect(screen.getByText('+962790000000')).toBeInTheDocument();
    expect(screen.getByText('level_3')).toBeInTheDocument();
  });

  it('delegates registration to AuthContext and preserves optimistic updates', async () => {
    const signUp = vi.fn().mockResolvedValue({
      error: null,
      requiresEmailConfirmation: true,
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'sara@example.com',
        phone: '+962790000000',
        created_at: '2026-05-01T08:00:00.000Z',
        email_confirmed_at: '2026-05-01T08:05:00.000Z',
        phone_confirmed_at: null,
        user_metadata: { full_name: 'Sara Ali' },
      },
      profile: {
        full_name: 'Sara Ali',
        phone_number: '+962790000000',
        role: 'rider',
        wallet_balance: 12,
        rating: 4.9,
        trip_count: 18,
        verification_level: 'level_1',
        wallet_status: 'active',
      },
      loading: false,
      isBackendConnected: true,
      signIn: vi.fn(),
      signUp,
      signOut: vi.fn(),
    });

    render(
      <LocalAuthProvider>
        <Consumer />
      </LocalAuthProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'register' }).click();
    });

    expect(signUp).toHaveBeenCalledWith(
      'sara@example.com',
      'password123',
      'Sara Ali',
      '+962790000000',
      undefined,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'update' }).click();
    });

    expect(screen.getByText('+962790000001')).toBeInTheDocument();
  });

  it('does not restore a browser-local session when the backend is unavailable', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      isBackendConnected: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <LocalAuthProvider>
        <Consumer />
      </LocalAuthProvider>,
    );

    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(screen.getByText('no-phone')).toBeInTheDocument();
  });

  it('falls back to level_2 for Sanad-verified riders without driver clearance', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'sara@example.com',
        phone: '+962790000000',
        created_at: '2026-05-01T08:00:00.000Z',
        email_confirmed_at: '2026-05-01T08:05:00.000Z',
        phone_confirmed_at: '2026-05-01T08:10:00.000Z',
        user_metadata: { full_name: 'Sara Ali' },
      },
      profile: {
        full_name: 'Sara Ali',
        phone_number: '+962790000000',
        role: 'rider',
        wallet_balance: 12,
        rating: 4.9,
        trip_count: 18,
        sanad_verified: true,
        wallet_status: 'active',
      },
      loading: false,
      isBackendConnected: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <LocalAuthProvider>
        <Consumer />
      </LocalAuthProvider>,
    );

    expect(screen.getByText('level_2')).toBeInTheDocument();
  });

  it('delegates registration to the canonical auth flow even when legacy e2e flags are present', async () => {
    vi.stubEnv('VITE_E2E_LOCAL_AUTH', 'true');

    const signUp = vi.fn().mockResolvedValue({
      error: null,
      requiresEmailConfirmation: false,
    });
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      isBackendConnected: true,
      signIn: vi.fn(),
      signUp,
      signOut: vi.fn(),
    });

    render(
      <LocalAuthProvider>
        <Consumer />
      </LocalAuthProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'register' }).click();
    });

    expect(signUp).toHaveBeenCalledWith(
      'sara@example.com',
      'password123',
      'Sara Ali',
      '+962790000000',
      undefined,
    );
  });

  it('delegates sign-in to the canonical auth flow even when legacy e2e flags are present', async () => {
    vi.stubEnv('VITE_E2E_LOCAL_AUTH', 'true');

    const signIn = vi.fn().mockResolvedValue({ error: null });
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      isBackendConnected: true,
      signIn,
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <LocalAuthProvider>
        <Consumer />
      </LocalAuthProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'signin' }).click();
    });

    expect(signIn).toHaveBeenCalledWith('sara@example.com', 'password123');
  });
});
