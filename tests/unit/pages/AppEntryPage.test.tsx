import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('motion/react', () => {
  const createMotionElement =
    (Component: 'div' | 'section' | 'button') =>
    ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => {
      const safeProps = { ...props };
      ['initial', 'animate', 'exit', 'whileHover', 'whileTap', 'transition'].forEach(key => {
        delete safeProps[key];
      });

      const Tag = Component;
      return <Tag {...safeProps}>{children}</Tag>;
    };

  return {
    AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
    motion: {
      div: createMotionElement('div'),
      section: createMotionElement('section'),
      button: createMotionElement('button'),
    },
  };
});

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/liveDataService', () => ({
  useLiveUserStats: () => ({ stats: null, loading: false }),
}));

vi.mock('@/services/growthEngine', () => ({
  getCorridorDemandLeaders: () => [],
}));

vi.mock('@/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: () => <div>Wasel</div>,
  WaselIcon: () => <div>Icon</div>,
}));

vi.mock('@/features/home/MobilityOSLandingMap', () => ({
  MobilityOSLandingMap: () => <div>Mobility OS map</div>,
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
    mockUseAuth.mockReturnValue({ user: null });

    renderWithProviders(<AppEntryPage />);

    expect(screen.getByText(/Reduce transport cost and automate public travel/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Wasel turns public commute demand into guided booking/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Book public travel/i }).length).toBeGreaterThan(0);
  });

  it('navigates authenticated users into the live rides flow', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'driver@example.com',
        user_metadata: { name: 'Driver One' },
      },
    });

    renderWithProviders(<AppEntryPage />);

    screen.getAllByRole('button', { name: /Book public travel/i })[0]!.click();

    expect(mockNavigate).toHaveBeenCalledWith('/find-ride');
  });
});
