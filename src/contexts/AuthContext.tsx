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
  updating: boolean;
  isBackendConnected: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    returnTo?: string,
    captchaToken?: string,
  ) => Promise<SignUpResult>;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string,
  ) => Promise<{ error: AuthOperationError }>;
  signInWithGoogle: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  signInWithFacebook: (returnTo?: string) => Promise<{ error: AuthOperationError }>;
  startPhoneOtp: (
    phone: string,
    channel: 'sms' | 'whatsapp',
    captchaToken?: string,
  ) => Promise<{ error: AuthOperationError }>;
  verifyPhoneOtp: (
    phone: string,
    token: string,
    returnTo?: string,
    captchaToken?: string,
  ) => Promise<{ error: AuthOperationError }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthOperationError }>;
  refreshProfile: () => Promise<void>;
  resetPassword: (
    email: string,
    returnTo?: string,
    captchaToken?: string,
  ) => Promise<{ error: AuthOperationError }>;
  changePassword: (nextPassword: string) => Promise<{ error: AuthOperationError }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
        await authAPI.createProfile(
          activeUser.id,
          activeUser.email ?? '',
          firstName,
          lastName,
          activeUser.phone ?? String(activeUser.user_metadata?.phone ?? ''),
        );
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

      setTimeout(() => {
        void fetchProfile(shouldEnsureProfile, nextSession.user)
          .catch(error => {
            if (import.meta.env?.DEV) {
              console.warn('[Auth] Profile refresh warning:', sanitizeLogMessage(String(error)));
            }
          })
          .finally(() => {
            if (mounted) {
              setInitializing(false);
            }
          });
      }, 0);
    };

    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      syncFromSession(event, nextSession);
    });

    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'wasel-auth-complete') return;

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
      captchaToken?: string,
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
          captchaToken,
        );
        const authUser = data.session?.user ?? data.user ?? null;
        const hasActiveSession = Boolean(data.session);

        if (authUser && hasActiveSession) {
          await authAPI
            .createProfile(authUser.id, authUser.email ?? email, firstName, lastName, phone ?? '')
            .catch(error => {
              if (import.meta.env?.DEV) {
                console.warn(
                  '[Auth] Profile bootstrap skipped:',
                  sanitizeLogMessage(String(error)),
                );
              }
            });

          await fetchProfile(false, authUser).catch(error => {
            if (import.meta.env?.DEV) {
              console.warn('[Auth] Profile refresh skipped:', sanitizeLogMessage(String(error)));
            }
          });

          setSession(data.session);
          setUser(authUser);
        }

        return {
          error: null,
          requiresEmailConfirmation: !hasActiveSession,
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
    async (
      email: string,
      password: string,
      captchaToken?: string,
    ): Promise<{ error: AuthOperationError }> => {
      setBusy(true);
      try {
        const data = await authAPI.signIn(email, password, captchaToken);
        const authUser = data.user ?? data.session?.user ?? null;

        if (authUser && data.session) {
          setSession(data.session);
          setUser(authUser);
          void fetchProfile(true, authUser).catch(error => {
            if (import.meta.env?.DEV) {
              console.warn('[Auth] Profile bootstrap skipped:', sanitizeLogMessage(String(error)));
            }
          });
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

  const signInWithGoogle = useCallback(
    async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
      if (!supabase) {
        return { error: new Error('Backend not configured') };
      }

      try {
        const result = await signInWithOAuthProvider(supabase, 'google', returnTo);

        if (result.error) {
          // Parse and handle OAuth-specific errors
          const oauthError = parseOAuthError(result.error, 'google');
          if (oauthError && import.meta.env?.DEV) {
            console.error('[OAuth Google]', oauthError);
          }
        }

        return result;
      } catch (error: unknown) {
        if (import.meta.env?.DEV) {
          console.error('[OAuth Google] Unexpected error:', error);
        }
        return { error: normalizeOperationError(error, 'Google sign-in failed') };
      }
    },
    [],
  );

  const signInWithFacebook = useCallback(
    async (returnTo?: string): Promise<{ error: AuthOperationError }> => {
      if (!supabase) {
        return { error: new Error('Backend not configured') };
      }

      try {
        const result = await signInWithOAuthProvider(supabase, 'facebook', returnTo);

        if (result.error) {
          // Parse and handle OAuth-specific errors
          const oauthError = parseOAuthError(result.error, 'facebook');
          if (oauthError && import.meta.env?.DEV) {
            console.error('[OAuth Facebook]', oauthError);
          }
        }

        return result;
      } catch (error: unknown) {
        if (import.meta.env?.DEV) {
          console.error('[OAuth Facebook] Unexpected error:', error);
        }
        return { error: normalizeOperationError(error, 'Facebook sign-in failed') };
      }
    },
    [],
  );

  const startPhoneOtp = useCallback(
    async (
      phone: string,
      channel: 'sms' | 'whatsapp',
      captchaToken?: string,
    ): Promise<{ error: AuthOperationError }> => {
      if (!supabase) {
        return { error: new Error('Backend not configured') };
      }

      setBusy(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            channel,
            shouldCreateUser: true,
            captchaToken,
          },
        });

        return { error: error ?? null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Phone code request failed') };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const verifyPhoneOtp = useCallback(
    async (
      phone: string,
      token: string,
      _returnTo?: string,
      captchaToken?: string,
    ): Promise<{ error: AuthOperationError }> => {
      if (!supabase) {
        return { error: new Error('Backend not configured') };
      }

      setBusy(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: 'sms',
          options: { captchaToken },
        });

        if (error) {
          return { error };
        }

        const authUser = data.user ?? data.session?.user ?? null;
        if (authUser && data.session) {
          setSession(data.session);
          setUser(authUser);
          await fetchProfile(true, authUser);
        }

        return { error: null };
      } catch (error: unknown) {
        return { error: normalizeOperationError(error, 'Phone code verification failed') };
      } finally {
        setBusy(false);
      }
    },
    [fetchProfile],
  );

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
          await fetchProfile(false, user);
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
    async (
      email: string,
      returnTo?: string,
      captchaToken?: string,
    ): Promise<{ error: AuthOperationError }> => {
      if (!supabase) return { error: new Error('Backend not configured') };

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthCallbackUrl(
            window.location.origin,
            returnTo ? { returnTo } : undefined,
          ),
          captchaToken,
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
      loading: initializing,
      updating: busy,
      isBackendConnected,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithFacebook,
      startPhoneOtp,
      verifyPhoneOtp,
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
      startPhoneOtp,
      updateProfile,
      user,
      verifyPhoneOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
