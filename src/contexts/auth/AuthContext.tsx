import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/auth-js';
import type { authAPI, getSupabaseClient, loadProfileFromBackend } from './auth-service';
import { getAuthCallbackUrl, resolveAuthRedirectOrigin } from '../../utils/env';
import { sanitizeLogMessage } from '../../utils/sanitization';
import { parseOAuthError } from '../../utils/oauthErrors';
import { sessionManager } from '../../utils/sessionManager';
import {
  normalizeOperationError,
  signInWithOAuthProvider,
  type AuthOperationError,
  type Profile,
  type WaselUser,
  mapBackendProfile,
  applyUserUpdates,
  createLocalAuthUser,
  createLocalAuthProfile,
} from '../authContextHelpers';
import { getProfileDisplayName, splitFullName } from './helpers';

type AuthRuntime = {
  authAPI: typeof authAPI;
  getSupabaseClient: typeof getSupabaseClient;
  loadProfileFromBackend: typeof loadProfileFromBackend;
};
let authRuntimePromise: Promise<AuthRuntime> | null = null;

function loadAuthRuntime(): Promise<AuthRuntime> {
  authRuntimePromise ??= import('./auth-service');
  return authRuntimePromise;
}

export type SignUpResult = {
  error: AuthOperationError;
  requiresEmailConfirmation?: boolean;
  user?: User | null;
};

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isSubmitting: boolean;
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
  signInWithMicrosoft: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signInWithApple: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthOperationError }>;
  updateUser: (updates: Partial<WaselUser>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string, returnTo?: string) => Promise<{ error: AuthOperationError }>;
  changePassword: (nextPassword: string) => Promise<{ error: AuthOperationError }>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isSubmitting: false,
  isBackendConnected: false,
  waselUser: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithFacebook: async () => ({ error: null }),
  signInWithMicrosoft: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  updateUser: async () => {},
  refreshProfile: async () => {},
  resetPassword: async () => ({ error: null }),
  changePassword: async () => ({ error: null }),
});

interface AuthProviderProps {
  children: React.ReactNode;
}

const AUTH_COOKIE_NAME = 'wasel-auth-token';

function readAuthCookieFingerprint(): string | null | undefined {
  if (typeof document === 'undefined') {return undefined;}
  try {
    const authCookies = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .filter(cookie => {
        const name = cookie.slice(0, cookie.indexOf('='));
        return name === AUTH_COOKIE_NAME || name.startsWith(`${AUTH_COOKIE_NAME}.`) ||
          name.startsWith(`${AUTH_COOKIE_NAME}-`);
      })
      .sort();
    return authCookies.length > 0 ? authCookies.join(';') : null;
  } catch {
    // If cookie access is unavailable, initialize Supabase so valid sessions
    // are never hidden by an optimization hint.
    return undefined;
  }
}

function isAuthCallbackNavigation(): boolean {
  if (typeof window === 'undefined') {return false;}
  if (/\/auth\/callback\/?$/.test(window.location.pathname)) {return true;}
  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error') || params.has('error_description');
}

function isE2ELocalAuthMode(): boolean {
  // Set by scripts/start-playwright-dev.mjs for every Playwright run (dev server).
  // Allows E2E tests to seed a localStorage session even when a real
  // Supabase project is configured in the environment.
  // Never honoured in a production bundle: a stray VITE_E2E_LOCAL_AUTH=true in a
  // deploy environment must not let anyone forge a signed-in UI state.
  if (import.meta.env.PROD) {return false;}
  return import.meta.env.VITE_E2E_LOCAL_AUTH === 'true';
}

function readLocalE2ESession(): WaselUser | null {
  if (typeof window === 'undefined') {return null;}
  // Production builds always authenticate against Supabase.
  if (import.meta.env.PROD) {return null;}
  const storageKey = (import.meta?.env?.VITE_LOCAL_AUTH_STORAGE_KEY) || 'wasel_user_session';
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {return null;}
    return JSON.parse(raw) as WaselUser;
  } catch {
    return null;
  }
}

