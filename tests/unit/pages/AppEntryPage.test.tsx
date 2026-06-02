import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';

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

function renderWithProviders(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('AppEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows guest CTA copy by default', () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    renderWithProviders(<AppEntryPage />);

    expect(screen.getByText('One corridor,')).toBeInTheDocument();
    expect(screen.getByText('every move.')).toBeInTheDocument();
    expect(
      screen.getByText(/Open the same route and decide from there: book a seat, offer one, send a parcel, or fall back to the bus without changing mental models\./i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Get started/i }).length).toBeGreaterThan(0);
  });

  it('navigates authenticated users into the live rides flow', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });

    renderWithProviders(<AppEntryPage />);

    screen.getAllByRole('button', { name: /Open live rides/i })[0]!.click();

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/find-ride\?/));
  });
});
