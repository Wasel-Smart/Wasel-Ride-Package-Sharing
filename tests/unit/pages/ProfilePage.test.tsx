import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseLocalAuth = vi.fn();
const mockUseProfilePageController = vi.fn();

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

vi.mock('@/contexts/LocalAuth', () => ({
  useLocalAuth: () => mockUseLocalAuth(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: true,
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  }),
}));

vi.mock('@/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>Wasel</div>,
}));

vi.mock('@/features/profile/useProfilePageController', () => ({
  useProfilePageController: () => mockUseProfilePageController(),
  PROFILE_BG: '#040C18',
  PROFILE_BORDER: 'rgba(255,255,255,0.09)',
  PROFILE_CYAN: '#00C8E8',
  PROFILE_FONT: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
}));

import ProfilePage from '@/features/profile/ProfilePage';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProfilePageController.mockReturnValue({
      editingField: null,
      handleDeletionContinue: vi.fn(),
      handleExportData: vi.fn(),
      handleNotificationSetup: vi.fn(),
      handlePhotoSelection: vi.fn(),
      handleSaveName: vi.fn(),
      handleSavePhone: vi.fn(),
      handleSignOut: vi.fn(),
      joinedText: 'Apr 2026',
      nameInput: 'Laith',
      permissionStatus: { label: 'Not enabled', color: '#F59E0B' },
      phoneInput: '+962791234567',
      profileCompleteness: 83,
      quickActions: [
        {
          label: 'Wallet & Payments',
          detail: 'Track balance, payments, and wallet access.',
          icon: <span>Wallet</span>,
          color: '#F59E0B',
          onClick: vi.fn(),
        },
      ],
      roleLabel: 'Driver + Rider',
      savingField: null,
      setEditingField: vi.fn(),
      setNameInput: vi.fn(),
      setPhoneInput: vi.fn(),
      setShowDeleteConfirm: vi.fn(),
      showDeleteConfirm: false,
      trustTier: 'Strong trust',
      verificationItems: [
        { label: 'Email', status: 'Verified', color: '#22C55E' },
        { label: 'Phone', status: 'Verified', color: '#22C55E' },
      ],
      walletStatus: { label: 'Active', color: '#22C55E' },
    });
  });

  it('shows a sign-in gate when no profile is loaded', { timeout: 15000 }, () => {
    mockUseLocalAuth.mockReturnValue({ user: null, signOut: vi.fn() });

    render(<ProfilePage />);

    screen.getByRole('button', { name: /sign in/i }).click();

    expect(screen.getByText(/please sign in to view your profile/i)).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/app/auth?tab=signin&returnTo=%2Fapp%2Ffind-ride');
  });

  it('renders the production readiness summary for authenticated users', () => {
    mockUseLocalAuth.mockReturnValue({
      signOut: vi.fn(),
      user: {
        id: 'user-1',
        name: 'Laith Nassar',
        email: 'laith@example.com',
        phone: '+962791234567',
        phoneVerified: true,
        emailVerified: true,
        sanadVerified: true,
        verified: true,
        verificationLevel: 'level_3',
        trustScore: 88,
        trips: 14,
        rating: 4.9,
        balance: 12.5,
        role: 'both',
        walletStatus: 'active',
        joinedAt: '2026-04-01T00:00:00.000Z',
        avatar: '',
        twoFactorEnabled: false,
      },
    });

    render(<ProfilePage />);

    expect(screen.getByText(/^account readiness$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^profile completeness$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^wallet & payments$/i)).toBeInTheDocument();
    expect(screen.getByText(/^trust & verification$/i)).toBeInTheDocument();
  });
});
