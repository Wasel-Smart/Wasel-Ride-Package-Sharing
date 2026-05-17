import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

import ProtectedOutlet from '@/router/ProtectedOutlet';

function renderProtectedRoute(
  initialEntry = '/app/profile?tab=security#alerts',
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedOutlet />}>
          <Route
            path="/app/profile"
            element={<div>Protected content</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedOutlet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while auth is being hydrated', () => {
    mockUseLocalAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    renderProtectedRoute();

    expect(
      screen.getByText('Restoring your Wasel session...'),
    ).toBeInTheDocument();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the sign-in preview page for unauthenticated users', () => {
    mockUseLocalAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    renderProtectedRoute();

    // ProtectedPagePreview renders a Sign in button for guests
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    // The outlet child should not be rendered
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the child route for authenticated users', () => {
    mockUseLocalAuth.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    });

    renderProtectedRoute();

    expect(
      screen.getByText('Protected content'),
    ).toBeInTheDocument();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
