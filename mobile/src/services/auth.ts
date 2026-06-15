/**
 * Mobile Authentication Service
 * React Native implementation with Supabase Auth
 */

import { createClient, SupabaseClient, Session, User, type AuthError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import 'react-native-url-polyfill/auto';
import { waselMobileConfig } from '../lib/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export class MobileAuthService {
  private supabase: SupabaseClient;
  private listeners: Set<(state: AuthState) => void> = new Set();
  private currentState: AuthState = {
    session: null,
    user: null,
    loading: true,
  };

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Get initial session
    const { data: { session } } = await this.supabase.auth.getSession();
    
    this.updateState({
      session,
      user: session?.user || null,
      loading: false,
    });

    // Listen for auth changes
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
    listener(this.currentState); // Immediate call with current state
    
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
    metadata?: Record<string, any>,
  ): Promise<{ error?: AuthError }> {
    const options: { data?: object } = {};
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
