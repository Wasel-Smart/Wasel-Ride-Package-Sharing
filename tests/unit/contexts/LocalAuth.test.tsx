import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { LocalAuthProvider, useLocalAuth } from '@/contexts/LocalAuth';

function Consumer() {
  const { user, loading, register, updateUser } = useLocalAuth();

  return (
    <div>
      <div>{loading ? 'loading' : 'ready'}</div>
      <div>{user?.name ?? 'no-user'}</div>
      <div>{user?.phone ?? 'no-phone'}</div>
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
    );

    await act(async () => {
      screen.getByRole('button', { name: 'update' }).click();
    });

    expect(screen.getByText('+962790000001')).toBeInTheDocument();
  });
});
