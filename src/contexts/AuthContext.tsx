import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { getAuthCallbackUrl } from '../utils/env';
import { isSupabaseConfigured, supabase } from '../utils/supabase/client';
import { sanitizeLogMessage } from '../utils/sanitization';
import { parseOAuthError } from '../utils/oauthErrors';
import { sessionManager } from '../utils/sessionManager';
import {
  normalizeOperationError,
  signInWithOAuthProvider,
  type AuthOperationError,
  type Profile,
} from './authContextHelpers';

type SignUpResult = {
  error: AuthOperationError;
  requiresEmailConfirmation?: boolean;
  user?: User | null;
};

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
    returnTo?: string,
  ) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: AuthOperationError }>;
  signInWithGoogle: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signInWithFacebook: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthOperationError }>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string, returnTo?: string) => Promise<{ error: AuthOperationError }>;
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
  signOut: async () => { },
  updateProfile: async () => ({ error: null }),
  refreshProfile: async () => { },
  resetPassword: async () => ({ error: null }),
  changePassword: async () => ({ error: null }),
});

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Wasel',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

function getProfileDisplayName(authUser: User) {
  const metadata = authUser.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? metadata.name ?? '').trim();
  if (fullName) {
    return splitFullName(fullName);
  }

  const emailLocalPart = authUser.email?.split('@')[0]?.trim() || 'Wasel User';
  return splitFullName(emailLocalPart);
}

