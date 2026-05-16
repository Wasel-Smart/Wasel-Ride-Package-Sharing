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
    window.localStorage.clear();
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

  it('keeps the stored local session when the backend is unavailable', () => {
    window.localStorage.setItem('wasel_user_session', JSON.stringify({
       id: 'demo-e2e-user',
       name: 'Demo Rider',
       email: 'demo.rider@wasel.jo',
       phone: '+962790000999',
       role: 'both',
       balance: 145.75,
       rating: 4.8,
       trips: 18,
       verified: true,
       sanadVerified: true,
       verificationLevel: 'level_3',
       walletStatus: 'active',
       joinedAt: '2026-03-01',
       emailVerified: true,
       phoneVerified: true,
       twoFactorEnabled: false,
       trustScore: 92,
       backendMode: 'supabase',
     }));

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
    expect(screen.getByText('Demo Rider')).toBeInTheDocument();
    expect(screen.getByText('+962790000999')).toBeInTheDocument();
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

  it('registers and persists a local account when e2e local auth is enabled', async () => {
    vi.stubEnv('VITE_E2E_LOCAL_AUTH', 'true');

    const signUp = vi.fn();
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

    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument();

     const storedSession = JSON.parse(window.localStorage.getItem('wasel_user_session') ?? 'null');
     const storedAccounts = JSON.parse(
       window.localStorage.getItem('wasel_accounts') ?? '[]',
     );

    expect(storedSession?.email).toBe('sara@example.com');
    expect(storedAccounts).toHaveLength(1);
    expect(storedAccounts[0].email).toBe('sara@example.com');
  });

  it('signs into a persisted local account when e2e local auth is enabled', async () => {
    vi.stubEnv('VITE_E2E_LOCAL_AUTH', 'true');

    window.localStorage.setItem(
       'wasel_accounts',
       JSON.stringify([
         {
           email: 'sara@example.com',
           password: 'password123',
           user: {
             id: 'local-user-1',
             name: 'Sara Ali',
             email: 'sara@example.com',
             phone: '+962790000000',
             role: 'rider',
             balance: 0,
             rating: 5,
             trips: 0,
             verified: false,
             sanadVerified: false,
             verificationLevel: 'level_0',
             walletStatus: 'active',
             joinedAt: '2026-05-07',
             emailVerified: true,
             phoneVerified: false,
             twoFactorEnabled: false,
             trustScore: 55,
             backendMode: 'supabase',
           },
         },
       ]),
     );

    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
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

    await act(async () => {
      screen.getByRole('button', { name: 'signin' }).click();
    });

    expect(screen.getByText('Sara Ali')).toBeInTheDocument();
    expect(screen.getByText('+962790000000')).toBeInTheDocument();
  });
});
