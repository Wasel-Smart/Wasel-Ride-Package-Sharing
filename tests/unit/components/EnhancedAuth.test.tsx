import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicLinkAuth } from '@/components/auth/MagicLinkAuth';
import { BiometricAuth } from '@/components/auth/BiometricAuth';
import { TwoFactorSetup, TwoFactorPrompt } from '@/components/auth/TwoFactorAuth';
import { AccountRecoverySetup } from '@/components/auth/AccountRecovery';
import { ProgressivePasswordRequirements } from '@/components/auth/ProgressivePasswordRequirements';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock dependencies
vi.mock('@/utils/supabase/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/supabase/client')>();
  return {
    ...actual,
    supabase: {
      ...actual.supabase,
      auth: {
        ...actual.supabase?.auth,
        signInWithOtp: vi.fn(),
      },
    },
  };
});

vi.mock('@/utils/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/security')>();
  return {
    ...actual,
    enable2FA: vi.fn(),
    verify2FACode: vi.fn(),
    disable2FA: vi.fn(),
  };
});

vi.mock('@/contexts/LanguageContext', () => {
  const translations: Record<string, string> = {
    'auth.magicLink.title': 'Sign in with magic link',
    'auth.magicLink.description': 'Get a secure sign-in link by email.',
    'auth.magicLink.send': 'Send magic link',
    'auth.magicLink.sending': 'Sending magic link...',
    'auth.biometric.notAvailable': 'Not available on this device',
    'auth.biometric.notSupported': 'Biometric sign-in is not supported.',
    'auth.biometric.signIn': 'Sign in with biometrics',
    'auth.biometric.verifying': 'Verifying biometrics...',
    'auth.biometric.signInSuccess': 'Signed in with biometrics',
    'auth.twoFactor.title': 'Two-factor authentication',
    'auth.twoFactor.description': 'Protect against unauthorized access',
    'auth.twoFactor.enable': 'Enable 2FA',
    'auth.twoFactor.skip': 'Skip',
    'auth.twoFactor.scanQR': 'Scan QR code',
    'auth.twoFactor.scanInstructions': 'Scan this QR code with your authenticator app.',
    'auth.twoFactor.manualEntry': 'Manual entry code',
    'auth.twoFactor.continue': 'Continue',
    'auth.twoFactor.verifyTitle': 'Verify setup',
    'auth.twoFactor.verifyInstructions': 'Enter the 6-digit code from your authenticator app.',
    'auth.twoFactor.verify': 'Verify code',
    'auth.twoFactor.invalidCode': 'Enter a valid 6-digit code.',
    'auth.twoFactor.verificationFailed': 'Verification failed',
    'auth.twoFactor.secretCopied': 'Secret copied',
    'auth.twoFactor.backupTitle': 'Save backup codes',
    'auth.twoFactor.backupInstructions': 'Store these backup codes somewhere safe.',
    'auth.twoFactor.downloadCodes': 'Download codes',
    'auth.twoFactor.complete': 'Complete setup',
    'auth.twoFactor.backupCodesDownloaded': 'Backup codes downloaded',
    'auth.twoFactor.promptTitle': 'Verify your identity',
    'auth.twoFactor.promptDescription': 'Enter the current 2FA code to continue.',
    'auth.twoFactor.benefit1': 'Extra protection for your account',
    'auth.twoFactor.benefit2': 'Stops password-only sign-ins',
    'auth.twoFactor.benefit3': 'Keeps sensitive actions protected',
    'auth.recovery.title': 'Account recovery',
    'auth.recovery.description': 'Set up recovery questions for your account.',
    'auth.recovery.question1': 'Security question 1',
    'auth.recovery.question2': 'Security question 2',
    'auth.recovery.selectQuestion': 'Select a question',
    'auth.recovery.answerPlaceholder': 'Your answer',
    'auth.recovery.backupEmail': 'Backup email',
    'auth.recovery.backupEmailPlaceholder': 'backup@example.com',
    'auth.recovery.fillAllFields': 'Fill all recovery fields.',
    'auth.recovery.setupComplete': 'Recovery options saved.',
    'auth.recovery.setupFailed': 'Recovery setup failed.',
    'auth.recovery.save': 'Save recovery options',
    'auth.recovery.skip': 'Skip',
    'auth.recovery.verifyTitle': 'Verify recovery answers',
    'auth.recovery.verifyDescription': 'Answer your saved recovery questions.',
    'auth.recovery.noRecoveryData': 'No recovery data found.',
    'auth.recovery.incorrectAnswers': 'Answers did not match.',
    'auth.recovery.verificationFailed': 'Recovery verification failed.',
    'auth.recovery.verified': 'Recovery answers verified.',
    'auth.recovery.questions.pet': 'What was your first pet?',
    'auth.recovery.questions.city': 'What city were you born in?',
    'auth.recovery.questions.school': 'What was your first school?',
    'auth.recovery.questions.book': 'What was your favorite childhood book?',
    'auth.recovery.questions.teacher': 'Who was your favorite teacher?',
    'authPage.fields.email.placeholder': 'Enter your email',
    'authPage.errors.invalidEmail': 'Invalid email',
    'authPage.password.strengthTitle': 'Password strength',
    'authPage.password.strength.weak': 'Weak',
    'authPage.password.strength.fair': 'Fair',
    'authPage.password.strength.good': 'Good',
    'authPage.password.strength.strong': 'Strong',
    'authPage.password.requirements.length': 'At least 8 characters',
    'authPage.password.requirements.uppercase': 'One uppercase letter',
    'authPage.password.requirements.lowercase': 'One lowercase letter',
    'authPage.password.requirements.number': 'One number',
    'authPage.password.requirements.special': 'One special character',
    'authPage.password.requirements.length12': 'At least 12 characters',
    'authPage.password.requirements.noCommon': 'Avoid common patterns',
    'authPage.password.requirements.noRepeat': 'Avoid repeating characters',
    'common.loading': 'Loading...',
    'common.optional': 'Optional',
    'common.verifying': 'Verifying...',
    'common.cancel': 'Cancel',
    'common.saving': 'Saving...',
  };

  return {
    LanguageProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useLanguage: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      toggleLanguage: vi.fn(),
      dir: 'ltr',
      locale: 'en-JO',
      region: 'JO',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      formatNumber: (value: number) => String(value),
      formatDate: (value: Date | number | string) => String(value),
      formatTime: (value: Date | number | string) => String(value),
      t: (key: string) => translations[key] ?? key,
    }),
  };
});

