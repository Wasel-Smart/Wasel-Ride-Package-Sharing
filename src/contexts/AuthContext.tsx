import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';
import { getAuthCallbackUrl } from '../utils/env';
import { useLocalAuth } from './LocalAuth';
import {
  AuthOperationError,
  buildUpdatedLocalUser,
  createLocalAuthProfile,
  createLocalAuthUser,
  loadProfile,
  normalizeOperationError,
  shouldIgnoreProfileError,
  shouldRefreshProfile,
  signInWithOAuthProvider,
  type Profile,
} from './authContextHelpers';

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
  changePassword: (nextPassword: string) => Promise<{ error: AuthOperationError }>;
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
  changePassword: async () => ({ error: null }),
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

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    try {
      if (!userId || !supabase) {
        setProfile(null);
        return;
      }

      if (!force) {
        let hasProfile = false;
        setProfile((previous) => {
          hasProfile = !!previous;
          return previous;
        });
        if (hasProfile) return;
      }

      setProfile(await loadProfile());
    } catch (error: unknown) {
      const err = error as Error;
      if (!shouldIgnoreProfileError(err) && import.meta.env?.DEV) {
        console.error('Profile fetch error:', err);
      }
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      if (localAuth.user) {
        setUser(createLocalAuthUser(localAuth.user));
        setProfile(createLocalAuthProfile(localAuth.user));
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!mounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (shouldRefreshProfile(event, nextSession)) {
          setTimeout(() => {
            void fetchProfile(nextSession!.user.id);
          }, 100);
        } else if (!nextSession) {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted && data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setTimeout(() => {
            void fetchProfile(data.session!.user.id);
          }, 150);
        }
      } catch (error: unknown) {
        if (import.meta.env?.DEV) {
          console.warn('Auth init warning:', (error as Error).message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

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

    void initializeAuth();
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
      return { error: normalizeOperationError(error, 'Signup failed') };
    }
  }, [localAuth]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: AuthOperationError }> => {
    try {
      const result = await localAuth.signIn(email, password);
      return { error: result.error ? new Error(result.error) : null };
    } catch (error: unknown) {
      return { error: normalizeOperationError(error, 'Login failed') };
    }
  }, [localAuth]);

  const signInWithGoogle = useCallback(async (): Promise<{ error: AuthOperationError }> => {
    return signInWithOAuthProvider(supabase, 'google');
  }, []);

  const signInWithFacebook = useCallback(async (): Promise<{ error: AuthOperationError }> => {
    return signInWithOAuthProvider(supabase, 'facebook');
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
    if (!user && !localAuth.user) {
      return { error: new Error('No user logged in') };
    }

    try {
      if (!isSupabaseConfigured || !supabase) {
        if (localAuth.user) {
          localAuth.updateUser(buildUpdatedLocalUser(localAuth.user, updates));
        }
        return { error: null };
      }

      const result = await authAPI.updateProfile(updates);
      if (result.success) {
        if (user) await fetchProfile(user.id, true);
        if (localAuth.user) {
          localAuth.updateUser(buildUpdatedLocalUser(localAuth.user, updates));
        }
        return { error: null };
      }

      return {
        error: new Error(
          typeof result.error === 'string'
            ? result.error
            : 'Failed to update profile',
        ),
      };
    } catch (error: unknown) {
      return { error: normalizeOperationError(error, 'Update failed') };
    }
  }, [fetchProfile, localAuth, user]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [fetchProfile, user]);

  const resetPassword = useCallback(async (email: string): Promise<{ error: AuthOperationError }> => {
    if (!supabase) return { error: new Error('Backend not configured') };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl(window.location.origin),
      });
      return { error: error ?? null };
    } catch (error: unknown) {
      return { error: normalizeOperationError(error, 'Password reset failed') };
    }
  }, []);

  const changePassword = useCallback(async (nextPassword: string): Promise<{ error: AuthOperationError }> => {
    if (!supabase) return { error: new Error('Backend not configured') };

    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      return { error: error ?? null };
    } catch (error: unknown) {
      return { error: normalizeOperationError(error, 'Password update failed') };
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
    changePassword,
  }), [
    user, profile, session, loading, isBackendConnected,
    signUp, signIn, signInWithGoogle, signInWithFacebook, signOut,
    updateProfile, refreshProfile, resetPassword, changePassword,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
