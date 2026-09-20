jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn().mockResolvedValue(null),
    openURL: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSupabaseAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signInWithOtp: jest.fn(),
  signInWithOAuth: jest.fn(),
  setSession: jest.fn(),
  getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  verifyOtp: jest.fn(),
  signOut: jest.fn(),
  refreshSession: jest.fn(),
  updateUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
};

const mockFunctionsInvoke = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('../lib/config', () => ({
  waselMobileConfig: {
    hasSupabase: true,
    authRedirectUrl: 'wasel://auth/callback',
  },
  supabase: {
    auth: mockSupabaseAuth,
    functions: { invoke: mockFunctionsInvoke },
  },
}));

jest.mock('./biometricAuth', () => ({
  biometricAuth: {
    storeSessionForBiometric: jest.fn().mockResolvedValue(undefined),
  },
}));

import { Linking } from 'react-native';
import { supabase, waselMobileConfig } from '../lib/config';
import { biometricAuth } from './biometricAuth';
import { mobileAuth } from './auth';

async function flushMicrotasks() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

const fakeSession = (overrides: Record<string, unknown> = {}) => ({
  access_token: 'access-tok',
  refresh_token: 'refresh-tok',
  user: { id: 'user-1', email: 'wasel@example.com' },
  ...overrides,
}) as any;

