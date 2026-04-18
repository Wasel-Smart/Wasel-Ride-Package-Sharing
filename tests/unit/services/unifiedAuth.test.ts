/**
 * Unit tests for unified auth service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { unifiedAuthService } from '@/services/unifiedAuth';

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      refreshSession: (...args: any[]) => mockRefreshSession(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: any[]) => mockUpdateUser(...args),
    },
  },
}));

vi.mock('@/utils/env', () => ({
  getAuthCallbackUrl: () => 'http://localhost:3000/app/auth/callback',
}));

vi.mock('@/services/logger', () => ({
  logger: {
    authEvent: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  setCorrelationId: vi.fn(),
}));

describe('UnifiedAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signInWithEmail', () => {
    it('returns success with user and session on valid credentials', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await unifiedAuthService.signInWithEmail(
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('returns normalized error on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await unifiedAuthService.signInWithEmail(
        'test@example.com',
        'wrongpassword'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('handles network errors gracefully', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

      const result = await unifiedAuthService.signInWithEmail(
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('signUpWithEmail', () => {
    it('returns success with requiresEmailConfirmation when no session', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await unifiedAuthService.signUpWithEmail(
        'test@example.com',
        'password123',
        { fullName: 'Test User' }
      );

      expect(result.success).toBe(true);
      expect(result.requiresEmailConfirmation).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('returns success with session when email confirmation disabled', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await unifiedAuthService.signUpWithEmail(
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(result.requiresEmailConfirmation).toBe(false);
      expect(result.session).toEqual(mockSession);
    });

    it('returns error when email already registered', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await unifiedAuthService.signUpWithEmail(
        'existing@example.com',
        'password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('This email is already registered');
    });
  });

  describe('signInWithOAuth', () => {
    it('initiates Google OAuth flow successfully', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      const result = await unifiedAuthService.signInWithOAuth({
        provider: 'google',
      });

      expect(result.success).toBe(true);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.any(String),
        }),
      });
    });

    it('initiates Facebook OAuth flow successfully', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://facebook.com/oauth', provider: 'facebook' },
        error: null,
      });

      const result = await unifiedAuthService.signInWithOAuth({
        provider: 'facebook',
      });

      expect(result.success).toBe(true);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'facebook',
        options: expect.objectContaining({
          redirectTo: expect.any(String),
        }),
      });
    });

    it('handles OAuth errors gracefully', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null, provider: null },
        error: { message: 'OAuth provider not configured' },
      });

      const result = await unifiedAuthService.signInWithOAuth({
        provider: 'google',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('signOut', () => {
    it('signs out successfully', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const result = await unifiedAuthService.signOut();

      expect(result.success).toBe(true);
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('handles sign-out errors', async () => {
      mockSignOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await unifiedAuthService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getSession', () => {
    it('retrieves current session successfully', async () => {
      const mockSession = { access_token: 'token-123' };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await unifiedAuthService.getSession();

      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('returns null session when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await unifiedAuthService.getSession();

      expect(result.session).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('refreshes session successfully', async () => {
      const mockUser = { id: 'user-123' };
      const mockSession = { access_token: 'new-token-123', user: mockUser };

      mockRefreshSession.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await unifiedAuthService.refreshSession();

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('handles refresh errors', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Refresh token expired' },
      });

      const result = await unifiedAuthService.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('resetPassword', () => {
    it('sends password reset email successfully', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await unifiedAuthService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.any(String),
        })
      );
    });

    it('handles reset password errors', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'Email not found' },
      });

      const result = await unifiedAuthService.resetPassword('unknown@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('updatePassword', () => {
    it('updates password successfully', async () => {
      const mockUser = { id: 'user-123' };

      mockUpdateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await unifiedAuthService.updatePassword('newpassword123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('handles password update errors', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak' },
      });

      const result = await unifiedAuthService.updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
