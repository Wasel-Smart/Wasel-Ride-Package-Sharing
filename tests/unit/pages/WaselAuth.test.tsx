import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();
const mockSignIn = vi.fn();
const mockResetPassword = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSignInWithFacebook = vi.fn();
const mockToastSuccess = vi.fn();
const mockOpen = vi.fn();
const mockSetSearchParams = vi.fn();
let mockSearch = '?tab=signup&returnTo=%2Fapp%2Ffind-ride';
let mockSupportWhatsAppNumber = '962790000000';
let mockWhatsAppUrl = 'https://wa.me/962790000000?text=Hi%20Wasel';
let mockAuthProviders = {
  google: { enabled: true },
  facebook: { enabled: true },
  whatsapp: { enabled: true },
};

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
  motion: {
    div: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    form: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) => <form {...props}>{children}</form>,
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(mockSearch), mockSetSearchParams],
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock('@/hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => mockNavigate,
}));

vi.mock('@/contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    signIn: mockSignIn,
    register: mockRegister,
    loading: false,
    user: null,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithFacebook: mockSignInWithFacebook,
  }),
}));

vi.mock('@/hooks/useAuthProviderAvailability', () => ({
  useAuthProviderAvailability: () => mockAuthProviders,
}));

vi.mock('@/utils/env', async () => {
  const actual = await vi.importActual<typeof import('@/utils/env')>('@/utils/env');
  return {
    ...actual,
    getConfig: () => ({
      supportWhatsAppNumber: mockSupportWhatsAppNumber,
    }),
    getWhatsAppSupportUrl: () => mockWhatsAppUrl,
  };
});

vi.mock('@/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: () => <div>Wasel</div>,
  WaselHeroMark: () => <div>HeroMark</div>,
}));

vi.mock('@/components/wasel-ui/WaselCard', () => ({
  WaselCard: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/wasel-ui/WaselButton', () => ({
  WaselButton: ({
    children,
    type,
    onClick,
    disabled,
    fullWidth: _fullWidth,
    loading: _loading,
    iconEnd: _iconEnd,
    ...props
  }: PropsWithChildren<
    {
      type?: 'button' | 'submit' | 'reset';
      onClick?: () => void;
      disabled?: boolean;
    } & Record<string, unknown>
  >) => (
    <button type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/wasel-ui/WaselInput', () => ({
  WaselInput: ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
  }: {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  ),
}));

import WaselAuth from '@/pages/WaselAuth';

function renderWaselAuth() {
  return render(
    <LanguageProvider>
      <WaselAuth />
    </LanguageProvider>,
  );
}

describe('WaselAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = '?tab=signup&returnTo=%2Fapp%2Ffind-ride';
    mockSupportWhatsAppNumber = '962790000000';
    mockWhatsAppUrl = 'https://wa.me/962790000000?text=Hi%20Wasel';
    mockAuthProviders = {
      google: { enabled: true },
      facebook: { enabled: true },
      whatsapp: { enabled: true },
    };
    mockRegister.mockResolvedValue({ error: null, requiresEmailConfirmation: false });
    mockSignIn.mockResolvedValue({ error: null });
    mockResetPassword.mockResolvedValue({ error: null });
    mockSignInWithGoogle.mockResolvedValue({ error: null });
    mockSignInWithFacebook.mockResolvedValue({ error: null });
    mockToastSuccess.mockReset();
    mockSetSearchParams.mockReset();
    mockOpen.mockReset();
    vi.stubGlobal('open', mockOpen);
  });

  it('blocks signup when the password is weak', async () => {
    renderWaselAuth();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Laith Nassar' } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'laith@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/phone number/i, { selector: 'input' }), { target: { value: '+962792084333' } });
    fireEvent.click(screen.getByRole('button', { name: /submit create account/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Choose a stronger password/i).length).toBeGreaterThan(0);
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('allows signup without a phone number', async () => {
    renderWaselAuth();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Laith Nassar' } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'laith@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /submit create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'Laith Nassar',
        'laith@example.com',
        'StrongPass1!',
        undefined,
      );
    });
  });

  it('submits signup with the full backend payload once inputs are valid', async () => {
    renderWaselAuth();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Laith Nassar' } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'laith@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText(/phone number/i, { selector: 'input' }), { target: { value: '+962792084333' } });
    fireEvent.click(screen.getByRole('button', { name: /submit create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'Laith Nassar',
        'laith@example.com',
        'StrongPass1!',
        '+962792084333',
      );
    });
  });

  it('passes the return target into Google and Facebook auth', async () => {
    renderWaselAuth();

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledWith('/app/find-ride');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Facebook' }));

    await waitFor(() => {
      expect(mockSignInWithFacebook).toHaveBeenCalledWith('/app/find-ride');
    });
  });

  it('opens WhatsApp support when configured', async () => {
    renderWaselAuth();

    fireEvent.click(screen.getByRole('button', { name: /open whatsapp support/i }));

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith(
        'https://wa.me/962790000000?text=Hi%20Wasel',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });
});
