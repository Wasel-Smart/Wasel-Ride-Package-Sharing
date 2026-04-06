import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocalAuth = vi.fn();
const mockUseAuth = vi.fn();
let mockLanguage = 'en';

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
  useLanguage: () => ({ language: mockLanguage }),
}));

vi.mock('@/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: () => <div>Wasel</div>,
  WaselIcon: () => <div>Icon</div>,
  WaselMark: () => <div>Mark</div>,
  WaselHeroMark: () => <div>HeroMark</div>,
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
    mockLanguage = 'en';
    mockUseAuth.mockReturnValue({
      signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
      signInWithFacebook: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it('shows guest CTA copy by default', { timeout: 30000 }, () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    render(<AppEntryPage />);

    expect(screen.getByRole('heading', { name: /calmer way to read movement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Create account/i }).length).toBeGreaterThan(0);
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

  it('routes guest header auth buttons to sign in and sign up', () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    render(<AppEntryPage />);

    screen.getByRole('button', { name: /Sign in/i }).click();
    screen.getAllByRole('button', { name: /Create account/i })[0].click();

    expect(mockNavigate).toHaveBeenNthCalledWith(
      1,
      '/app/auth?tab=signin&returnTo=%2Fapp%2Ffind-ride',
    );
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      '/app/auth?tab=signup&returnTo=%2Fapp%2Ffind-ride',
    );
  });

  it('navigates authenticated users straight into the app', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });

    render(<AppEntryPage />);

    screen.getAllByRole('button', { name: /Find a ride/i })[0].click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/find-ride');
  });

  it('renders Arabic landing copy when Arabic is active', () => {
    mockLanguage = 'ar';
    mockUseLocalAuth.mockReturnValue({ user: null });

    render(<AppEntryPage />);

    expect(screen.getByRole('heading', { name: /طريقة أهدأ لقراءة الحركة/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ابحث عن رحلة/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /افتح خريطة Mobility OS الحية/i })).toBeInTheDocument();
  });
});
