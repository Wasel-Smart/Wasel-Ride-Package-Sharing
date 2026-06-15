/**
 * Mobile Authentication Service
 * React Native implementation with Supabase Auth
 */

import { User, type AuthError, type Session } from '@supabase/supabase-js';
import { Linking, type EmitterSubscription } from 'react-native';
import { supabase as sharedSupabase, waselMobileConfig } from '../lib/config';

export type AuthMetadata = Record<string, string | number | boolean | null | undefined>;
type OAuthProvider = 'google' | 'facebook';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+962${compact.slice(1)}`;
  return compact;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export class MobileAuthService {
  private supabase = sharedSupabase;
  private listeners = new Set<(state: AuthState) => void>();
  private urlSubscription: EmitterSubscription | null = null;
  private currentState: AuthState = {
    session: null,
    user: null,
    loading: true,
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();

    this.updateState({
      session,
      user: session?.user || null,
      loading: false,
    });

    this.urlSubscription = Linking.addEventListener('url', event => {
      void this.completeAuthFromUrl(event.url).catch(error => {
        if (__DEV__) {
          console.warn('[Auth] Deep link session restore failed:', error);
        }
      });
    });

    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      await this.completeAuthFromUrl(initialUrl).catch(error => {
        if (__DEV__) {
          console.warn('[Auth] Initial deep link session restore failed:', error);
        }
      });
    }

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.updateState({
        session,
        user: session?.user || null,
        loading: false,
      });
    });
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

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Sign in did not return a session.');
    }

    this.updateState({
      session: data.session,
      user: data.session.user,
    });

    return data.session;
  }

  async signInWithEmail(email: string, password: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    return error ? { error } : {};
  }

  async signUpWithEmail(
    email: string,
    password: string,
    metadata?: AuthMetadata,
  ): Promise<{ error?: AuthError }> {
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
      [parsedUrl.searchParams.toString(), parsedUrl.hash.replace(/^#/, '')].filter(Boolean).join('&'),
    );
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const errorCode = params.get('error') || params.get('error_code');
    const errorDescription = params.get('error_description') || params.get('error') || '';

    if (errorCode) {
      throw new Error(errorDescription || 'Authentication failed.');
    }

    if (!accessToken || !refreshToken) {
      return false;
    }

    const { data, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) throw error;
    if (!data.session) return false;

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
    const { data: { session } } = await this.supabase.auth.refreshSession();
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
}

export const mobileAuth = new MobileAuthService();
export const authService = mobileAuth;
