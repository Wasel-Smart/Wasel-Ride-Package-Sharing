import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockUseLanguage = vi.fn();
const mockUseLocalAuth = vi.fn();

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
      layoutId: _layoutId,
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

import { MobileBottomNav } from '@/components/MobileBottomNav';

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/find-ride' });
    mockUseLanguage.mockReturnValue({ language: 'en' });
    mockUseLocalAuth.mockReturnValue({ user: null });
  });

  it('falls back to the language context when no prop is passed', () => {
    mockUseLanguage.mockReturnValue({ language: 'ar' });

    render(<MobileBottomNav />);

    expect(screen.getByRole('button', { name: 'ابحث', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Find', hidden: true })).not.toBeInTheDocument();
  });

  it('keeps auth-only tabs hidden for guests', () => {
    render(<MobileBottomNav />);

    expect(screen.queryByRole('button', { name: 'Trips', hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wallet', hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Profile', hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Packages', hidden: true })).toBeInTheDocument();
  });

  it('shows the full nav set for signed-in users and navigates on tap', () => {
    mockUseLocalAuth.mockReturnValue({ user: { id: 'user-1' } });

    render(<MobileBottomNav />);

    screen.getByRole('button', { name: 'Trips', hidden: true }).click();

    expect(screen.getByRole('button', { name: 'Wallet', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profile', hidden: true })).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/app/my-trips');
  });
});
