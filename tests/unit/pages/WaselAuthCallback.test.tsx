import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockCompleteAuthCallbackSession = vi.fn();
const mockSubscribeToPasswordRecovery = vi.fn();
const mockUpdateRecoveredPassword = vi.fn();

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/services/auth', () => ({
  completeAuthCallbackSession: (...args: unknown[]) => mockCompleteAuthCallbackSession(...args),
  subscribeToPasswordRecovery: (...args: unknown[]) => mockSubscribeToPasswordRecovery(...args),
  updateRecoveredPassword: (...args: unknown[]) => mockUpdateRecoveredPassword(...args),
}));

import WaselAuthCallback from '@/pages/WaselAuthCallback';

describe('WaselAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/app/auth/callback');
    mockCompleteAuthCallbackSession.mockResolvedValue(undefined);
    mockUpdateRecoveredPassword.mockResolvedValue(undefined);
    mockSubscribeToPasswordRecovery.mockReturnValue({ unsubscribe: vi.fn() });
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
    mockCompleteAuthCallbackSession.mockRejectedValueOnce(new Error('OAuth failed'));

    render(<WaselAuthCallback />);

    await waitFor(() => {
      expect(screen.getByText(/Sign-in could not finish/i)).toBeInTheDocument();
    });
  });
});