function renderWithLanguage(ui: ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('Enhanced Authentication Components', () => {
  describe('MagicLinkAuth', () => {
    it('renders magic link form', () => {
      renderWithLanguage(<MagicLinkAuth onSuccess={vi.fn()} />);
      expect(screen.getByText(/sign in with magic link/i)).toBeInTheDocument();
    });

    it('validates email before sending', async () => {
      const onSuccess = vi.fn();
      renderWithLanguage(<MagicLinkAuth onSuccess={onSuccess} />);
      
      const input = screen.getByPlaceholderText(/enter your email/i);
      const button = screen.getByRole('button', { name: /send magic link/i });
      
      fireEvent.change(input, { target: { value: 'invalid-email' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('sends magic link with valid email', async () => {
      const onSuccess = vi.fn();
      const { supabase } = await import('@/utils/supabase/client');
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ error: null } as any);
      
      renderWithLanguage(<MagicLinkAuth onSuccess={onSuccess} />);
      
      const input = screen.getByPlaceholderText(/enter your email/i);
      const button = screen.getByRole('button', { name: /send magic link/i });
      
      fireEvent.change(input, { target: { value: 'user@example.com' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('user@example.com');
      });
    });
  });

  describe('BiometricAuth', () => {
    beforeEach(() => {
      // Mock WebAuthn API
      global.navigator.credentials = {
        create: vi.fn(),
        get: vi.fn(),
      } as any;
      global.PublicKeyCredential = class {} as any;
    });

    it('shows unsupported message when WebAuthn not available', () => {
      delete (global as any).PublicKeyCredential;
      
      renderWithLanguage(
        <BiometricAuth 
          userId="user123" 
          onSuccess={vi.fn()} 
          onError={vi.fn()} 
        />
      );
      
      expect(screen.getByText(/not available on this device/i)).toBeInTheDocument();
    });

    it('initiates biometric authentication', async () => {
      const onSuccess = vi.fn();
      vi.mocked(navigator.credentials.get).mockResolvedValue({} as any);
      
      renderWithLanguage(
        <BiometricAuth 
          userId="user123" 
          onSuccess={onSuccess} 
          onError={vi.fn()} 
        />
      );
      
      const button = screen.getByRole('button', { name: /sign in with biometrics/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(navigator.credentials.get).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('TwoFactorSetup', () => {
    it('renders intro screen', () => {
      renderWithLanguage(<TwoFactorSetup userId="user123" onComplete={vi.fn()} />);
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/protect against unauthorized access/i)).toBeInTheDocument();
    });

    it('progresses through setup steps', async () => {
      const { enable2FA } = await import('@/utils/security');
      vi.mocked(enable2FA).mockResolvedValue({
        secret: 'SECRET123',
        otpauthUrl: 'otpauth://totp/Wasel',
        backupCodes: ['CODE1', 'CODE2'],
      });
      
      renderWithLanguage(<TwoFactorSetup userId="user123" onComplete={vi.fn()} />);
      
      // Start setup
      const enableButton = screen.getByRole('button', { name: /enable 2fa/i });
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
      });
    });

    it('verifies 2FA code', async () => {
      const { verify2FACode } = await import('@/utils/security');
      vi.mocked(verify2FACode).mockResolvedValue(true);
      
      renderWithLanguage(<TwoFactorPrompt userId="user123" onVerified={vi.fn()} onCancel={vi.fn()} />);
      
      const input = screen.getByPlaceholderText('000000');
      fireEvent.change(input, { target: { value: '123456' } });
      
      const verifyButton = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(verify2FACode).toHaveBeenCalledWith('user123', '123456');
      });
    });
  });

  describe('AccountRecoverySetup', () => {
    it('renders security question form', () => {
      renderWithLanguage(<AccountRecoverySetup userId="user123" onComplete={vi.fn()} />);
      expect(screen.getByText(/account recovery/i)).toBeInTheDocument();
      expect(screen.getByText(/security question 1/i)).toBeInTheDocument();
    });

    it('requires both questions to be answered', async () => {
      renderWithLanguage(<AccountRecoverySetup userId="user123" onComplete={vi.fn()} />);
      
      const saveButton = screen.getByRole('button', { name: /save recovery options/i });
      expect(saveButton).toBeDisabled();
      
      // Select first question
      const select1 = screen.getAllByRole('combobox')[0];
      fireEvent.change(select1, { target: { value: 'pet' } });
      
      // Still disabled until answer provided
      expect(saveButton).toBeDisabled();
    });

    it('saves recovery options', async () => {
      const onComplete = vi.fn();
      renderWithLanguage(<AccountRecoverySetup userId="user123" onComplete={onComplete} />);
      
      // Fill in questions and answers
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'pet' } });
      
      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText(/your answer/i);
        fireEvent.change(inputs[0], { target: { value: 'Fluffy' } });
      });
      
      fireEvent.change(selects[1], { target: { value: 'city' } });
      
      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText(/your answer/i);
        fireEvent.change(inputs[1], { target: { value: 'Amman' } });
      });
      
      const saveButton = screen.getByRole('button', { name: /save recovery options/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('ProgressivePasswordRequirements', () => {
    it('shows all requirements', () => {
      renderWithLanguage(<ProgressivePasswordRequirements password="" isFocused={true} />);
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
    });

    it('marks requirements as met', () => {
      const { rerender } = renderWithLanguage(
        <ProgressivePasswordRequirements password="" isFocused={true} />
      );
      
      // Weak password
      rerender(<ProgressivePasswordRequirements password="abc" isFocused={true} />);
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
      
      // Strong password
      rerender(
        <ProgressivePasswordRequirements password="MyP@ssw0rd123" isFocused={true} />
      );
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });

    it('updates progress bar', () => {
      const { container, rerender } = renderWithLanguage(
        <ProgressivePasswordRequirements password="Test123!" isFocused={true} />
      );
      
      const progressBar = container.querySelector('.progressive-password-requirements__progress-bar');
      expect(progressBar).toBeInTheDocument();
      
      // Should show progress
      rerender(
        <ProgressivePasswordRequirements password="Test123!@#" isFocused={true} />
      );
      
      // Progress should increase
      expect(progressBar).not.toBeNull();
      expect((progressBar as HTMLElement).style.width).toMatch(/^\d+%$/);
    });

    it('detects common passwords', () => {
      renderWithLanguage(
        <ProgressivePasswordRequirements password="password123" isFocused={true} />
      );
      expect(screen.getByText(/avoid common patterns/i)).toBeInTheDocument();
    });

    it('detects repeated characters', () => {
      renderWithLanguage(
        <ProgressivePasswordRequirements password="Passsss111!" isFocused={true} />
      );
      expect(screen.getByText(/avoid repeating characters/i)).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('completes full 2FA setup flow', async () => {
      const { enable2FA, verify2FACode } = await import('@/utils/security');
      
      vi.mocked(enable2FA).mockResolvedValue({
        secret: 'SECRET123',
        otpauthUrl: 'otpauth://totp/Wasel',
        backupCodes: ['CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5', 'CODE6', 'CODE7', 'CODE8'],
      });
      
      vi.mocked(verify2FACode).mockResolvedValue(true);
      
      const onComplete = vi.fn();
      renderWithLanguage(<TwoFactorSetup userId="user123" onComplete={onComplete} />);
      
      // Step 1: Enable
      fireEvent.click(screen.getByRole('button', { name: /enable 2fa/i }));
      
      // Step 2: View QR
      await waitFor(() => {
        expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      // Step 3: Verify
      await waitFor(() => {
        expect(screen.getByText(/verify setup/i)).toBeInTheDocument();
      });
      
      const codeInput = screen.getByPlaceholderText('000000');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
      
      // Step 4: Backup codes
      await waitFor(() => {
        expect(screen.getByText(/save backup codes/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });
});
