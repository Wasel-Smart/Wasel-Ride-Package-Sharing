import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocalAuth = vi.fn();

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LocalAuth', () => ({
  useLocalAuth: () => mockUseLocalAuth(),
}));

vi.mock('@/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: () => <div>Wasel</div>,
  WaselIcon: () => <div>Icon</div>,
}));

import AppEntryPage from '@/features/home/AppEntryPage';

describe('AppEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows guest CTA copy by default', { timeout: 15000 }, () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    render(<AppEntryPage />);

    expect(screen.getByText(/Move smarter with Wasel/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Get started/i }).length).toBeGreaterThan(0);
  });

  it('navigates authenticated users straight into the app', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });

    render(<AppEntryPage />);

    screen.getAllByRole('button', { name: /Open app/i })[0].click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/find-ride');
  });
});
