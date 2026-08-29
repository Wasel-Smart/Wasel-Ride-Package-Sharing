import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/auth-js';
import { getAuthCallbackUrl } from '../utils/env';
import { sanitizeLogMessage } from '../utils/sanitization';
import { parseOAuthError } from '../utils/oauthErrors';
import { sessionManager } from '../utils/sessionManager';
import {
  normalizeOperationError,
  signInWithOAuthProvider,
  type AuthOperationError,
  type Profile,
  type WaselUser,
  mapBackendProfile,
  applyUserUpdates,
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
  waselUser: WaselUser | null;
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
  updateUser: (updates: Partial<WaselUser>) => Promise<void>;
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
  waselUser: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithFacebook: async () => ({ error: null }),
  signOut: async () => { },
  updateProfile: async () => ({ error: null }),
  updateUser: async () => { },
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
  const { authAPI } = await import('../services/auth');
  const profileData = await authAPI.getProfile();
  return (profileData?.profile as Profile | null) ?? null;
}

async function getSupabaseClient() {
  const { supabase } = await import('../utils/supabase/client');
  return supabase;
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
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [waselUser, setWaselUser] = useState<WaselUser | null>(null);
  const optimisticRef = useRef<Partial<WaselUser> | null>(null);

  const fetchProfile = useCallback(async (forceCreate = false, authUser?: User | null) => {
    if (!authUser || !(await getSupabaseClient())) {
      setProfile(null);
      return null;
    }
    const activeUser = authUser;

    let nextProfile = await loadProfileFromBackend();

    if (!nextProfile && forceCreate) {
      const { firstName, lastName } = getProfileDisplayName(activeUser);

      try {
        const { authAPI } = await import('../services/auth');
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
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    let removeAuthMessageListener: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        const client = await getSupabaseClient();
        if (!mounted) return;

        if (!client) {
          setUser(null);
          setProfile(null);
          setSession(null);
          setInitializing(false);
          setIsBackendConnected(false);
          return;
        }

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

          void fetchProfile(shouldEnsureProfile, nextSession.user)
            .catch(error => {
              if (import.meta.env?.DEV) {
                console.warn('[Auth] Profile refresh warning:', sanitizeLogMessage(String(error)));
              }
            })
            .finally(() => {
              if (mounted) setInitializing(false);
            });
        };

        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
          syncFromSession(event, nextSession);
        });
        unsubscribe = () => subscription.unsubscribe();

        const handleAuthMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (!event.data || typeof event.data !== 'object') return;
          if (event.data.type !== 'wasel-auth-complete') return;

          try {
            const { data, error } = await client.auth.getSession();
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
            if (mounted) setInitializing(false);
          }
        };

        window.addEventListener('message', handleAuthMessage);
        removeAuthMessageListener = () => window.removeEventListener('message', handleAuthMessage);
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.warn('[Auth] Session initialization skipped:', sanitizeLogMessage(String(error)));
        }
        if (mounted) {
          setIsBackendConnected(false);
          setInitializing(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
      removeAuthMessageListener?.();
      unsubscribe?.();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) {
      setWaselUser(null);
      return;
    }

    const mapped = mapBackendProfile({
      authUser: user,
      profile,
    });

    const pending = optimisticRef.current;
    optimisticRef.current = null;
    const nextUser = pending ? applyUserUpdates(mapped, pending) : mapped;
    setWaselUser(nextUser);
  }, [user, profile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone?: string,
      returnTo?: string,
    ): Promise<SignUpResult> => {
      if (!(await getSupabaseClient())) {
        return { error: new Error('Backend not configured') };
      }

      const { firstName, lastName } = splitFullName(fullName);

      setBusy(true);
      try {
        const { authAPI } = await import('../services/auth');
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
        const { authAPI } = await import('../services/auth');
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
        const client = await getSupabaseClient();
        if (!client) {
          return { error: new Error('Backend not configured') };
        }

        try {
          const result = await signInWithOAuthProvider(client, provider, returnTo);

          if (result.error) {
            const oauthError = parseOAuthError(result.error, provider);
            if (oauthError && import.meta.env?.DEV) {
              console.error(`[OAuth ${provider}]`, sanitizeLogMessage(oauthError));
            }
            const errorToReturn = oauthError
              ? new Error(oauthError.userMessage)
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
      const { authAPI } = await import('../services/auth');
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
        const { authAPI } = await import('../services/auth');
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

  const updateUser = useCallback(
    async (updates: Partial<WaselUser>) => {
      if (!user) return;

      const profileUpdates: Partial<Profile> = {};
      if (updates.name !== undefined) profileUpdates.full_name = updates.name;
      if (updates.phone !== undefined) profileUpdates.phone_number = updates.phone;
      if (updates.balance !== undefined) profileUpdates.wallet_balance = updates.balance;
      if (updates.rating !== undefined) profileUpdates.rating = updates.rating;
      if (updates.trips !== undefined) profileUpdates.trip_count = updates.trips;
      if (updates.verified !== undefined) profileUpdates.verified = updates.verified;
      if (updates.sanadVerified !== undefined) profileUpdates.sanad_verified = updates.sanadVerified;
      if (updates.verificationLevel !== undefined) profileUpdates.verification_level = updates.verificationLevel;
      if (updates.walletStatus !== undefined) profileUpdates.wallet_status = updates.walletStatus;
      if (updates.avatar !== undefined) profileUpdates.avatar_url = updates.avatar;
      if (updates.emailVerified !== undefined) profileUpdates.email_verified = updates.emailVerified;
      if (updates.phoneVerified !== undefined) profileUpdates.phone_verified = updates.phoneVerified;
      if (updates.twoFactorEnabled !== undefined) profileUpdates.two_factor_enabled = updates.twoFactorEnabled;
      if (updates.driverStatus !== undefined) profileUpdates.driver_status = updates.driverStatus;

      optimisticRef.current = { ...(optimisticRef.current ?? {}), ...updates };
      setWaselUser(prev => (prev ? applyUserUpdates(prev, updates) : prev));

      const result = await updateProfile(profileUpdates);
      if (result.error) {
        optimisticRef.current = null;
        setWaselUser(prev => (prev && user ? mapBackendProfile({ authUser: user, profile: profile }) : prev));
      }
    },
    [user, profile, updateProfile],
  );

  const resetPassword = useCallback(
    async (email: string, returnTo?: string): Promise<{ error: AuthOperationError }> => {
      const client = await getSupabaseClient();
      if (!client) return { error: new Error('Backend not configured') };

      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
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
      const client = await getSupabaseClient();
      if (!client) return { error: new Error('Backend not configured') };

      setBusy(true);
      try {
        const { error } = await client.auth.updateUser({ password: nextPassword });
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
      waselUser,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithFacebook,
      signOut,
      updateProfile,
      updateUser,
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
      updateUser,
      user,
      waselUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
