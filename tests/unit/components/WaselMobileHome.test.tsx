import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type * as ReactRouter from 'react-router';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
let mockLanguage: 'en' | 'ar' = 'en';

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
  motion: {
    button: ({
      children,
      whileTap: _whileTap,
      whileHover: _whileHover,
      whileFocus: _whileFocus,
      whileInView: _whileInView,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  useMotionValue: vi.fn(),
  useTransform: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: mockLanguage }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof ReactRouter>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { WaselMobileHome } from '../../../src/components/mobile/WaselMobileHome';
import { getOnlineState } from '../../../src/components/mobile/mobileRuntime';

describe('WaselMobileHome', () => {
  const onlineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');

  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'en';
  });

  afterEach(() => {
    if (onlineDescriptor) {
      Object.defineProperty(window.navigator, 'onLine', onlineDescriptor);
    }
  });

  it('renders the mobile search CTA and nearby rides copy', () => {
    render(
      <MemoryRouter>
        <WaselMobileHome />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Where are you going\?/i })).toBeInTheDocument();
    expect(screen.getByText(/Rides available now/i)).toBeInTheDocument();
  });

  it('shows the offline banner when navigator reports offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(
      <MemoryRouter>
        <WaselMobileHome />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No internet connection/i)).toBeInTheDocument();
  });
});

describe('getOnlineState()', () => {
  it('returns true when navigator is unavailable', () => {
    const originalNavigator = globalThis.navigator;

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: undefined,
    });

    expect(getOnlineState()).toBe(true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });
});
