/* eslint-disable react-refresh/only-export-components */
/**
 * LocalAuth
 *
 * Uses real Supabase auth/session data when configured.
 * Local storage persists authenticated profile state for the active user and
 * supports explicit demo-mode sessions for verification environments.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { initSupabaseListeners, isSupabaseConfigured, supabase } from '../utils/supabase/client';
import { getConfig } from '../utils/env';
import { scheduleDeferredTask } from '../utils/runtimeScheduling';

export interface WaselUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'rider' | 'driver' | 'both';
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
  backendMode: 'supabase' | 'demo';
}

type SignInResult = Awaited<ReturnType<typeof authAPI.signIn>>;

type BackendAuthUser = {
  id?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
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
  wallet_balance?: number;
  balance?: number;
  rating?: number;
  trip_count?: number;
  trips?: number;
  avatar_url?: string;
  created_at?: string;
  two_factor_enabled?: boolean;
};

function computeTrustScore(user: Pick<WaselUser, 'verified' | 'sanadVerified' | 'emailVerified' | 'phoneVerified' | 'trips' | 'rating'>) {
  let score = 45;
  if (user.emailVerified) score += 10;
  if (user.phoneVerified) score += 10;
  if (user.verified || user.sanadVerified) score += 15;
  score += Math.min(user.trips, 50) * 0.4;
  score += Math.max(0, Math.min(user.rating, 5)) * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeRole(value: unknown): WaselUser['role'] {
  return value === 'driver' || value === 'both' ? value : 'rider';
}

function normalizeWalletStatus(value: unknown): WaselUser['walletStatus'] {
  return value === 'limited' || value === 'frozen' ? value : 'active';
}

function normalizeVerificationLevel(value: unknown, phoneVerified: boolean, sanadVerified: boolean): string {
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
    typeof value.phone === 'string' && value.phone.trim()
      ? value.phone.trim()
      : undefined;
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
    phone,
    role: normalizeRole(value.role),
    balance: Number.isFinite(Number(value.balance)) ? Number(value.balance) : 0,
    rating,
    trips,
    verified,
    sanadVerified,
    verificationLevel: normalizeVerificationLevel(value.verificationLevel, phoneVerified, sanadVerified),
    walletStatus: normalizeWalletStatus(value.walletStatus),
    avatar:
      typeof value.avatar === 'string' && value.avatar.trim()
        ? value.avatar.trim()
        : undefined,
    joinedAt:
      typeof value.joinedAt === 'string' && value.joinedAt.trim()
        ? value.joinedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    emailVerified,
    phoneVerified,
    twoFactorEnabled: Boolean(value.twoFactorEnabled),
    trustScore: 0,
    backendMode: value.backendMode === 'demo' ? 'demo' : 'supabase',
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
  const name =
    profile?.full_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')?.[0] ||
    'Wasel User';
  const phone = profile?.phone_number ?? authUser?.phone ?? undefined;
  const verified = Boolean(profile?.verified ?? profile?.sanad_verified ?? false);
  const sanadVerified = Boolean(profile?.sanad_verified ?? verified);
  const emailVerified = Boolean(profile?.email_verified ?? authUser?.email_confirmed_at ?? authUser?.confirmed_at ?? false);
  const phoneVerified = Boolean(profile?.phone_verified ?? authUser?.phone_confirmed_at ?? false);
  const verificationLevel = profile?.verification_level || (sanadVerified ? 'level_3' : phoneVerified ? 'level_1' : 'level_0');
  const walletStatus = profile?.wallet_status || 'active';
  const role = profile?.role || 'rider';

  const baseUser: WaselUser = {
    id: authUser?.id || profile?.id || `user-${Date.now()}`,
    name,
    email: authUser?.email || profile?.email || '',
    phone,
    role,
    balance: Number(profile?.wallet_balance ?? profile?.balance ?? 0),
    rating: Number(profile?.rating ?? 5),
    trips: Number(profile?.trip_count ?? profile?.trips ?? 0),
    verified,
    sanadVerified,
    verificationLevel,
    walletStatus,
    avatar: profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? undefined,
    joinedAt: String(profile?.created_at ?? authUser?.created_at ?? new Date().toISOString()).slice(0, 10),
    emailVerified,
    phoneVerified,
    twoFactorEnabled: Boolean(profile?.two_factor_enabled),
    trustScore: 0,
    backendMode: 'supabase',
  };

  return {
    ...baseUser,
    trustScore: computeTrustScore(baseUser),
  };
}

interface LocalAuthCtx {
  user: WaselUser | null;
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
}

const Ctx = createContext<LocalAuthCtx | null>(null);
const STORAGE_KEY = 'wasel_local_user_v2';
const AUTH_BOOTSTRAP_GUARD_MS = 2500;

function loadUser(): WaselUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeStoredUser(JSON.parse(raw));
    if (!parsed) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveUser(user: WaselUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
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

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WaselUser | null>(loadUser);
  const [loading, setLoading] = useState(true);
  const { enableDemoAccount } = getConfig();
  const isPublicLanding =
    typeof window !== 'undefined' && window.location.pathname === '/';

  useEffect(() => {
    let cleanup: () => void = () => {};
    const cancelDeferredSetup = isPublicLanding
      ? scheduleDeferredTask(() => {
          cleanup = initSupabaseListeners();
        }, 2_000)
      : (((): (() => void) => {
          cleanup = initSupabaseListeners();
          return () => {};
        })());

    return () => {
      cancelDeferredSetup();
      cleanup();
    };
  }, [isPublicLanding]);

  useEffect(() => {
    let mounted = true;
    const bootstrapGuard =
      typeof window !== 'undefined'
        ? window.setTimeout(() => {
            if (!mounted) return;
            setLoading(false);
            if (import.meta.env?.DEV && !import.meta.env?.TEST) {
              console.warn('[LocalAuth] Auth bootstrap timed out; continuing with cached access state.');
            }
          }, AUTH_BOOTSTRAP_GUARD_MS)
        : null;
    const getPersistedDemoUser = () => {
      const storedUser = loadUser();
      if (!enableDemoAccount || storedUser?.backendMode !== 'demo') {
        return null;
      }
      return storedUser;
    };

    const setAndPersist = (next: WaselUser | null) => {
      if (!mounted) return;
      setUser(next);
      saveUser(next);
    };

    const hydrateFromSession = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session?.user) {
          setAndPersist(getPersistedDemoUser());
          setLoading(false);
          return;
        }

        const profileResult = await authAPI.getProfile().catch(() => ({ profile: null }));
        const mapped = mapBackendProfile({
          authUser: data.session.user,
          profile: profileResult?.profile ?? null,
        });
        setAndPersist(mapped);
      } catch {
        const demoUser = getPersistedDemoUser();
        if (demoUser) {
          setAndPersist(demoUser);
        }
        // Keep any previously stored user if backend sync fails.
      } finally {
        if (bootstrapGuard !== null) {
          window.clearTimeout(bootstrapGuard);
        }
        if (mounted) setLoading(false);
      }
    };

    const cancelDeferredHydration = isPublicLanding
      ? scheduleDeferredTask(() => {
          void hydrateFromSession();
        }, 1_200)
      : (((): (() => void) => {
          void hydrateFromSession();
          return () => {};
        })());

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        if (!session?.user) {
          setAndPersist(getPersistedDemoUser());
          return;
        }

        try {
          const profileResult = await authAPI.getProfile().catch(() => ({ profile: null }));
          const mapped = mapBackendProfile({
            authUser: session.user,
            profile: profileResult?.profile ?? null,
          });
          setAndPersist(mapped);
        } catch {
          const fallbackUser = mapBackendProfile({ authUser: session.user, profile: null });
          setAndPersist(fallbackUser);
        }
      });

      return () => {
        mounted = false;
        cancelDeferredHydration();
        if (bootstrapGuard !== null) {
          window.clearTimeout(bootstrapGuard);
        }
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
      cancelDeferredHydration();
      if (bootstrapGuard !== null) {
        window.clearTimeout(bootstrapGuard);
      }
    };
  }, [enableDemoAccount, isPublicLanding]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const data = await authAPI.signIn(email, password);
        const authUser = (data as SignInResult).user ?? (data as SignInResult).session?.user ?? null;

        if (authUser) {
          const profileResult = await authAPI.getProfile().catch(() => ({ profile: null }));
          const mapped = mapBackendProfile({
            authUser,
            profile: profileResult?.profile ?? null,
          });
          setUser(mapped);
          saveUser(mapped);
        }
        return { error: null };
      }

      return { error: 'Backend auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    } catch (error) {
      return { error: toMessage(error) };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
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
      if (isSupabaseConfigured && supabase) {
        const { firstName, lastName } = splitName(name);
        await authAPI.signUp(email, password, firstName, lastName, phone ?? '');

        let authUser: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const { data } = await supabase.auth.getSession();
          authUser = data.session?.user ?? null;
          if (authUser) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (!authUser) {
          return {
            error: null,
            requiresEmailConfirmation: true,
            email,
          };
        }

        const profileResult = await authAPI.getProfile().catch(() => ({ profile: null }));
        const mapped = mapBackendProfile({
          authUser,
          profile: profileResult?.profile ?? {
            full_name: name,
            phone_number: phone,
            verification_level: phone ? 'level_1' : 'level_0',
          },
        });
        setUser(mapped);
        saveUser(mapped);
        return { error: null, requiresEmailConfirmation: false, email };
      }

      return {
        error: 'Backend auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    } catch (error) {
      return { error: toMessage(error) };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    saveUser(null);

    try {
      if (isSupabaseConfigured && supabase) {
        await Promise.race([
          authAPI.signOut(),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 1200);
          }),
        ]);
      }
    } catch {
      // Continue local sign-out even if backend sign-out fails.
    }
  };

  const updateUser = (updates: Partial<WaselUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      next.trustScore = computeTrustScore({
        verified: next.verified,
        sanadVerified: next.sanadVerified,
        emailVerified: next.emailVerified,
        phoneVerified: next.phoneVerified,
        trips: next.trips,
        rating: next.rating,
      });
      saveUser(next);
      return next;
    });
  };

  return (
    <Ctx.Provider value={{ user, loading, signIn, register, signOut, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocalAuth must be inside LocalAuthProvider');
  return ctx;
}
