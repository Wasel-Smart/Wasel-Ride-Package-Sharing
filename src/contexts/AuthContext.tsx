import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';
import { getAuthRedirectCandidates } from '../utils/env';
import { sanitizeForLog } from '../utils/logSanitizer';
import { useLocalAuth } from './LocalAuth';
import {
  buildUpdatedLocalUser,
  createLocalAuthUser,
  loadProfile,
  normalizeOperationError,
  shouldIgnoreProfileError,
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
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
  ) => Promise<{
    error: AuthOperationError;
    requiresEmailConfirmation?: boolean;
    email?: string;
  }>;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRequestIdRef = useRef(0);

  const user = useMemo(
    () => localAuth.authUser ?? (localAuth.user ? createLocalAuthUser(localAuth.user) : null),
    [localAuth.authUser, localAuth.user],
  );
  const session = localAuth.session;
  const loading = localAuth.loading;
  const isBackendConnected = isSupabaseConfigured;

  const refreshProfile = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      setProfile(null);
      return;
    }

    const requestId = ++profileRequestIdRef.current;

    try {
      const nextProfile = await loadProfile();
      if (requestId !== profileRequestIdRef.current) {
        return;
      }
      setProfile(nextProfile);
    } catch (error: unknown) {
      const err = error as Error;
      if (!shouldIgnoreProfileError(err) && import.meta.env?.DEV) {
        console.error('Profile fetch error:', sanitizeForLog(String(err)));
      }
      if (requestId === profileRequestIdRef.current) {
        setProfile(null);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      setProfile(null);
      return;
    }

    void refreshProfile();
  }, [refreshProfile, session?.access_token, user?.id]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone?: string,
    ): Promise<{
      error: AuthOperationError;
      requiresEmailConfirmation?: boolean;
      email?: string;
    }> => {
      try {
        const result = await localAuth.register(fullName, email, password, phone);
        return {
          error: result.error ? new Error(result.error) : null,
          requiresEmailConfirmation: result.requiresEmailConfirmation,
          email: result.email,
        };
      } catch (error: unknown) {
        return {
          error: normalizeOperationError(error, 'Signup failed'),
        };
      }
    },
    [localAuth],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthOperationError }> => {
      try {
        const result = await localAuth.signIn(email, password);
        return { error: result.error ? new Error(result.error) : null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Login failed') };
      }
    },
    [localAuth],
  );

  const signInWithGoogle = useCallback(async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
    return signInWithOAuthProvider(supabase, 'google', returnTo);
  }, []);

  const signInWithFacebook = useCallback(async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
    return signInWithOAuthProvider(supabase, 'facebook', returnTo);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await localAuth.signOut();
      setProfile(null);
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Sign out error:', sanitizeForLog(String(error)));
      }
    }
  }, [localAuth]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<{ error: AuthOperationError }> => {
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
        if (!result.success) {
          return {
            error: new Error(
              typeof result.error === 'string' ? result.error : 'Failed to update profile',
            ),
          };
        }

        if (localAuth.user) {
          localAuth.updateUser(buildUpdatedLocalUser(localAuth.user, updates));
        }
        await refreshProfile();
        return { error: null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Update failed') };
      }
    },
    [localAuth, refreshProfile, user],
  );

  const resendSignupConfirmation = useCallback(
    async (email: string): Promise<{ error: AuthOperationError }> => {
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
    },
    [],
  );

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

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
