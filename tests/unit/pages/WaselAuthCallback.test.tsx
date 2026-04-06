import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockGetSession = vi.fn();
const mockInitialize = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      initialize: (...args: unknown[]) => mockInitialize(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

import WaselAuthCallback from '@/pages/WaselAuthCallback';

describe('WaselAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockInitialize.mockResolvedValue({ error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
  });

  it('redirects into the app when opened in the same tab', async () => {
    window.localStorage.setItem('wasel_auth_return_to', '/app/my-trips');

    render(<WaselAuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/my-trips', { replace: true });
    });

    expect(screen.getByText(/Finalizing authentication/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('wasel_auth_return_to')).toBeNull();
  });

  it('shows an error when auth completion fails', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('OAuth failed'),
    });

    render(<WaselAuthCallback />);

    await waitFor(() => {
      expect(screen.getByText(/Sign-in could not finish/i)).toBeInTheDocument();
    });
  });
});
