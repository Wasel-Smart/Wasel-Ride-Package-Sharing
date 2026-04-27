import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockUseLanguage = vi.fn();
const mockUseLocalAuth = vi.fn();
const mockUseNotifications = vi.fn();

vi.mock('motion/react', () => ({
  motion: {
    button: ({
      children,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    div: ({
      children,
      animate: _animate,
      layoutId: _layoutId,
      transition: _transition,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('react-router', () => ({
  useLocation: () => mockUseLocation(),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

vi.mock('@/contexts/LocalAuth', () => ({
  useLocalAuth: () => mockUseLocalAuth(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

import WaselMobileBottomNav from '@/components/mobile/WaselMobileBottomNav';

describe('WaselMobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/app/find-ride' });
    mockUseLanguage.mockReturnValue({ language: 'en' });
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseNotifications.mockReturnValue({ unreadCount: 0 });
  });

  it('routes the package tab to the packages surface', () => {
    render(<WaselMobileBottomNav />);

    screen.getByRole('button', { name: 'Package', hidden: true }).click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/packages');
  });
});
