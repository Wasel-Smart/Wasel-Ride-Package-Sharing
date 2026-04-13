import { act, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeContext';

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

function renderAppEntryPage() {
  return render(
    <ThemeProvider>
      <AppEntryPage />
    </ThemeProvider>,
  );
}

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

    renderAppEntryPage();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Create account/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Facebook/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Continue with email/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Open packages/i })).toBeInTheDocument();
  });

  it('routes guest email entry to the auth page with a return target', () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    renderAppEntryPage();

    screen.getAllByRole('button', { name: /Continue with email/i })[0].click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/auth?tab=signin&returnTo=%2Fapp%2Ffind-ride');
  });

  it('routes guest header auth buttons to sign in and sign up', () => {
    mockUseLocalAuth.mockReturnValue({ user: null });

    renderAppEntryPage();

    screen.getAllByRole('button', { name: /Sign in/i })[0].click();
    screen.getAllByRole('button', { name: /Create account/i })[0].click();

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/app/auth?tab=signin&returnTo=%2Fapp%2Ffind-ride');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/app/auth?tab=signup&returnTo=%2Fapp%2Ffind-ride');
  });

  it('starts Google auth from the landing gateway', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue({ error: null });
    mockUseAuth.mockReturnValue({
      signInWithGoogle,
      signInWithFacebook: vi.fn().mockResolvedValue({ error: null }),
    });
    mockUseLocalAuth.mockReturnValue({ user: null });

    renderAppEntryPage();

    await act(async () => {
      screen.getByRole('button', { name: /Continue with Google/i }).click();
    });

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalledWith('/app/find-ride');
    });
  });

  it('starts Facebook auth from the landing gateway', async () => {
    const signInWithFacebook = vi.fn().mockResolvedValue({ error: null });
    mockUseAuth.mockReturnValue({
      signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
      signInWithFacebook,
    });
    mockUseLocalAuth.mockReturnValue({ user: null });

    renderAppEntryPage();

    await act(async () => {
      screen.getByRole('button', { name: /Continue with Facebook/i }).click();
    });

    await waitFor(() => {
      expect(signInWithFacebook).toHaveBeenCalledWith('/app/find-ride');
    });
  });

  it('navigates authenticated users straight into the app', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });

    renderAppEntryPage();

    screen.getAllByRole('button', { name: /Find a ride/i })[0].click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/find-ride');
  });

  it('renders Arabic landing copy when Arabic is active', () => {
    mockLanguage = 'ar';
    mockUseLocalAuth.mockReturnValue({ user: null });

    renderAppEntryPage();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button')
        .some((button) => /[\u0600-\u06FF]/u.test(button.textContent ?? '')),
    ).toBe(true);
  });
});
