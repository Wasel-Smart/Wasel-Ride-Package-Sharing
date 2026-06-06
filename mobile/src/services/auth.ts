/**
 * Mobile Authentication Service
 * React Native implementation with Supabase Auth
 */

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

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

  async signInWithEmail(email: string, password: string): Promise<{ error?: Error }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error || undefined };
  }

  async signUpWithEmail(
    email: string,
    password: string,
    metadata?: Record<string, any>,
  ): Promise<{ error?: Error }> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    return { error: error || undefined };
  }

  async signInWithPhone(phone: string): Promise<{ error?: Error }> {
    const { error } = await this.supabase.auth.signInWithOtp({
      phone,
    });

    return { error: error || undefined };
  }

  async verifyOtp(phone: string, token: string): Promise<{ error?: Error }> {
    const { error } = await this.supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    return { error: error || undefined };
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

  isAuthenticated(): boolean {
    return !!this.currentState.session;
  }
}

export const mobileAuth = new MobileAuthService();
