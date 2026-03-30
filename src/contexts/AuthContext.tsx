import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthChangeEvent, AuthError } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';
import { authAPI } from '../services/auth';
import { useLocalAuth } from './LocalAuth';
import { getAuthCallbackUrl } from '../utils/env';

type Profile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  role?: string | null;
  wallet_balance?: number | null;
  rating?: number | null;
  trip_count?: number | null;
  verified?: boolean | null;
  sanad_verified?: boolean | null;
  verification_level?: string | null;
  wallet_status?: string | null;
  avatar_url?: string | null;
};

/** Canonical error type returned by all auth operations. */
export type AuthOperationError = AuthError | Error | null;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isBackendConnected: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthOperationError }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthOperationError }>;
  signInWithGoogle: () => Promise<{ error: AuthOperationError }>;
  signInWithFacebook: () => Promise<{ error: AuthOperationError }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthOperationError }>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthOperationError }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isBackendConnected: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithFacebook: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  refreshProfile: async () => {},
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const localAuth = useLocalAuth();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  // ⚡ OPTIMIZED: Lazy profile fetch - only when needed, not on every auth event
  const fetchProfile = useCallback(async (userId: string, force = false) => {
    try {
      if (!userId || !supabase) {
        setProfile(null);
        return;
      }
      
      // Skip if we already have a profile and not forcing refresh
      // Use ref to avoid dependency on profile state (prevents infinite re-render)
      if (!force) {
        // Check current state via function form
        let hasProfile = false;
        setProfile(prev => { hasProfile = !!prev; return prev; });
        if (hasProfile) return;
      }
      
      const profileData = await authAPI.getProfile();
      setProfile(profileData?.profile || null);
    } catch (error: unknown) {
      const err = error as Error;
      // Silently handle profile fetch errors - not critical for auth flow
      if (!err.message?.includes('aborted') && !err.message?.includes('not found')) {
        // Only log unexpected errors in development
        if (import.meta.env?.DEV) {
          console.error('Profile fetch error:', err);
        }
      }
      setProfile(null);
    }
  }, []); // No dependency on profile — avoids re-render cascade

  // Initialize auth state - OPTIMIZED for speed
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      if (localAuth.user) {
        setUser({
          id: localAuth.user.id,
          email: localAuth.user.email,
          phone: localAuth.user.phone,
          user_metadata: {
            name: localAuth.user.name,
            role: localAuth.user.role,
          },
        } as unknown as User);
        setProfile({
          id: localAuth.user.id,
          email: localAuth.user.email,
          full_name: localAuth.user.name,
          phone_number: localAuth.user.phone ?? null,
          wallet_balance: localAuth.user.balance,
          rating: localAuth.user.rating,
          trip_count: localAuth.user.trips,
          verified: localAuth.user.verified,
          sanad_verified: localAuth.user.sanadVerified,
          verification_level: localAuth.user.verificationLevel,
          wallet_status: localAuth.user.walletStatus,
          avatar_url: localAuth.user.avatar ?? null,
        } as Profile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setSession(null);
      setLoading(localAuth.loading);
      setIsBackendConnected(false);
      return;
    }

    let mounted = true;

    // ⚡ FAST: Listen for auth changes with minimal processing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        // Update session and user immediately - no async delays
        setSession(session);
        setUser(session?.user ?? null);
        
        // ⚡ OPTIMIZED: Only fetch profile on actual sign-in, not token refreshes
        if (session?.user && event === 'SIGNED_IN') {
          // Defer profile fetch to not block UI
          setTimeout(() => fetchProfile(session.user.id), 100);
        } else if (!session) {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // ⚡ FAST: Get initial session without blocking
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted && data.session) {
          setSession(data.session);
          setUser(data.session.user);
          // Defer profile fetch to not block initial render
          setTimeout(() => fetchProfile(data.session!.user.id), 150);
        }
      } catch (error: unknown) {
        // Silently handle init errors
        if (import.meta.env?.DEV) {
          console.warn('Auth init warning:', (error as Error).message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'wasel-auth-complete') return;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted || !data.session) return;

        setSession(data.session);
        setUser(data.session.user);
        void fetchProfile(data.session.user.id, true);
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.warn('Auth callback sync warning:', error);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      mounted = false;
      window.removeEventListener('message', handleAuthMessage);
      subscription.unsubscribe();
    };
  }, [fetchProfile, localAuth.loading, localAuth.user]);

  const signUp = useCallback(async (email: string, password: string, fullName: string): Promise<{ error: AuthOperationError }> => {
    try {
      const result = await localAuth.register(fullName, email, password);
      return { error: result.error ? new Error(result.error) : null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Signup failed') };
    }
  }, [localAuth]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: AuthOperationError }> => {
    try {
      const result = await localAuth.signIn(email, password);
      return { error: result.error ? new Error(result.error) : null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Login failed') };
    }
  }, [localAuth]);

  const signInWithGoogle = useCallback(async (): Promise<{ error: AuthOperationError }> => {
    if (!supabase) return { error: new Error('Backend not configured') };

    try {
      // Use skipBrowserRedirect so we get the URL back and can open a popup.
      // This avoids navigating the main window / iframe away.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl(window.location.origin),
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };

      if (data?.url) {
        const popup = window.open(
          data.url,
          'wasel_google_oauth',
          'width=520,height=650,scrollbars=yes,resizable=yes,left=200,top=100',
        );
        // If pop-ups are blocked by the browser, fall back to a full redirect.
        if (!popup || popup.closed) {
          // Open in new tab instead of window.location.href to prevent
          // IframeMessageAbortError (page reload triggers Figma iframe onload)
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Google login failed') };
    }
  }, []);

  const signInWithFacebook = useCallback(async (): Promise<{ error: AuthOperationError }> => {
    if (!supabase) return { error: new Error('Backend not configured') };

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: getAuthCallbackUrl(window.location.origin),
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };

      if (data?.url) {
        const popup = window.open(
          data.url,
          'wasel_facebook_oauth',
          'width=520,height=650,scrollbars=yes,resizable=yes,left=200,top=100',
        );
        if (!popup || popup.closed) {
          // Open in new tab instead of window.location.href to prevent
          // IframeMessageAbortError (page reload triggers Figma iframe onload)
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Facebook login failed') };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await localAuth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Sign out error:', error);
      }
    }
  }, [localAuth]);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<{ error: AuthOperationError }> => {
    if (!user && !localAuth.user) return { error: new Error('No user logged in') };
    try {
      if (!isSupabaseConfigured || !supabase) {
        localAuth.updateUser({
          name: String(updates.full_name ?? localAuth.user?.name ?? ''),
          email: String(updates.email ?? localAuth.user?.email ?? ''),
          phone: updates.phone_number ?? localAuth.user?.phone,
          avatar: updates.avatar_url ?? localAuth.user?.avatar,
        });
        return { error: null };
      }
      const result = await authAPI.updateProfile(updates);
      if (result.success) {
        if (user) await fetchProfile(user.id, true);
        if (localAuth.user) {
          localAuth.updateUser({
            name: String(updates.full_name ?? localAuth.user.name),
            email: String(updates.email ?? localAuth.user.email),
            phone: updates.phone_number ?? localAuth.user.phone,
            avatar: updates.avatar_url ?? localAuth.user.avatar,
          });
        }
        return { error: null };
      }
      return { error: new Error(typeof result.error === 'string' ? result.error : 'Failed to update profile') };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Update failed') };
    }
  }, [user, fetchProfile, localAuth]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const resetPassword = useCallback(async (email: string): Promise<{ error: AuthOperationError }> => {
    if (!supabase) return { error: new Error('Backend not configured') };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl(window.location.origin),
      });
      return { error: error ?? null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Password reset failed') };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    isBackendConnected,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    updateProfile,
    refreshProfile,
    resetPassword,
  }), [
    user, profile, session, loading, isBackendConnected,
    signUp, signIn, signInWithGoogle, signInWithFacebook, signOut,
    updateProfile, refreshProfile, resetPassword,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