describe('MobileAuthService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null } });
    (waselMobileConfig as any).hasSupabase = true;
    await flushMicrotasks();
  });

  describe('signInWithEmail', () => {
    it('normalizes the email, signs in, and persists the session for biometrics', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: fakeSession() },
        error: null,
      });

      const result = await mobileAuth.signInWithEmail('  Wasel@Example.com ', 'pw');

      expect(result.error).toBeUndefined();
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'wasel@example.com',
        password: 'pw',
      });
      expect(biometricAuth.storeSessionForBiometric).toHaveBeenCalledWith('access-tok', 'refresh-tok');
      expect(mobileAuth.isAuthenticated()).toBe(true);
      expect(mobileAuth.getAccessToken()).toBe('access-tok');
    });

    it('returns the supabase error without updating state', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await mobileAuth.signInWithEmail('a@b.com', 'wrong');

      expect(result.error).toEqual({ message: 'Invalid credentials' });
      expect(biometricAuth.storeSessionForBiometric).not.toHaveBeenCalled();
    });

    it('returns a friendly error when no session comes back despite no error', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null });

      const result = await mobileAuth.signInWithEmail('a@b.com', 'pw');

      expect(result.error?.message).toBe('Sign in did not return a session.');
    });

    it('catches a thrown exception and returns it as an error', async () => {
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(new Error('network down'));

      const result = await mobileAuth.signInWithEmail('a@b.com', 'pw');

      expect(result.error?.message).toBe('network down');
    });
  });

  describe('signIn', () => {
    it('resolves with the signed-in user on success', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: fakeSession({ user: { id: 'user-2' } }) },
        error: null,
      });

      const result = await mobileAuth.signIn('a@b.com', 'pw');

      expect(result.user).toEqual({ id: 'user-2' });
      expect(result.error).toBeUndefined();
    });

    it('resolves with a null user and the error on failure', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'nope' },
      });

      const result = await mobileAuth.signIn('a@b.com', 'pw');

      expect(result.user).toBeNull();
      expect(result.error).toEqual({ message: 'nope' });
    });
  });

  describe('signUpWithEmail', () => {
    it('refuses to sign up when Supabase auth is not configured', async () => {
      (waselMobileConfig as any).hasSupabase = false;

      const result = await mobileAuth.signUpWithEmail('a@b.com', 'pw');

      expect(result.error?.message).toBe('Supabase auth is not configured.');
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it('normalizes the email and forwards metadata plus the redirect URL', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({ error: null });

      const result = await mobileAuth.signUpWithEmail('  A@B.com ', 'pw', { referralCode: 'X1' });

      expect(result.error).toBeUndefined();
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pw',
        options: {
          emailRedirectTo: 'wasel://auth/callback',
          data: { referralCode: 'X1' },
        },
      });
    });

    it('passes through a supabase error', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({ error: { message: 'Email taken' } });

      const result = await mobileAuth.signUpWithEmail('a@b.com', 'pw');

      expect(result.error).toEqual({ message: 'Email taken' });
    });
  });

  describe('signInWithPhone', () => {
    it('rejects an unparsable phone number instead of returning a friendly error', async () => {
      // normalizePhone() throws synchronously for input it can't recognize, and
      // signInWithPhone has no try/catch around that call — so this currently
      // rejects the promise rather than resolving to { error }. Worth checking
      // whether every caller (e.g. PhoneAuthScreen) wraps this call in try/catch.
      await expect(mobileAuth.signInWithPhone('123')).rejects.toThrow('Invalid phone number provided.');
      expect(mockSupabaseAuth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('normalizes a valid Jordanian number to E.164 and requests an OTP', async () => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({ error: null });

      const result = await mobileAuth.signInWithPhone('0791234567');

      expect(result.error).toBeUndefined();
      expect(mockSupabaseAuth.signInWithOtp).toHaveBeenCalledWith({ phone: '+962791234567' });
    });

    it('passes through a supabase error for a valid number', async () => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({ error: { message: 'Rate limited' } });

      const result = await mobileAuth.signInWithPhone('0791234567');

      expect(result.error).toEqual({ message: 'Rate limited' });
    });
  });

  describe('signInWithOAuth (via signInWithGoogle)', () => {
    it('refuses when Supabase auth is not configured', async () => {
      (waselMobileConfig as any).hasSupabase = false;

      const result = await mobileAuth.signInWithGoogle();

      expect(result.error?.message).toBe('Supabase auth is not configured.');
      expect(mockSupabaseAuth.signInWithOAuth).not.toHaveBeenCalled();
    });

    it('opens the returned OAuth URL on success', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://oauth.example/authorize' }, error: null });

      const result = await mobileAuth.signInWithGoogle();

      expect(result.error).toBeUndefined();
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'wasel://auth/callback', skipBrowserRedirect: true },
      });
      expect(Linking.openURL).toHaveBeenCalledWith('https://oauth.example/authorize');
    });

    it('errors when no OAuth URL comes back', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });

      const result = await mobileAuth.signInWithGoogle();

      expect(result.error?.message).toBe('No google OAuth URL was returned.');
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('passes through a supabase error', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'denied' } });

      const result = await mobileAuth.signInWithGoogle();

      expect(result.error).toEqual({ message: 'denied' });
    });
  });

  describe('completeAuthFromUrl', () => {
    it('throws a friendly message for an access_denied callback', async () => {
      await expect(
        mobileAuth.completeAuthFromUrl('wasel://auth/callback?error=access_denied'),
      ).rejects.toThrow('You have denied access');
    });

    it('throws a friendly message for a server_error callback', async () => {
      await expect(
        mobileAuth.completeAuthFromUrl('wasel://auth/callback?error=server_error'),
      ).rejects.toThrow('authentication provider is currently unavailable');
    });

    it('throws the raw error_description for any other error code', async () => {
      await expect(
        mobileAuth.completeAuthFromUrl(
          'wasel://auth/callback?error=invalid_request&error_description=Something%20odd',
        ),
      ).rejects.toThrow('Something odd');
    });

    it('returns false when there is no error and no tokens in the URL', async () => {
      const result = await mobileAuth.completeAuthFromUrl('wasel://auth/callback');
      expect(result).toBe(false);
    });

    it('sets the session, persists it for biometrics, and provisions the profile on success', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });

      const result = await mobileAuth.completeAuthFromUrl(
        'wasel://auth/callback?access_token=abc&refresh_token=def',
      );

      expect(result).toBe(true);
      expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
        access_token: 'abc',
        refresh_token: 'def',
      });
      expect(biometricAuth.storeSessionForBiometric).toHaveBeenCalledWith('access-tok', 'refresh-tok');
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('get-or-create-profile');
      expect(mobileAuth.isAuthenticated()).toBe(true);
    });

    it('throws when setSession itself returns an error', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({ data: { session: null }, error: new Error('bad token') });

      await expect(
        mobileAuth.completeAuthFromUrl('wasel://auth/callback?access_token=abc&refresh_token=def'),
      ).rejects.toThrow('bad token');
    });
  });

  describe('restoreSession', () => {
    it('returns true on a successful setSession call', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({ error: null });

      const result = await mobileAuth.restoreSession({ accessToken: 'a', refreshToken: 'r' });

      expect(result).toBe(true);
      expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
    });

    it('returns false when setSession errors', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({ error: new Error('expired') });

      const result = await mobileAuth.restoreSession({ accessToken: 'a', refreshToken: 'r' });

      expect(result).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('calls a new subscriber immediately, and again after a state change', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: fakeSession() },
        error: null,
      });

      const cb = jest.fn();
      const unsubscribe = mobileAuth.subscribe(cb);
      expect(cb).toHaveBeenCalledTimes(1);

      await mobileAuth.signInWithEmail('a@b.com', 'pw');
      expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2);

      cb.mockClear();
      unsubscribe();
      await mobileAuth.signInWithEmail('a@b.com', 'pw');
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
