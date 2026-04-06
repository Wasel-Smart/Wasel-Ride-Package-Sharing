import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocalAuth = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <section {...props}>{children}</section>,
  },
}));

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LocalAuth', () => ({
  useLocalAuth: () => mockUseLocalAuth(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

vi.mock('@/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: () => <div>Wasel</div>,
  WaselIcon: () => <div>Icon</div>,
}));

vi.mock('@/components/system/WaselPresence', () => ({
  WaselBusinessFooter: () => <div>Footer</div>,
  WaselContactActionRow: () => <div>Contact</div>,
  WaselProofOfLifeBlock: () => <div>Proof</div>,
  WaselWhyCard: () => <div>Why</div>,
}));

vi.mock('@/domains/trust/waselPresence', () => ({
  getWaselPresenceProfile: () => ({
    supportPhoneDisplay: '+962 00 000 0000',
    supportEmail: 'hello@example.com',
    businessAddress: 'Amman',
    businessAddressAr: 'Amman',
  }),
}));

vi.mock('@/features/home/MobilityOSLandingMap', () => ({
  MobilityOSLandingMap: () => <div>Map</div>,
}));

import AppEntryPage from '@/features/home/AppEntryPage';

describe('AppEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
      signInWithFacebook: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it('shows guest CTA copy by default', { timeout: 15000 }, () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    render(<AppEntryPage />);

    expect(screen.getByText(/Understand the route/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Continue with email/i }).length).toBeGreaterThan(0);
  });

  it('routes guest email entry to the auth page with a return target', () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    render(<AppEntryPage />);

    screen.getAllByRole('button', { name: /Continue with email/i })[0].click();

    expect(mockNavigate).toHaveBeenCalledWith(
      '/app/auth?tab=signin&returnTo=%2Fapp%2Ffind-ride',
    );
  });

  it('navigates authenticated users straight into the app', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });

    render(<AppEntryPage />);

    screen.getAllByRole('button', { name: /Open app/i })[0].click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/find-ride');
  });
});
