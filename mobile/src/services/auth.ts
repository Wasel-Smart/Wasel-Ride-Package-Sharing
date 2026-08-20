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

 interface AuthState {
   session: Session | null;
  user: User | null;
  loading: boolean;
}

export class MobileAuthService {
  private supabase = sharedSupabase;
  private listeners = new Set<(state: AuthState) => void>();
  private currentState: AuthState = {
    session: null,
    user: null,
    loading: true,
  };

  constructor() {}

  public async initialize(): Promise<void> {
    Linking.addEventListener('url', (event: { url: string }) => {
      void this.completeAuthFromUrl(event.url).catch(error => {
        if (__DEV__) {
          console.warn('[Auth] Deep link session restore failed:', sanitizeLogValue(error));
        }
      });
    });

    this.supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      this.updateState({
        session,
        user: session?.user || null,
        loading: false,
      });
    });

    // Process initial URL after setting up listeners to avoid race conditions
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      const handled = await this.completeAuthFromUrl(initialUrl).catch(() => false);
      if (handled) return; // completeAuthFromUrl will update the state
    }

    // If no deep link was handled, get the session from storage as the final step
    const { data: { session } } = await this.supabase.auth.getSession();
    this.updateState({ session, user: session?.user || null, loading: false });
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
    const { error } = await this.supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
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
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(
      [parsedUrl.searchParams.toString(), parsedUrl.hash.replace(/^#/, '')]
        .filter(Boolean)
        .join('&'),
    );
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
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

    if (!accessToken || !refreshToken) {
      return false;
    }

    const { data, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }
    if (!data.session) {
      return false;
    }

    this.persistSessionForBiometrics(data.session);

    // Ensure profile exists, creating it on first OAuth sign-in
    // This mirrors the web app's logic for a consistent user experience.
    await this.supabase.functions.invoke('get-or-create-profile');

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

  async verifyOtp(phone: string, token: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    return error ? { error } : {};
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
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
  }
}

export const mobileAuth = new MobileAuthService();
void mobileAuth.initialize();
export const authService = mobileAuth;