// eslint-disable-next-line max-lines-per-function -- AuthProvider is a context provider with required auth logic
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [waselUser, setWaselUser] = useState<WaselUser | null>(null);
  const optimisticRef = useRef<Partial<WaselUser> | null>(null);
  // Tracks an in-flight ensure-profile call so signIn()/signUp() and the
  // SIGNED_IN auth event don't both load (and possibly create) the profile.
  const ensureProfileInflightRef = useRef<{ userId: string; promise: Promise<Profile | null> } | null>(null);
  const initializeAuthRef = useRef<((forceSupabase?: boolean) => Promise<void>) | null>(null);

  const loadAndEnsureProfile = useCallback(async (forceCreate = false, authUser?: User | null) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    const activeUser = authUser;
    const authRuntime = await loadAuthRuntime();
    if (!authRuntime.getSupabaseClient()) {
      setProfile(null);
      return null;
    }

    let nextProfile = await authRuntime.loadProfileFromBackend();

    if (!nextProfile && forceCreate) {
      const { firstName, lastName } = getProfileDisplayName(activeUser);
      const phone = String(
        activeUser.user_metadata?.phone ?? activeUser.phone ?? '',
      ).trim();

      try {
        await authRuntime.authAPI.createProfile({
          userId: activeUser.id,
          email: activeUser.email ?? '',
          firstName,
          lastName,
          phone: phone || undefined,
        });
        nextProfile = await authRuntime.loadProfileFromBackend();
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.warn('[Auth] Profile bootstrap skipped:', sanitizeLogMessage(String(error)));
        }
      }
    }

    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const fetchProfile = useCallback(
    (forceCreate = false, authUser?: User | null): Promise<Profile | null> => {
      // Only ensure/create calls are coalesced. Plain refreshes always hit the
      // backend so they can't return data older than a just-finished update.
      if (!forceCreate || !authUser) {
        return loadAndEnsureProfile(forceCreate, authUser);
      }

      const inflight = ensureProfileInflightRef.current;
      if (inflight && inflight.userId === authUser.id) {
        return inflight.promise;
      }

      const promise = loadAndEnsureProfile(true, authUser).finally(() => {
        if (ensureProfileInflightRef.current?.promise === promise) {
          ensureProfileInflightRef.current = null;
        }
      });
      ensureProfileInflightRef.current = { userId: authUser.id, promise };
      return promise;
    },
    [loadAndEnsureProfile],
  );

  useEffect(() => {
    let mounted = true;
    let authInitializationInProgress = false;
    let authSubscriptionReady = false;
    let lastAuthCookieFingerprint = readAuthCookieFingerprint();
    let unsubscribe: (() => void) | undefined;
    let removeAuthMessageListener: (() => void) | undefined;

    const initializeAuth = async (forceSupabase = false) => {
      if (authInitializationInProgress || (forceSupabase && authSubscriptionReady)) {return;}
      authInitializationInProgress = true;
      unsubscribe?.();
      unsubscribe = undefined;
      removeAuthMessageListener?.();
      removeAuthMessageListener = undefined;
      try {
        // In E2E mode the test runner seeds a WaselUser into localStorage.
        // Check this BEFORE attempting Supabase so the demo session is always
        // honoured, even when a real Supabase project is configured.
        if (isE2ELocalAuthMode()) {
          const localSession = readLocalE2ESession();
          if (localSession) {
            const authUser = createLocalAuthUser(localSession);
            const localProfile = createLocalAuthProfile(localSession);
            setUser(authUser);
            setProfile(localProfile);
            setSession(null);
            setIsBackendConnected(false);
            setInitializing(false);
            return;
          }
        }

        const cookieFingerprint = readAuthCookieFingerprint();
        if (!forceSupabase && cookieFingerprint === null && !isAuthCallbackNavigation()) {
          lastAuthCookieFingerprint = null;
          setUser(null);
          setProfile(null);
          setSession(null);
          setIsBackendConnected(false);
          setInitializing(false);
          sessionManager.endSession();
          return;
        }
        if (cookieFingerprint !== undefined) {
          lastAuthCookieFingerprint = cookieFingerprint;
        }

        const authRuntime = await loadAuthRuntime();
        const client = authRuntime.getSupabaseClient();
        if (!mounted) {return;}

        if (!client) {
          const localSession = readLocalE2ESession();
          if (localSession) {
            const authUser = createLocalAuthUser(localSession);
            const localProfile = createLocalAuthProfile(localSession);
            setUser(authUser);
            setProfile(localProfile);
            setSession(null);
            setIsBackendConnected(false);
            setInitializing(false);
            return;
          }
          setUser(null);
          setProfile(null);
          setSession(null);
          setInitializing(false);
          setIsBackendConnected(false);
          return;
        }

        const syncFromSession = (event: string, nextSession: Session | null) => {
          if (!mounted) {return;}

          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setIsBackendConnected(true);

          if (!nextSession?.user) {
            setProfile(null);
            if (mounted) {setInitializing(false);}
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
            if (mounted) {setInitializing(false);}
            return;
          }

          void fetchProfile(shouldEnsureProfile, nextSession.user)
            .catch(error => {
              if (import.meta.env?.DEV) {
                console.warn('[Auth] Profile refresh warning:', sanitizeLogMessage(String(error)));
              }
            })
            .finally(() => {
              if (mounted) {setInitializing(false);}
            });
        };

        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
          syncFromSession(event, nextSession);
        });
        authSubscriptionReady = true;
        unsubscribe = () => subscription.unsubscribe();

        const handleAuthMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {return;}
          if (!event.data || typeof event.data !== 'object') {return;}
          if (event.data.type !== 'wasel-auth-complete') {return;}

          // Verify the one-time nonce to ensure this message came from our
          // own OAuth callback page and not from another same-origin script.
          const expectedNonce = sessionStorage.getItem('wasel_oauth_nonce');
          if (!expectedNonce || event.data.nonce !== expectedNonce) {return;}
          sessionStorage.removeItem('wasel_oauth_nonce');

          try {
            const { data, error } = await client.auth.getSession();
            if (error) {throw error;}
            if (!mounted || !data.session) {return;}

            setSession(data.session);
            setUser(data.session.user);
            await fetchProfile(true, data.session.user);
          } catch (error) {
            if (import.meta.env?.DEV) {
              console.warn('Auth callback sync warning:', sanitizeLogMessage(String(error)));
            }
          } finally {
            if (mounted) {setInitializing(false);}
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
      } finally {
        authInitializationInProgress = false;
      }
    };

    const refreshAuthWhenCookieChanges = () => {
      if (!mounted || authInitializationInProgress) {return;}
      const nextFingerprint = readAuthCookieFingerprint();
      if (nextFingerprint === undefined || nextFingerprint === lastAuthCookieFingerprint) {return;}
      lastAuthCookieFingerprint = nextFingerprint;
      setInitializing(true);
      void initializeAuth();
    };

    initializeAuthRef.current = initializeAuth;
    window.addEventListener('focus', refreshAuthWhenCookieChanges);
    document.addEventListener('visibilitychange', refreshAuthWhenCookieChanges);
    void initializeAuth();

    return () => {
      mounted = false;
      if (initializeAuthRef.current === initializeAuth) {initializeAuthRef.current = null;}
      window.removeEventListener('focus', refreshAuthWhenCookieChanges);
      document.removeEventListener('visibilitychange', refreshAuthWhenCookieChanges);
      removeAuthMessageListener?.();
      unsubscribe?.();
      authSubscriptionReady = false;
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) {
      setWaselUser(null); // eslint-disable-line react-hooks/set-state-in-effect -- derive waselUser from auth state
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
      await initializeAuthRef.current?.(true);
      const authRuntime = await loadAuthRuntime();
      if (!authRuntime.getSupabaseClient()) {
        return { error: new Error('Backend not configured') };
      }

      const { firstName, lastName } = splitFullName(fullName);

      setIsSubmitting(true);
      try {
        const data = await authRuntime.authAPI.signUp({
          email, password,
          firstName,
          lastName,
          phone: phone ?? '',
          returnTo,
        });
        const authUser = data.user ?? data.session?.user ?? null;

        if (authUser && data.session) {
          setSession(data.session);
          setUser(authUser);
          await fetchProfile(true, authUser);
        }

        return {
          error: null,
          requiresEmailConfirmation: !data.session,
          user: authUser,
        };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Signup failed') };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchProfile],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthOperationError }> => {
      setIsSubmitting(true);
      try {
        await initializeAuthRef.current?.(true);
        const authRuntime = await loadAuthRuntime();
        const data = await authRuntime.authAPI.signIn(email, password);
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
        setIsSubmitting(false);
      }
    },
    [fetchProfile],
  );

  const createOAuthSignIn = useCallback(
    (provider: 'google' | 'facebook' | 'microsoft' | 'apple') =>
      async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
        const authRuntime = await loadAuthRuntime();
        const client = authRuntime.getSupabaseClient();
        if (!client) {
          return { error: new Error('Backend not configured') };
        }

        setIsSubmitting(true);
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
        } finally {
          setIsSubmitting(false);
        }
      },
    [],
  );

  const signInWithGoogle = useMemo(() => createOAuthSignIn('google'), [createOAuthSignIn]);
  const signInWithFacebook = useMemo(() => createOAuthSignIn('facebook'), [createOAuthSignIn]);
  const signInWithMicrosoft = useMemo(() => createOAuthSignIn('microsoft'), [createOAuthSignIn]);
  const signInWithApple = useMemo(() => createOAuthSignIn('apple'), [createOAuthSignIn]);

  const signOut = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const authRuntime = await loadAuthRuntime();
      await authRuntime.authAPI.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      sessionManager.endSession();
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Sign out error:', sanitizeLogMessage(String(error)));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<{ error: AuthOperationError }> => {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      setIsSubmitting(true);
      try {
        const authRuntime = await loadAuthRuntime();
        const result = await authRuntime.authAPI.updateProfile(updates);
        if (result.success) {
          setProfile(prev => (prev ? { ...prev, ...updates } : prev));
          fetchProfile(false, user).catch(error => {
            if (import.meta.env?.DEV) {
              console.warn('[Auth] Background profile refresh failed:', sanitizeLogMessage(String(error)));
            }
          });
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
        setIsSubmitting(false);
      }
    },
    [fetchProfile, user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) {return;}
    await fetchProfile(false, user);
  }, [fetchProfile, user]);

  const updateUser = useCallback(
    async (updates: Partial<WaselUser>) => {
      if (!user) {return;}

      const profileUpdates: Partial<Profile> = {};
      if (updates.name !== undefined) {profileUpdates.full_name = updates.name;}
      if (updates.phone !== undefined) {profileUpdates.phone_number = updates.phone;}
      if (updates.balance !== undefined) {profileUpdates.wallet_balance = updates.balance;}
      if (updates.rating !== undefined) {profileUpdates.rating = updates.rating;}
      if (updates.trips !== undefined) {profileUpdates.trip_count = updates.trips;}
      if (updates.verified !== undefined) {profileUpdates.verified = updates.verified;}
      if (updates.verificationLevel !== undefined) {profileUpdates.verification_level = updates.verificationLevel;}
      if (updates.walletStatus !== undefined) {profileUpdates.wallet_status = updates.walletStatus;}
      if (updates.avatar !== undefined) {profileUpdates.avatar_url = updates.avatar;}
      if (updates.emailVerified !== undefined) {profileUpdates.email_verified = updates.emailVerified;}
      if (updates.phoneVerified !== undefined) {profileUpdates.phone_verified = updates.phoneVerified;}
      if (updates.twoFactorEnabled !== undefined) {profileUpdates.two_factor_enabled = updates.twoFactorEnabled;}
      if (updates.driverStatus !== undefined) {profileUpdates.driver_status = updates.driverStatus;}
      if (updates.role !== undefined) {profileUpdates.role = updates.role;}

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
      const authRuntime = await loadAuthRuntime();
      const client = authRuntime.getSupabaseClient();
      if (!client) {return { error: new Error('Backend not configured') };}

      try {
        // `type=recovery` lets the callback page show the new-password form
        // deterministically instead of racing the PASSWORD_RECOVERY event.
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthCallbackUrl(resolveAuthRedirectOrigin(), {
            type: 'recovery',
            ...(returnTo ? { returnTo } : {}),
          }),
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
      const authRuntime = await loadAuthRuntime();
      const client = authRuntime.getSupabaseClient();
      if (!client) {return { error: new Error('Backend not configured') };}

      setIsSubmitting(true);
      try {
        const { error } = await client.auth.updateUser({ password: nextPassword });
        return { error: error ?? null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Password update failed') };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading: initializing,
      isSubmitting,
      isBackendConnected,
      waselUser,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithFacebook,
      signInWithMicrosoft,
      signInWithApple,
      signOut,
      updateProfile,
      updateUser,
      refreshProfile,
      resetPassword,
      changePassword,
    }),
    [
      isSubmitting,
      changePassword,
      initializing,
      isBackendConnected,
      profile,
      refreshProfile,
      resetPassword,
      session,
      signIn,
      signInWithApple,
      signInWithFacebook,
      signInWithGoogle,
      signInWithMicrosoft,
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
