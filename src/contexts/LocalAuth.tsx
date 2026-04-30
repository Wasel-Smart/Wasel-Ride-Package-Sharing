/**
 * LocalAuth
 *
 * Owns the application's auth session lifecycle.
 * Supabase is the single backend auth source when configured.
 * Local storage is only used for persistence and short-lived fallback UX.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { initSupabaseListeners, isSupabaseConfigured, supabase } from '../utils/supabase/client';
import { getConfig } from '../utils/env';
import { scheduleDeferredTask } from '../utils/runtimeScheduling';
import { omitUndefined } from '../utils/object';
import {
  getLocalAuthUserStorage,
  LOCAL_AUTH_USER_STORAGE_KEY,
} from '../utils/authStorage';

export interface WaselUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'rider' | 'driver' | 'both' | 'admin';
  driverStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'offline' | 'online' | 'busy';
  balance: number;
  rating: number;
  trips: number;
  verified: boolean;
  sanadVerified: boolean;
  verificationLevel: string;
  walletStatus: 'active' | 'limited' | 'frozen';
  avatar?: string;
  joinedAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  trustScore: number;
  backendMode: 'supabase' | 'local';
}

type SignInResult = Awaited<ReturnType<typeof authAPI.signIn>>;
type SignUpResult = Awaited<ReturnType<typeof authAPI.signUp>>;

type BackendAuthUser = User & {
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };
};

type BackendProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  verified?: boolean;
  sanad_verified?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  verification_level?: string;
  wallet_status?: WaselUser['walletStatus'];
  role?: WaselUser['role'];
  driver_status?: WaselUser['driverStatus'];
  wallet_balance?: number;
  balance?: number;
  rating?: number;
  trip_count?: number;
  trips?: number;
  avatar_url?: string;
  created_at?: string;
  two_factor_enabled?: boolean;
};

interface LocalAuthCtx {
  user: WaselUser | null;
  authUser: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<{
    error: string | null;
    requiresEmailConfirmation?: boolean;
    email?: string;
  }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<WaselUser>) => void;
  refreshAuthState: () => Promise<void>;
}

const Ctx = createContext<LocalAuthCtx | null>(null);
const STORAGE_KEY = LOCAL_AUTH_USER_STORAGE_KEY;
const AUTH_BOOTSTRAP_GUARD_MS = 2500;
const PROFILE_SYNC_TIMEOUT_MS = 3000;

function computeTrustScore(
  user: Pick<
    WaselUser,
    'verified' | 'sanadVerified' | 'emailVerified' | 'phoneVerified' | 'trips' | 'rating'
  >,
) {
  let score = 45;
  if (user.emailVerified) score += 10;
  if (user.phoneVerified) score += 10;
  if (user.verified || user.sanadVerified) score += 15;
  score += Math.min(user.trips, 50) * 0.4;
  score += Math.max(0, Math.min(user.rating, 5)) * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeRole(value: unknown): WaselUser['role'] {
  return value === 'driver' || value === 'both' || value === 'admin' ? value : 'rider';
}

function normalizeDriverStatus(value: unknown): WaselUser['driverStatus'] | undefined {
  switch (value) {
    case 'draft':
    case 'pending_approval':
    case 'approved':
    case 'rejected':
    case 'suspended':
    case 'offline':
    case 'online':
    case 'busy':
      return value;
    default:
      return undefined;
  }
}

function normalizeWalletStatus(value: unknown): WaselUser['walletStatus'] {
  return value === 'limited' || value === 'frozen' ? value : 'active';
}

function normalizeVerificationLevel(
  value: unknown,
  phoneVerified: boolean,
  sanadVerified: boolean,
): string {
  if (value === 'level_0' || value === 'level_1' || value === 'level_2' || value === 'level_3') {
    return value;
  }

  if (sanadVerified) return 'level_3';
  if (phoneVerified) return 'level_1';
  return 'level_0';
}

function normalizeStoredUser(raw: unknown): WaselUser | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const email = typeof value.email === 'string' ? value.email.trim() : '';

  if (!id || !email) {
    return null;
  }

  const name =
    typeof value.name === 'string' && value.name.trim()
      ? value.name.trim()
      : email.split('@')[0] || 'Wasel User';
  const phone =
    typeof value.phone === 'string' && value.phone.trim() ? value.phone.trim() : undefined;
  const rating = Number.isFinite(Number(value.rating))
    ? Math.max(0, Math.min(Number(value.rating), 5))
    : 5;
  const trips = Number.isFinite(Number(value.trips))
    ? Math.max(0, Math.floor(Number(value.trips)))
    : 0;
  const verified = Boolean(value.verified ?? value.sanadVerified);
  const sanadVerified = Boolean(value.sanadVerified ?? verified);
  const emailVerified = Boolean(value.emailVerified ?? email);
  const phoneVerified = Boolean(value.phoneVerified ?? phone);

  const normalized: WaselUser = {
    id,
    name,
    email,
    role: normalizeRole(value.role),
    driverStatus: normalizeDriverStatus(value.driverStatus),
    balance: Number.isFinite(Number(value.balance)) ? Number(value.balance) : 0,
    rating,
    trips,
    verified,
    sanadVerified,
    verificationLevel: normalizeVerificationLevel(
      value.verificationLevel,
      phoneVerified,
      sanadVerified,
    ),
    walletStatus: normalizeWalletStatus(value.walletStatus),
    joinedAt:
      typeof value.joinedAt === 'string' && value.joinedAt.trim()
        ? value.joinedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    emailVerified,
    phoneVerified,
    twoFactorEnabled: Boolean(value.twoFactorEnabled),
    trustScore: 0,
    backendMode: value.backendMode === 'local' ? 'local' : 'supabase',
    ...omitUndefined({
      phone,
      avatar:
        typeof value.avatar === 'string' && value.avatar.trim() ? value.avatar.trim() : undefined,
    }),
  };

  return {
    ...normalized,
    trustScore: computeTrustScore(normalized),
  };
}

function mapBackendProfile({
  authUser,
  profile,
}: {
  authUser: BackendAuthUser | null;
  profile: BackendProfile | null;
}): WaselUser {
  const backendId = authUser?.id || profile?.id;
  if (!backendId) {
    throw new Error('Backend auth response did not include a user id.');
  }

  const name =
    profile?.full_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')?.[0] ||
    'Wasel User';
  const phone = profile?.phone_number ?? authUser?.phone ?? undefined;
  const verified = Boolean(profile?.verified ?? profile?.sanad_verified ?? false);
  const sanadVerified = Boolean(profile?.sanad_verified ?? verified);
  const emailVerified = Boolean(
    profile?.email_verified ?? authUser?.email_confirmed_at ?? authUser?.confirmed_at ?? false,
  );
  const phoneVerified = Boolean(
    profile?.phone_verified ?? authUser?.phone_confirmed_at ?? false,
  );
  const verificationLevel =
    profile?.verification_level || (sanadVerified ? 'level_3' : phoneVerified ? 'level_1' : 'level_0');
  const walletStatus = profile?.wallet_status || 'active';
  const role = profile?.role || 'rider';
  const driverStatus = normalizeDriverStatus(profile?.driver_status);

  const baseUser: WaselUser = {
    id: backendId,
    name,
    email: authUser?.email || profile?.email || '',
    role,
    driverStatus,
    balance: Number(profile?.wallet_balance ?? profile?.balance ?? 0),
    rating: Number(profile?.rating ?? 5),
    trips: Number(profile?.trip_count ?? profile?.trips ?? 0),
    verified,
    sanadVerified,
    verificationLevel,
    walletStatus,
    joinedAt: String(profile?.created_at ?? authUser?.created_at ?? new Date().toISOString()).slice(0, 10),
    emailVerified,
    phoneVerified,
    twoFactorEnabled: Boolean(profile?.two_factor_enabled),
    trustScore: 0,
    backendMode: 'supabase',
    ...omitUndefined({
      phone,
      avatar: profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? undefined,
    }),
  };

  return {
    ...baseUser,
    trustScore: computeTrustScore(baseUser),
  };
}

function loadUser(): WaselUser | null {
  const storage = getLocalAuthUserStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeStoredUser(JSON.parse(raw));
    if (!parsed) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveUser(user: WaselUser | null) {
  const storage = getLocalAuthUserStorage();
  if (!storage) {
    return;
  }

  try {
    if (user) {
      storage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      storage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Wasel',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

async function loadProfileWithTimeout(timeoutMs = PROFILE_SYNC_TIMEOUT_MS): Promise<BackendProfile | null> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = await Promise.race([
      authAPI.getProfile(),
      new Promise<{ profile: null }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ profile: null }), timeoutMs);
      }),
    ]);

    return (result?.profile as BackendProfile | null) ?? null;
  } catch {
    return null;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

async function mapAuthenticatedUser(authUser: BackendAuthUser | null): Promise<WaselUser | null> {
  if (!authUser) {
    return null;
  }

  const profile = await loadProfileWithTimeout();

  try {
    return mapBackendProfile({ authUser, profile });
  } catch {
    return mapBackendProfile({ authUser, profile: null });
  }
}

async function getAuthoritativeAuthUser(fallbackUser: BackendAuthUser): Promise<BackendAuthUser> {
  if (!supabase) {
    return fallbackUser;
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return fallbackUser;
    }
    return data.user as BackendAuthUser;
  } catch {
    return fallbackUser;
  }
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WaselUser | null>(loadUser);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { enableLocalAuth } = getConfig();
  const isPublicLanding = typeof window !== 'undefined' && window.location.pathname === '/';
  const mountedRef = useRef(true);
  const syncRunRef = useRef(0);

  useEffect(() => {
    let cleanup: () => void = () => {};
    const cancelDeferredSetup = isPublicLanding
      ? scheduleDeferredTask(() => {
          cleanup = initSupabaseListeners();
        }, 2_000)
      : (() => {
          cleanup = initSupabaseListeners();
          return () => undefined;
        })();

    return () => {
      cancelDeferredSetup();
      cleanup();
    };
  }, [isPublicLanding]);

  const getLocalFallbackUser = useCallback(() => {
    const storedUser = loadUser();
    if (!enableLocalAuth || storedUser?.backendMode !== 'local') {
      return null;
    }
    return storedUser;
  }, [enableLocalAuth]);

  const applyResolvedState = useCallback((nextState: {
    authUser: User | null;
    session: Session | null;
    user: WaselUser | null;
  }) => {
    if (!mountedRef.current) {
      return;
    }

    setAuthUser(nextState.authUser);
    setSession(nextState.session);
    setUser(nextState.user);
    saveUser(nextState.user);
  }, []);

  const syncFromSession = useCallback(
    async (
      nextSession: Session | null,
      options?: {
        allowLocalFallbackWhenMissing?: boolean;
        preferNetworkUser?: boolean;
      },
    ) => {
      const allowLocalFallbackWhenMissing = options?.allowLocalFallbackWhenMissing ?? true;
      const preferNetworkUser = options?.preferNetworkUser ?? true;

      if (!nextSession?.user) {
        applyResolvedState({
          authUser: null,
          session: null,
          user: allowLocalFallbackWhenMissing ? getLocalFallbackUser() : null,
        });
        return;
      }

      const requestId = ++syncRunRef.current;
      const baseAuthUser = nextSession.user as BackendAuthUser;
      const baseMappedUser = mapBackendProfile({ authUser: baseAuthUser, profile: null });

      applyResolvedState({
        authUser: nextSession.user,
        session: nextSession,
        user: baseMappedUser,
      });

      const authoritativeAuthUser = preferNetworkUser
        ? await getAuthoritativeAuthUser(baseAuthUser)
        : baseAuthUser;
      const mappedUser = await mapAuthenticatedUser(authoritativeAuthUser);

      if (!mountedRef.current || requestId !== syncRunRef.current) {
        return;
      }

      applyResolvedState({
        authUser: authoritativeAuthUser,
        session: nextSession,
        user: mappedUser ?? baseMappedUser,
      });
    },
    [applyResolvedState, getLocalFallbackUser],
  );

  const syncFromSupabase = useCallback(
    async (options?: { allowLocalFallbackWhenMissing?: boolean; preferNetworkUser?: boolean }) => {
      if (!isSupabaseConfigured || !supabase) {
        applyResolvedState({
          authUser: null,
          session: null,
          user: getLocalFallbackUser(),
        });
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      await syncFromSession(data.session, options);
    },
    [applyResolvedState, getLocalFallbackUser, syncFromSession],
  );

  useEffect(() => {
    mountedRef.current = true;
    let subscription: { unsubscribe: () => void } | null = null;
    const pendingTimers: ReturnType<typeof setTimeout>[] = [];
    const bootstrapGuard =
      typeof window !== 'undefined'
        ? window.setTimeout(() => {
            if (!mountedRef.current) return;
            setLoading(false);
          }, AUTH_BOOTSTRAP_GUARD_MS)
        : null;

    const completeBootstrap = () => {
      if (bootstrapGuard !== null) {
        window.clearTimeout(bootstrapGuard);
      }
      if (mountedRef.current) {
        setLoading(false);
      }
    };

    const hydrateFromSession = async () => {
      try {
        await syncFromSupabase();
      } catch {
        applyResolvedState({
          authUser: null,
          session: null,
          user: getLocalFallbackUser(),
        });
      } finally {
        completeBootstrap();
      }
    };

    const cancelDeferredHydration = isPublicLanding
      ? scheduleDeferredTask(() => {
          void hydrateFromSession();
        }, 1_200)
      : (() => {
          void hydrateFromSession();
          return () => undefined;
        })();

    if (isSupabaseConfigured && supabase) {
      const authStateListener = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, nextSession: Session | null) => {
          if (!mountedRef.current) {
            return;
          }

          if (!nextSession?.user) {
            applyResolvedState({
              authUser: null,
              session: null,
              user: getLocalFallbackUser(),
            });
            completeBootstrap();
            return;
          }

          applyResolvedState({
            authUser: nextSession.user,
            session: nextSession,
            user: mapBackendProfile({
              authUser: nextSession.user as BackendAuthUser,
              profile: null,
            }),
          });
          completeBootstrap();

          const timer = setTimeout(() => {
            if (!mountedRef.current) {
              return;
            }
            void syncFromSession(nextSession, {
              allowLocalFallbackWhenMissing: false,
              preferNetworkUser: event !== 'INITIAL_SESSION',
            }).finally(() => {
              if (mountedRef.current) {
                setLoading(false);
              }
            });
          }, 0);
          pendingTimers.push(timer);
        },
      );

      subscription = authStateListener.data.subscription;
    }

    return () => {
      mountedRef.current = false;
      cancelDeferredHydration();
      if (bootstrapGuard !== null) {
        window.clearTimeout(bootstrapGuard);
      }
      for (const timer of pendingTimers) {
        clearTimeout(timer);
      }
      subscription?.unsubscribe();
    };
  }, [applyResolvedState, getLocalFallbackUser, isPublicLanding, syncFromSession, syncFromSupabase]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      setLoading(true);

      try {
        if (!isSupabaseConfigured || !supabase) {
          return {
            error:
              'Backend auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
          };
        }

        const data = await authAPI.signIn(email, password);
        const nextSession = (data as SignInResult).session ?? null;
        if (!nextSession?.user) {
          return {
            error: 'Sign-in completed but no authenticated session was established. Please try again.',
          };
        }

        await syncFromSession(nextSession, {
          allowLocalFallbackWhenMissing: false,
          preferNetworkUser: true,
        });

        return { error: null };
      } catch (error) {
        return { error: toMessage(error) };
      } finally {
        setLoading(false);
      }
    },
    [syncFromSession],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      phone?: string,
    ): Promise<{
      error: string | null;
      requiresEmailConfirmation?: boolean;
      email?: string;
    }> => {
      setLoading(true);

      try {
        if (!isSupabaseConfigured || !supabase) {
          return {
            error:
              'Backend auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
          };
        }

        const { firstName, lastName } = splitName(name);
        const data = await authAPI.signUp(email, password, firstName, lastName, phone);
        const nextSession = (data as SignUpResult).session ?? null;

        if (!nextSession?.user) {
          applyResolvedState({
            authUser: null,
            session: null,
            user: getLocalFallbackUser(),
          });
          return {
            error: null,
            requiresEmailConfirmation: true,
            email,
          };
        }

        await syncFromSession(nextSession, {
          allowLocalFallbackWhenMissing: false,
          preferNetworkUser: true,
        });

        return {
          error: null,
          requiresEmailConfirmation: false,
          email,
        };
      } catch (error) {
        return { error: toMessage(error) };
      } finally {
        setLoading(false);
      }
    },
    [applyResolvedState, getLocalFallbackUser, syncFromSession],
  );

  const signOut = useCallback(async () => {
    applyResolvedState({
      authUser: null,
      session: null,
      user: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        await Promise.race([
          authAPI.signOut(),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 1_200);
          }),
        ]);
      }
    } catch {
      // Continue local sign-out even if backend sign-out fails.
    }
  }, [applyResolvedState]);

  const updateUser = useCallback((updates: Partial<WaselUser>) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      const nextUser = {
        ...previousUser,
        ...updates,
      };

      nextUser.trustScore = computeTrustScore({
        verified: nextUser.verified,
        sanadVerified: nextUser.sanadVerified,
        emailVerified: nextUser.emailVerified,
        phoneVerified: nextUser.phoneVerified,
        trips: nextUser.trips,
        rating: nextUser.rating,
      });

      saveUser(nextUser);
      return nextUser;
    });
  }, []);

  const refreshAuthState = useCallback(async () => {
    setLoading(true);
    try {
      await syncFromSupabase({
        allowLocalFallbackWhenMissing: true,
        preferNetworkUser: true,
      });
    } finally {
      setLoading(false);
    }
  }, [syncFromSupabase]);

  const value = useMemo(
    () => ({
      user,
      authUser,
      session,
      loading,
      signIn,
      register,
      signOut,
      updateUser,
      refreshAuthState,
    }),
    [authUser, loading, refreshAuthState, register, session, signIn, signOut, updateUser, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocalAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocalAuth must be inside LocalAuthProvider');
  return ctx;
}
