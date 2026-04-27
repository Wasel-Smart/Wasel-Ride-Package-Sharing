import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockUseLanguage = vi.fn();

vi.mock('react-router', () => ({
  useLocation: () => mockUseLocation(),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

import { MobileBottomNav } from '@/components/MobileBottomNav';

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/find-ride' });
    mockUseLanguage.mockReturnValue({ language: 'en' });
  });

  it('falls back to the language context when no prop is passed', () => {
    mockUseLanguage.mockReturnValue({ language: 'ar' });

    render(<MobileBottomNav />);

    expect(screen.getByRole('button', { name: 'رحلة' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ride' })).not.toBeInTheDocument();
  });

  it('shows only the focused marketplace tabs', () => {
    render(<MobileBottomNav />);

    expect(screen.getByRole('button', { name: 'Ride' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Package' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trips' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wallet' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();
  });

  it('navigates to the package surface on tap', () => {
    render(<MobileBottomNav />);

    screen.getByRole('button', { name: 'Package' }).click();

    expect(mockNavigate).toHaveBeenCalledWith('/app/packages');
  });
});
