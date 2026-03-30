/**
 * LocalAuth
 *
 * Uses real Supabase auth/session data when configured.
 * Falls back to a local demo profile only when demo mode is explicitly enabled.
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
  trustScore: number;
  backendMode: 'supabase' | 'demo';
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

function createDemoUserProfile(input: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  verified: boolean;
  balance: number;
  trips: number;
  rating: number;
}): WaselUser {
  const emailVerified = true;
  const phoneVerified = Boolean(input.phone);
  const sanadVerified = input.verified;
  const verificationLevel = sanadVerified
    ? 'level_3'
    : phoneVerified
      ? 'level_1'
      : 'level_0';

  const baseUser: WaselUser = {
    id: input.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: 'rider',
    balance: input.balance,
    rating: input.rating,
    trips: input.trips,
    verified: input.verified,
    sanadVerified,
    verificationLevel,
    walletStatus: 'active',
    avatar: undefined,
    joinedAt: new Date().toISOString().slice(0, 10),
    emailVerified,
    phoneVerified,
    trustScore: 0,
    backendMode: 'demo',
  };

  return {
    ...baseUser,
    trustScore: computeTrustScore(baseUser),
  };
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
  const emailVerified = Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at || authUser?.user_metadata?.emailVerified);
  const phoneVerified = Boolean(profile?.phone_verified ?? authUser?.phone_confirmed_at ?? phone);
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
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ error: string | null }>;
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
    if (parsed.backendMode === 'demo' && !getConfig().enableDemoAccount) {
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

      // ── Demo mode: accept any non-empty email + password ──────────────
      if (!enableDemoAccount) {
        return { error: 'Backend auth is not configured. Set your environment variables or enable demo mode.' };
      }
      if (!email.trim() || !password) {
        return { error: 'Please enter your email and password.' };
      }
      const demoUser = createDemoUserProfile({
        id: `demo-${btoa(email).slice(0, 12)}`,
        name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        email,
        verified: false,
        balance: 0,
        trips: 0,
        rating: 0,
      });
      setUser(demoUser);
      saveUser(demoUser);
      return { error: null };
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
  ): Promise<{ error: string | null }> => {
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { firstName, lastName } = splitName(name);
        const result = await authAPI.signUp(email, password, firstName, lastName, phone ?? '');
        if (!result) {
          // signUp already completed and auth state listener should hydrate.
        }

        const { data } = await supabase.auth.getSession();
        const authUser = data.session?.user;
        if (!authUser) return { error: null };

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
        return { error: null };
      }

      // ── Demo mode: create a local profile immediately ────────────────
      if (!enableDemoAccount) {
        return { error: 'Backend auth is not configured. Set your environment variables or enable demo mode.' };
      }
      if (!name.trim() || !email.trim() || !password) {
        return { error: 'Please fill in all required fields.' };
      }
      const demoUser = createDemoUserProfile({
        id: `demo-${btoa(email).slice(0, 12)}`,
        name: name.trim(),
        email,
        phone,
        verified: false,
        balance: 0,
        trips: 0,
        rating: 0,
      });
      setUser(demoUser);
      saveUser(demoUser);
      return { error: null };
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
