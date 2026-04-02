/**
 * LocalAuth
 *
 * Uses real Supabase auth/session data when configured.
 * Local storage only persists authenticated profile state for the active user.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authAPI } from '../services/auth';
import { initSupabaseListeners, isSupabaseConfigured, supabase } from '../utils/supabase/client';
import { getConfig } from '../utils/env';

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
  backendMode: 'supabase';
}

function computeTrustScore(user: Pick<WaselUser, 'verified' | 'sanadVerified' | 'emailVerified' | 'phoneVerified' | 'trips' | 'rating'>) {
  let score = 45;
  if (user.emailVerified) score += 10;
  if (user.phoneVerified) score += 10;
  if (user.verified || user.sanadVerified) score += 15;
  score += Math.min(user.trips, 50) * 0.4;
  score += Math.max(0, Math.min(user.rating, 5)) * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function mapBackendProfile({
  authUser,
  profile,
}: {
  authUser: any;
  profile: any;
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

function loadUser(): WaselUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WaselUser;
    if (parsed.backendMode !== 'supabase') {
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
  useEffect(() => {
    const cleanup = initSupabaseListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    let mounted = true;

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
          setAndPersist(null);
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
        // Keep any previously stored user if backend sync fails.
      } finally {
        if (mounted) setLoading(false);
      }
    };

    hydrateFromSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;

        if (!session?.user) {
          setAndPersist(null);
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
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const data = await authAPI.signIn(email, password);
        const authUser = (data as any)?.user ?? (data as any)?.session?.user ?? null;

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
    try {
      if (isSupabaseConfigured && supabase) {
        await authAPI.signOut();
      }
    } catch {
      // Continue local sign-out even if backend sign-out fails.
    } finally {
      setUser(null);
      saveUser(null);
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
