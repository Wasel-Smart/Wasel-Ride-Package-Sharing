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
      initialize: (...args: unknown[]) => mockInitialize(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

import WaselAuthCallback from '@/pages/WaselAuthCallback';

describe('WaselAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/app/auth/callback');
    mockInitialize.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('redirects into the app when opened in the same tab', async () => {
    render(<WaselAuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/find-ride', { replace: true });
    });

    expect(screen.getByText(/Finalizing authentication/i)).toBeInTheDocument();
  });

  it('returns the user to the requested protected route after auth completes', async () => {
    window.history.replaceState({}, '', '/app/auth/callback?returnTo=%2Fapp%2Fwallet');

    render(<WaselAuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/wallet', { replace: true });
    });
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
