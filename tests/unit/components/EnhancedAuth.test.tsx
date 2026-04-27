import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicLinkAuth } from '@/components/auth/MagicLinkAuth';
import { BiometricAuth, BiometricSetup } from '@/components/auth/BiometricAuth';
import { TwoFactorSetup, TwoFactorPrompt } from '@/components/auth/TwoFactorAuth';
import { AccountRecoverySetup, AccountRecoveryVerify } from '@/components/auth/AccountRecovery';
import { ProgressivePasswordRequirements } from '@/components/auth/ProgressivePasswordRequirements';

// Mock dependencies
vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}));

vi.mock('@/utils/security', () => ({
  enable2FA: vi.fn(),
  verify2FACode: vi.fn(),
  disable2FA: vi.fn(),
}));

describe('Enhanced Authentication Components', () => {
  describe('MagicLinkAuth', () => {
    it('renders magic link form', () => {
      render(<MagicLinkAuth onSuccess={vi.fn()} />);
      expect(screen.getByText(/sign in with magic link/i)).toBeInTheDocument();
    });

    it('validates email before sending', async () => {
      const onSuccess = vi.fn();
      render(<MagicLinkAuth onSuccess={onSuccess} />);
      
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
      
      render(<MagicLinkAuth onSuccess={onSuccess} />);
      
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
      
      render(
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
      
      render(
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
      render(<TwoFactorSetup userId="user123" onComplete={vi.fn()} />);
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
      
      render(<TwoFactorSetup userId="user123" onComplete={vi.fn()} />);
      
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
      
      render(<TwoFactorPrompt userId="user123" onVerified={vi.fn()} onCancel={vi.fn()} />);
      
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
      render(<AccountRecoverySetup userId="user123" onComplete={vi.fn()} />);
      expect(screen.getByText(/account recovery/i)).toBeInTheDocument();
      expect(screen.getByText(/security question 1/i)).toBeInTheDocument();
    });

    it('requires both questions to be answered', async () => {
      render(<AccountRecoverySetup userId="user123" onComplete={vi.fn()} />);
      
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
      render(<AccountRecoverySetup userId="user123" onComplete={onComplete} />);
      
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
      render(<ProgressivePasswordRequirements password="" isFocused={true} />);
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
    });

    it('marks requirements as met', () => {
      const { rerender } = render(
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
      const { container, rerender } = render(
        <ProgressivePasswordRequirements password="Test123!" isFocused={true} />
      );
      
      const progressBar = container.querySelector('.progressive-password-requirements__progress-bar');
      expect(progressBar).toBeInTheDocument();
      
      // Should show progress
      rerender(
        <ProgressivePasswordRequirements password="Test123!@#" isFocused={true} />
      );
      
      // Progress should increase
      expect(progressBar).toHaveStyle({ width: expect.stringMatching(/\d+%/) });
    });

    it('detects common passwords', () => {
      render(
        <ProgressivePasswordRequirements password="password123" isFocused={true} />
      );
      expect(screen.getByText(/avoid common patterns/i)).toBeInTheDocument();
    });

    it('detects repeated characters', () => {
      render(
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
      render(<TwoFactorSetup userId="user123" onComplete={onComplete} />);
      
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
