/**
 * Mobile Authentication Service
 * React Native implementation with Supabase Auth
 */

import { User, type AuthError, type Session } from '@supabase/supabase-js';
import { Linking } from 'react-native';
import { supabase as sharedSupabase, waselMobileConfig } from '../lib/config';
import { biometricAuth } from './biometricAuth';

import { sanitizeLogValue } from '../utils/sanitize';
import { normalizePhone, isValidE164Phone } from '../../src/shared/validation/phone';

export type AuthMetadata = Record<string, string | number | boolean | null | undefined>;
type OAuthProvider = 'google' | 'facebook';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A custom-scheme link can be opened by any app on the device, so only a URL
 * that exactly matches our configured auth callback may start a session.
 * `wasel://auth/callback?code=1` matches; `wasel://auth/callback/evil` and
 * `wasel://auth/callbackX` do not.
 */
export function isAuthCallbackUrl(url: string, redirectUrl: string): boolean {
  if (!url || !redirectUrl || !url.startsWith(redirectUrl)) return false;
  const next = url.charAt(redirectUrl.length);
  return next === '' || next === '?' || next === '#';
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export class MobileAuthService {
  private listeners = new Set<(state: AuthState) => void>();
  private currentState: AuthState = {
    session: null,
    user: null,
    loading: true,
  };

  private get supabase() {
    return sharedSupabase;
  }

  constructor() {}

  public async initialize(): Promise<void> {
    Linking.addEventListener('url', (event: { url: string }) => {
      void this.completeAuthFromUrl(event.url).catch(error => {
        if (__DEV__) {
          console.warn('[Auth] Deep link session restore failed:', sanitizeLogValue(error));
        }
      });
    });

    if (this.supabase?.auth?.onAuthStateChange) {
      this.supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        this.updateState({
          session,
          user: session?.user || null,
          loading: false,
        });
      });
    }

    // Process initial URL after setting up listeners to avoid race conditions
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      const handled = await this.completeAuthFromUrl(initialUrl).catch(() => false);
      if (handled) return; // completeAuthFromUrl will update the state
    }

    // If no deep link was handled, get the session from storage as the final step
    if (this.supabase?.auth?.getSession) {
      try {
        const { data: { session } } = await this.supabase.auth.getSession();
        this.updateState({ session, user: session?.user || null, loading: false });
      } catch {
        // A storage or network failure must not leave the app on the loading screen forever.
        this.updateState({ loading: false });
      }
    } else {
      this.updateState({ loading: false });
    }
  }

  private updateState(newState: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...newState };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): AuthState {
    return this.currentState;
  }

  async getSession(): Promise<Session | null> {
    return this.currentState.session;
  }

  private persistSessionForBiometrics(session: Session): void {
    void biometricAuth.storeSessionForBiometric(session.access_token, session.refresh_token);
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error?: AuthError }> {
    const result = await this.signInWithEmail(email, password);
    if (result.error) return { user: null, error: result.error };
    return { user: this.currentState.user };
  }

  async signInWithEmail(email: string, password: string): Promise<{ error?: AuthError }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });

      if (error) return { error };
      if (!data.session) return { error: new Error('Sign in did not return a session.') as AuthError };

      this.persistSessionForBiometrics(data.session);
      this.updateState({
        session: data.session,
        user: data.session.user,
      });

      return {};
    } catch (err) {
      return { error: err as AuthError };
    }
  }

  async signUpWithEmail(
    email: string,
    password: string,
    metadata?: AuthMetadata,
  ): Promise<{ error?: AuthError }> {
    if (!waselMobileConfig.hasSupabase) {
      return { error: new Error('Supabase auth is not configured.') as AuthError };
    }

    const options: { data?: AuthMetadata; emailRedirectTo?: string } = {
      emailRedirectTo: waselMobileConfig.authRedirectUrl,
    };
    if (metadata) {
      options.data = metadata;
    }

    const { error } = await this.supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options,
    });

    return error ? { error } : {};
  }

  async signInWithPhone(phone: string): Promise<{ error?: AuthError }> {
    const normalized = this.tryNormalizePhone(phone);
    if (!normalized) {
      return { error: new Error('Please enter a valid phone number.') as AuthError };
    }

    const { error } = await this.supabase.auth.signInWithOtp({
      phone: normalized,
    });

    return error ? { error } : {};
  }

  async signInWithOAuth(provider: OAuthProvider): Promise<{ error?: AuthError | Error }> {
    if (!waselMobileConfig.hasSupabase) {
      return { error: new Error('Supabase auth is not configured.') };
    }

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: waselMobileConfig.authRedirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error };
    if (!data.url) return { error: new Error(`No ${provider} OAuth URL was returned.`) };

    await Linking.openURL(data.url);
    return {};
  }

  async completeAuthFromUrl(url: string): Promise<boolean> {
    if (!isAuthCallbackUrl(url, waselMobileConfig.authRedirectUrl)) {
      return false;
    }

    const queryString = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    const hashString = url.includes('#') ? url.split('#')[1] : '';
    const combined = [queryString, hashString].filter(Boolean).join('&');
    const params = new URLSearchParams(combined);

    const code = params.get('code');
    const errorCode = params.get('error') || params.get('error_code');
    const errorDescription =
      params.get('error_description') || 'An unknown OAuth error occurred.';

    if (errorCode) {
      // Provide a more user-friendly error message for common OAuth issues.
      if (errorCode === 'access_denied') {
        throw new Error('You have denied access. Please try again if this was a mistake.');
      } else if (errorCode === 'server_error' || errorCode.toString().startsWith('5')) {
        throw new Error('The authentication provider is currently unavailable. Please try again later.');
      }
      throw new Error(errorDescription);
    }

    // PKCE only. Raw `access_token` / `refresh_token` values in a URL are
    // deliberately ignored: anything that can open the custom scheme could
    // otherwise sign this device into an attacker-controlled account.
    if (!code) {
      return false;
    }

    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }
    if (!data?.session) {
      return false;
    }

    this.persistSessionForBiometrics(data.session);

    this.updateState({
      session: data.session,
      user: data.session.user,
      loading: false,
    });

    return true;
  }

  async signInWithGoogle(): Promise<{ error?: AuthError | Error }> {
    return this.signInWithOAuth('google');
  }

  async signInWithFacebook(): Promise<{ error?: AuthError | Error }> {
    return this.signInWithOAuth('facebook');
  }

  /**
   * normalizePhone() throws on input it cannot parse, and a user may type spaces or a leading 0
   * (the screen's own hint is "+962 79 123 4567"). Returns the E.164 number, or null if invalid.
   */
  private tryNormalizePhone(phone: string): string | null {
    try {
      const normalized = normalizePhone(phone);
      return isValidE164Phone(normalized) ? normalized : null;
    } catch {
      return null;
    }
  }

  async verifyOtp(phone: string, token: string): Promise<{ error?: AuthError }> {
    // Must match the number the OTP was requested for: signInWithPhone sends the normalized form.
    const normalized = this.tryNormalizePhone(phone);
    if (!normalized) {
      return { error: new Error('Please enter a valid phone number.') as AuthError };
    }

    const { error } = await this.supabase.auth.verifyOtp({
      phone: normalized,
      token,
      type: 'sms',
    });

    return error ? { error } : {};
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    await this.clearBiometricSession();
  }

  async refreshSession(): Promise<Session | null> {
    const {
      data: { session },
    } = await this.supabase.auth.refreshSession();
    return session;
  }

  async restoreSession(token: { accessToken: string; refreshToken: string }): Promise<boolean> {
    const { error } = await this.supabase.auth.setSession({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });
    return !error;
  }

  getAccessToken(): string | null {
    return this.currentState.session?.access_token || null;
  }

  getUser(): User | null {
    return this.currentState.user;
  }

  getCurrentUser(): User | null {
    return this.getUser();
  }

  isAuthenticated(): boolean {
    return !!this.currentState.session;
  }

  async changePassword(nextPassword: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.updateUser({ password: nextPassword });
    return error ? { error } : {};
  }

  async updateEmail(newEmail: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.updateUser({ email: newEmail });
    return error ? { error } : {};
  }

  async updatePhone(newPhone: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.updateUser({ phone: newPhone });
    return error ? { error } : {};
  }

  async updateUser(data: AuthMetadata): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.updateUser({ data });
    return error ? { error } : {};
  }

  async resetPassword(email: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: waselMobileConfig.authRedirectUrl,
    });
    return error ? { error } : {};
  }

  async signOutAllDevices(): Promise<void> {
    const { error } = await this.supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
    await this.clearBiometricSession();
  }

  /** A refresh token must never outlive the session it belonged to. */
  private async clearBiometricSession(): Promise<void> {
    try {
      await biometricAuth.clearStoredSession();
    } catch {
      // Best effort: failing to clear must not block sign-out.
    }
  }
}

export const mobileAuth = new MobileAuthService();

/**
 * `readyPromise` resolves once both auth session restoration AND biometric
 * initialization are complete. AppNavigator waits on this before rendering any
 * screen, so `biometricAuth.isEnabled()` always returns its true value on the
 * first render instead of silently returning false on fast cold starts.
 */
export const authReadyPromise: Promise<void> = (async () => {
  // Run auth init and biometric init in parallel — they don't depend on each other.
  await Promise.all([
    mobileAuth.initialize(),
    biometricAuth.initialize().catch(() => {
      // Biometric init failure must never block the app. It leaves
      // biometricAuth.isSupported() as false, which is the safe default.
    }),
  ]);
})();

export const authService = mobileAuth;
