/**
 * Mobile Authentication Service
 * React Native implementation with Supabase Auth
 */

import { User, type AuthError, type Session } from '@supabase/supabase-js';
import { Linking } from 'react-native';
import { supabase as sharedSupabase, waselMobileConfig } from '../lib/config';

export type AuthMetadata = Record<string, string | number | boolean | null | undefined>;

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
      email,
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
      email,
      password,
    });

    return error ? { error } : {};
  }

  async signUpWithEmail(
    email: string,
    password: string,
    metadata?: AuthMetadata,
  ): Promise<{ error?: AuthError }> {
    const options: { data?: AuthMetadata } = {};
    if (metadata) {
      options.data = metadata;
    }

    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options,
    });

    return error ? { error } : {};
  }

  async signInWithPhone(phone: string): Promise<{ error?: AuthError }> {
    const { error } = await this.supabase.auth.signInWithOtp({
      phone,
    });

    return error ? { error } : {};
  }

  async signInWithOAuth(provider: 'google' | 'facebook'): Promise<{ error?: AuthError | Error }> {
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