async function loadProfileFromBackend(): Promise<Profile | null> {
  const profileData = await authAPI.getProfile();
  return (profileData?.profile as Profile | null) ?? null;
}

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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(isSupabaseConfigured);

  const fetchProfile = useCallback(async (forceCreate = false, authUser?: User | null) => {
    if (!authUser || !supabase) {
      setProfile(null);
      return null;
    }
    const activeUser = authUser;

    let nextProfile = await loadProfileFromBackend();

    if (!nextProfile && forceCreate) {
      const { firstName, lastName } = getProfileDisplayName(activeUser);

      try {
        await authAPI.createProfile(activeUser.id, activeUser.email ?? '', firstName, lastName);
        nextProfile = await loadProfileFromBackend();
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.warn('[Auth] Profile bootstrap skipped:', sanitizeLogMessage(String(error)));
        }
      }
    }

    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setProfile(null);
      setSession(null);
      setInitializing(false);
      setIsBackendConnected(false);
      return;
    }

    if (!supabase) return;

    let mounted = true;

    const syncFromSession = (event: string, nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsBackendConnected(true);

      if (!nextSession?.user) {
        setProfile(null);
        setInitializing(false);
        sessionManager.endSession();
        return;
      }

      // Start session tracking on sign in
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        sessionManager.startSession(nextSession.user.id);
      }

      const shouldEnsureProfile =
        event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED';
      const shouldRefreshProfile =
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED';

      if (!shouldRefreshProfile) {
        setInitializing(false);
        return;
      }

      // Use an async IIFE to handle profile fetching without setTimeout
      (async () => {
        try {
          await fetchProfile(shouldEnsureProfile, nextSession.user);
        } catch (error) {
          if (import.meta.env?.DEV) {
            console.warn('[Auth] Profile refresh warning:', sanitizeLogMessage(String(error)));
          }
        } finally {
          if (mounted) setInitializing(false);
        }
      })();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      syncFromSession(event, nextSession);
    });

    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'wasel-auth-complete') return;

      try {
        if (!supabase) return;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted || !data.session) return;

        setSession(data.session);
        setUser(data.session.user);
        await fetchProfile(true, data.session.user);
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.warn('Auth callback sync warning:', sanitizeLogMessage(String(error)));
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      mounted = false;
      window.removeEventListener('message', handleAuthMessage);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone?: string,
      returnTo?: string,
    ): Promise<SignUpResult> => {
      if (!supabase) {
        return { error: new Error('Backend not configured') };
      }

      const { firstName, lastName } = splitFullName(fullName);

      setBusy(true);
      try {
        const data = await authAPI.signUp(
          email,
          password,
          firstName,
          lastName,
          phone ?? '',
          returnTo,
        );
        const authUser = data.user ?? data.session?.user ?? null;

        if (authUser && data.session) {
          setSession(data.session);
          setUser(authUser);
          await fetchProfile(true, authUser);
        }

        return {
          error: null,
          requiresEmailConfirmation: !authUser,
          user: authUser,
        };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Signup failed') };
      } finally {
        setBusy(false);
      }
    },
    [fetchProfile],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthOperationError }> => {
      setBusy(true);
      try {
        const data = await authAPI.signIn(email, password);
        const authUser = data.user ?? data.session?.user ?? null;

        if (authUser && data.session) {
          setSession(data.session);
          setUser(authUser);
          await fetchProfile(true, authUser);
        }

        return { error: null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Login failed') };
      } finally {
        setBusy(false);
      }
    },
    [fetchProfile],
  );

  const createOAuthSignIn = useCallback(
    (provider: 'google' | 'facebook') =>
      async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
        if (!supabase) {
          return { error: new Error('Backend not configured') };
        }

        try {
          const result = await signInWithOAuthProvider(supabase, provider, returnTo);

          if (result.error) {
            const oauthError = parseOAuthError(result.error, provider);
            if (oauthError && import.meta.env?.DEV) {
              console.error(`[OAuth ${provider}]`, sanitizeLogMessage(oauthError));
            }
            const errorToReturn = oauthError
              ? new Error(oauthError.message)
              : result.error;
            return { error: errorToReturn as AuthOperationError };
          }

          return result;
        } catch (error: unknown) {
          const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
          return { error: normalizeOperationError(error, `${providerName} sign-in failed`) };
        }
      },
    [],
  );

  const signInWithGoogle = useMemo(() => createOAuthSignIn('google'), [createOAuthSignIn]);
  const signInWithFacebook = useMemo(() => createOAuthSignIn('facebook'), [createOAuthSignIn]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await authAPI.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      sessionManager.endSession();
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Sign out error:', sanitizeLogMessage(String(error)));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<{ error: AuthOperationError }> => {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      setBusy(true);
      try {
        const result = await authAPI.updateProfile(updates);
        if (result.success) {
          // Merge the update directly into local profile state so LocalAuth
          // sees the change immediately without waiting for a full re-fetch.
          setProfile(prev => (prev ? { ...prev, ...updates } : prev));
          // Best-effort background refresh — failures are non-fatal.
          fetchProfile(false, user).catch(() => { });
          return { error: null };
        }

        return {
          error: new Error(
            typeof result.error === 'string' ? result.error : 'Failed to update profile',
          ),
        };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Update failed') };
      } finally {
        setBusy(false);
      }
    },
    [fetchProfile, user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(false, user);
  }, [fetchProfile, user]);

  const resetPassword = useCallback(
    async (email: string, returnTo?: string): Promise<{ error: AuthOperationError }> => {
      if (!supabase) return { error: new Error('Backend not configured') };

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthCallbackUrl(
            window.location.origin,
            returnTo ? { returnTo } : undefined,
          ),
        });
        return { error: error ?? null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Password reset failed') };
      }
    },
    [],
  );

  const changePassword = useCallback(
    async (nextPassword: string): Promise<{ error: AuthOperationError }> => {
      if (!supabase) return { error: new Error('Backend not configured') };

      setBusy(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: nextPassword });
        return { error: error ?? null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Password update failed') };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading: initializing || busy,
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
    }),
    [
      busy,
      changePassword,
      initializing,
      isBackendConnected,
      profile,
      refreshProfile,
      resetPassword,
      session,
      signIn,
      signInWithFacebook,
      signInWithGoogle,
      signOut,
      signUp,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
