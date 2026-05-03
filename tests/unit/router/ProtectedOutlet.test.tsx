import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocalAuth = vi.fn();

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LocalAuth', () => ({
  useLocalAuth: () => mockUseLocalAuth(),
}));

import ProtectedOutlet from '@/router/ProtectedOutlet';

function renderProtectedRoute(initialEntry = '/app/profile?tab=security#alerts') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedOutlet />}>
          <Route path="/app/profile" element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedOutlet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for auth hydration before redirecting', () => {
    mockUseLocalAuth.mockReturnValue({ user: null, loading: true });

    renderProtectedRoute();

    expect(screen.getByText('Restoring your Wasel session...')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects guests to sign in with a safe return target', async () => {
    mockUseLocalAuth.mockReturnValue({ user: null, loading: false });

    renderProtectedRoute();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/app/auth?returnTo=%2Fapp%2Fprofile%3Ftab%3Dsecurity%23alerts',
      );
    });
  });

  it('renders the child route for authenticated users', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });

    renderProtectedRoute();

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
