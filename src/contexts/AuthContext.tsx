/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';
import { getAuthRedirectCandidates } from '../utils/env';
import { scheduleDeferredTask } from '../utils/runtimeScheduling';
import { useLocalAuth } from './LocalAuth';
import {
  buildUpdatedLocalUser,
  createLocalAuthProfile,
  createLocalAuthUser,
  loadProfile,
  normalizeOperationError,
  shouldIgnoreProfileError,
  shouldRefreshProfile,
  signInWithOAuthProvider,
  type Profile,
  type AuthOperationError,
} from './authContextHelpers';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isBackendConnected: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthOperationError }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthOperationError }>;
  signInWithGoogle: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signInWithFacebook: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthOperationError }>;
  refreshProfile: () => Promise<void>;
  resendSignupConfirmation: (email: string) => Promise<{ error: AuthOperationError }>;
  resetPassword: (email: string) => Promise<{ error: AuthOperationError }>;
  changePassword: (nextPassword: string) => Promise<{ error: AuthOperationError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function getResetPasswordRedirectCandidates(origin?: string): string[] {
  return getAuthRedirectCandidates(origin);
}

function shouldRetryResetPasswordForRedirect(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  return (
    message.includes('redirect') ||
    message.includes('redirectto') ||
    message.includes('callback') ||
    message.includes('not allowed') ||
    message.includes('allow list') ||
    message.includes('whitelist') ||
    message.includes('url')
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const localAuth = useLocalAuth();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const profileUserIdRef = useRef<string | null>(null);
  const isPublicLanding =
    typeof window !== 'undefined' && window.location.pathname === '/';

  useEffect(() => {
    profileUserIdRef.current = profile?.id ?? null;
  }, [profile?.id]);

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    try {
      if (!userId || !supabase) {
        setProfile(null);
        return;
      }

      if (!force && profileUserIdRef.current === userId) {
        return;
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
    const supabaseClient = supabase;

    if (!supabaseClient) {
      setLoading(false);
      setIsBackendConnected(false);
      return;
    }

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event: AuthChangeEvent, nextSession: Session | null) => {
        if (!mounted) return;

        const nextUserId = nextSession?.user?.id ?? null;
        const isUserSwitch = Boolean(
          nextUserId &&
          profileUserIdRef.current &&
          profileUserIdRef.current !== nextUserId,
        );

        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (isUserSwitch) {
          setProfile(null);
        }

        if (shouldRefreshProfile(event, nextSession)) {
          const timer = setTimeout(() => {
            if (mounted && nextUserId) {
              void fetchProfile(nextUserId, isUserSwitch);
            }
          }, 100);
          // Cleanup is handled by the mounted flag check inside the callback.
          // Store the timer id so it can be cleared if the component unmounts
          // before the 100ms fires.
          pendingTimers.push(timer);
        } else if (!nextSession) {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (mounted && data.session) {
          setSession(data.session);
          setUser(data.session.user);
          const shouldForceProfileRefresh = profileUserIdRef.current !== data.session.user.id;
          if (shouldForceProfileRefresh) {
            setProfile(null);
          }
          setTimeout(() => {
            if (mounted && data.session?.user?.id) {
              void fetchProfile(data.session.user.id, shouldForceProfileRefresh);
            }
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
        const { data, error } = await supabaseClient.auth.getSession();
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

    const shouldDeferAuthInit = isPublicLanding && import.meta.env.MODE !== 'test';
    const cancelDeferredInit = shouldDeferAuthInit
      ? scheduleDeferredTask(() => {
          void initializeAuth();
        }, 1_600)
      : (() => {
          void initializeAuth();
          return () => undefined;
        })();
    window.addEventListener('message', handleAuthMessage);

    return () => {
      mounted = false;
      cancelDeferredInit();
      window.removeEventListener('message', handleAuthMessage);
      subscription.unsubscribe();
    };
  }, [fetchProfile, isPublicLanding, localAuth.loading, localAuth.user]);

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

  const signInWithGoogle = useCallback(async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
    return signInWithOAuthProvider(supabase, 'google', returnTo);
  }, []);

  const signInWithFacebook = useCallback(async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
    return signInWithOAuthProvider(supabase, 'facebook', returnTo);
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
      await fetchProfile(user.id, true);
    }
  }, [fetchProfile, user]);

  const resendSignupConfirmation = useCallback(async (email: string): Promise<{ error: AuthOperationError }> => {
    try {
      await authAPI.resendSignupConfirmation(email);
      return { error: null };
    } catch (error: unknown) {
      return {
        error: normalizeOperationError(
          error,
          'Confirmation email could not be sent.',
        ),
      };
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: AuthOperationError }> => {
    if (!supabase) return { error: new Error('Backend not configured') };

    try {
      const redirectCandidates = getResetPasswordRedirectCandidates(
        typeof window !== 'undefined' ? window.location.origin : undefined,
      );

      let lastError: AuthOperationError = null;
      for (const redirectTo of redirectCandidates) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (!error) {
          return { error: null };
        }

        lastError = error;
        if (!shouldRetryResetPasswordForRedirect(error)) {
          break;
        }
      }

      return {
        error:
          lastError instanceof Error && shouldRetryResetPasswordForRedirect(lastError)
            ? new Error(
                'Recovery email could not be sent because the current reset callback URL is not allowed yet. Add your local app URL to Supabase Auth redirect URLs or try again from the configured app origin.',
              )
            : lastError,
      };
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
    resendSignupConfirmation,
    resetPassword,
    changePassword,
  }), [
    user, profile, session, loading, isBackendConnected,
    signUp, signIn, signInWithGoogle, signInWithFacebook, signOut,
    updateProfile, refreshProfile, resendSignupConfirmation, resetPassword, changePassword,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
