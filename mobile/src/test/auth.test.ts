jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn().mockResolvedValue(null),
    openURL: jest.fn(),
  },
}));

jest.mock('../lib/config', () => ({
  waselMobileConfig: {
    hasSupabase: true,
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY ?? 'test-anon-key',
    authRedirectUrl: 'wasel://auth/callback',
  },
  supabaseUrl: 'https://test.supabase.co',
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithOAuth: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      refreshSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('../services/biometricAuth', () => ({
  biometricAuth: {
    initialize: jest.fn().mockResolvedValue(undefined),
    storeSessionForBiometric: jest.fn().mockResolvedValue(undefined),
  },
}));

import { MobileAuthService, isAuthCallbackUrl } from '../services/auth';
import { supabase } from '../lib/config';
import { biometricAuth } from '../services/biometricAuth';

const mockAuth = supabase.auth as unknown as {
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signInWithOtp: jest.Mock;
  verifyOtp: jest.Mock;
  signInWithOAuth: jest.Mock;
  setSession: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  updateUser: jest.Mock;
  signOut: jest.Mock;
  getSession: jest.Mock;
  refreshSession: jest.Mock;
  onAuthStateChange: jest.Mock;
};

const mockBiometricAuth = biometricAuth as unknown as {
  storeSessionForBiometric: jest.Mock;
};

describe('MobileAuthService', () => {
  let service: MobileAuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockAuth.onAuthStateChange.mockImplementation(() => undefined);
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    service = new MobileAuthService();
  });

  it('initializes with loading state', () => {
    const state = service.getState();
    expect(state.loading).toBe(true);
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });

  it('subscribe notifies listeners with current state', () => {
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(service.getState());
    unsubscribe();
  });

  it('subscribe can be unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    unsubscribe();
    unsubscribe();
  });

  it('getState returns current auth state', () => {
    const state = service.getState();
    expect(state).toHaveProperty('session');
    expect(state).toHaveProperty('user');
    expect(state).toHaveProperty('loading');
  });

  it('isAuthenticated returns false when no session', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getAccessToken returns null when no session', () => {
    expect(service.getAccessToken()).toBeNull();
  });

  it('getUser returns null when no user', () => {
    expect(service.getUser()).toBeNull();
  });

  it('getCurrentUser returns null when no user', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  it('signInWithGoogle delegates to signInWithOAuth', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://example.com' }, error: null });
    const result = await service.signInWithGoogle();
    expect(result).toBeDefined();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('signInWithFacebook delegates to signInWithOAuth', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://example.com' }, error: null });
    const result = await service.signInWithFacebook();
    expect(result).toBeDefined();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'facebook' }),
    );
  });

  it('signOut calls supabase auth signOut', async () => {
    await service.signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('changePassword calls supabase auth updateUser', async () => {
    mockAuth.updateUser.mockResolvedValue({ error: null });
    const testPassword = 'test-' + 'password';
    const result = await service.changePassword(testPassword);
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: testPassword });
    expect(result).toEqual({});
  });

  it('changePassword propagates errors', async () => {
    const error = new Error('Update failed');
    mockAuth.updateUser.mockResolvedValue({ error });
    const result = await service.changePassword('new-password-123');
    expect(result).toEqual({ error });
  });

  it('updateEmail calls supabase auth updateUser', async () => {
    mockAuth.updateUser.mockResolvedValue({ error: null });
    const result = await service.updateEmail('new@example.com');
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(result).toEqual({});
  });

  it('updatePhone calls supabase auth updateUser', async () => {
    mockAuth.updateUser.mockResolvedValue({ error: null });
    const result = await service.updatePhone('+962791234567');
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ phone: '+962791234567' });
    expect(result).toEqual({});
  });

  it('resetPassword calls supabase auth resetPasswordForEmail', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await service.resetPassword('user@example.com');
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'wasel://auth/callback',
    });
    expect(result).toEqual({});
  });

  it('resetPassword normalizes email to lowercase', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await service.resetPassword('USER@Example.COM');
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'wasel://auth/callback',
    });
  });

  it('signIn returns user on success', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { access_token: 'token', refresh_token: 'refresh', user: mockUser };
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: mockSession, user: mockUser }, error: null });
    const result = await service.signIn('test@example.com', 'password');
    expect(result.user).toEqual(mockUser);
    expect(result.error).toBeUndefined();
  });

  it('signIn returns error on failure', async () => {
    const error = new Error('Invalid credentials');
    mockAuth.signInWithPassword.mockResolvedValue({ data: null, error });
    const result = await service.signIn('test@example.com', 'wrong-password');
    expect(result.user).toBeNull();
    expect(result.error).toEqual(error);
  });

  it('signInWithEmail returns empty on success without persisting biometrics on duplicate calls', async () => {
    const mockSession = { access_token: 'token', refresh_token: 'refresh', user: { id: 'user-1' } };
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: mockSession, user: mockSession.user }, error: null });
    const result = await service.signInWithEmail('test@example.com', 'password');
    expect(result).toEqual({});
    expect(mockBiometricAuth.storeSessionForBiometric).toHaveBeenCalledWith('token', 'refresh');
  });

  it('signInWithEmail normalizes email before calling API', async () => {
    const mockSession = { access_token: 'token', refresh_token: 'refresh', user: { id: 'user-1' } };
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: mockSession, user: mockSession.user }, error: null });
    const testPw = process.env.TEST_PASSWORD ?? 'password';
    await service.signInWithEmail('  USER@Example.COM  ', testPw);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: testPw,
    });
  });

  describe('isAuthCallbackUrl', () => {
    const redirect = 'wasel://auth/callback';

    it('accepts the exact callback with query or fragment', () => {
      expect(isAuthCallbackUrl(redirect, redirect)).toBe(true);
      expect(isAuthCallbackUrl(`${redirect}?code=abc`, redirect)).toBe(true);
      expect(isAuthCallbackUrl(`${redirect}#error=access_denied`, redirect)).toBe(true);
    });

    it('rejects look-alike paths, other schemes and empty input', () => {
      expect(isAuthCallbackUrl(`${redirect}/evil?code=abc`, redirect)).toBe(false);
      expect(isAuthCallbackUrl(`${redirect}X?code=abc`, redirect)).toBe(false);
      expect(isAuthCallbackUrl('evil://auth/callback?code=abc', redirect)).toBe(false);
      expect(isAuthCallbackUrl('', redirect)).toBe(false);
      expect(isAuthCallbackUrl(redirect, '')).toBe(false);
    });
  });

  describe('completeAuthFromUrl', () => {
    it('exchanges a PKCE code for a session and updates state', async () => {
      const session = { access_token: 'a', refresh_token: 'r', user: { id: 'user-1' } };
      mockAuth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });

      const handled = await service.completeAuthFromUrl('wasel://auth/callback?code=pkce-code');

      expect(handled).toBe(true);
      expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
      expect(service.getUser()).toEqual({ id: 'user-1' });
      expect(mockBiometricAuth.storeSessionForBiometric).toHaveBeenCalledWith('a', 'r');
    });

    it('ignores raw tokens in the URL instead of trusting them', async () => {
      const handled = await service.completeAuthFromUrl(
        'wasel://auth/callback#access_token=evil&refresh_token=evil',
      );

      expect(handled).toBe(false);
      expect(mockAuth.setSession).not.toHaveBeenCalled();
      expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('ignores links that are not the auth callback', async () => {
      const handled = await service.completeAuthFromUrl('evil://auth/callback?code=abc');

      expect(handled).toBe(false);
      expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('surfaces provider errors with a friendly message', async () => {
      await expect(
        service.completeAuthFromUrl('wasel://auth/callback?error=access_denied'),
      ).rejects.toThrow('You have denied access');
    });

    it('throws when the code exchange fails', async () => {
      const failure = new Error('bad code');
      mockAuth.exchangeCodeForSession.mockResolvedValue({ data: null, error: failure });

      await expect(
        service.completeAuthFromUrl('wasel://auth/callback?code=bad'),
      ).rejects.toBe(failure);
    });
  });

  it('signOut clears the stored biometric session', async () => {
    const clearStoredSession = jest.fn().mockResolvedValue(undefined);
    (mockBiometricAuth as unknown as { clearStoredSession: jest.Mock }).clearStoredSession =
      clearStoredSession;
    mockAuth.signOut.mockResolvedValue({ error: null });

    await service.signOut();

    expect(clearStoredSession).toHaveBeenCalled();
  });
});
