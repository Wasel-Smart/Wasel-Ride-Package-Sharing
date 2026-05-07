/**
 * LocalAuth
 *
 * Thin Wasel-specific adapter on top of the canonical Supabase AuthContext.
 * It preserves the existing `useLocalAuth()` API that the app uses widely,
 * but no longer owns a second auth/session subscription.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from './authContextHelpers';
import { useAuth } from './AuthContext';

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
  walletStatus: 'active' | 'limited' | 'frozen' | 'closed';
  avatar?: string;
  joinedAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  trustScore: number;
  backendMode: 'supabase';
}

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

function mapBackendProfile({
  authUser,
  profile,
}: {
  authUser: Pick<
    User,
    | 'id'
    | 'email'
    | 'phone'
    | 'created_at'
    | 'email_confirmed_at'
    | 'phone_confirmed_at'
    | 'user_metadata'
  >;
  profile: Profile | null;
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
  const emailVerified = Boolean(profile?.email_verified ?? authUser?.email_confirmed_at ?? false);
  const phoneVerified = Boolean(profile?.phone_verified ?? authUser?.phone_confirmed_at ?? false);
  const role = profile?.role === 'driver' || profile?.role === 'both' ? profile.role : 'rider';
  const verificationLevel =
    profile?.verification_level ||
    (sanadVerified
      ? role === 'driver' || role === 'both'
        ? 'level_3'
        : 'level_2'
      : phoneVerified
        ? 'level_1'
        : 'level_0');
  const walletStatus: WaselUser['walletStatus'] =
    profile?.wallet_status === 'limited' ||
    profile?.wallet_status === 'frozen' ||
    profile?.wallet_status === 'closed'
      ? profile.wallet_status
      : 'active';

  const baseUser: WaselUser = {
    id: authUser?.id || `user-${Date.now()}`,
    name,
    email: authUser?.email || profile?.email || '',
    phone,
    role,
    balance: Number(profile?.wallet_balance ?? 0),
    rating: Number(profile?.rating ?? 5),
    trips: Number(profile?.trip_count ?? 0),
    verified,
    sanadVerified,
    verificationLevel,
    walletStatus,
    avatar: profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? undefined,
    joinedAt: String(authUser?.created_at ?? new Date().toISOString()).slice(0, 10),
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

function applyUserUpdates(user: WaselUser, updates: Partial<WaselUser>): WaselUser {
  const next = { ...user, ...updates };
  next.trustScore = computeTrustScore({
    verified: next.verified,
    sanadVerified: next.sanadVerified,
    emailVerified: next.emailVerified,
    phoneVerified: next.phoneVerified,
    trips: next.trips,
    rating: next.rating,
  });
  return next;
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
    returnTo?: string,
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
const LOCAL_ACCOUNTS_KEY = 'wasel_local_accounts_v1';

type LocalStoredAccount = {
  email: string;
  password: string;
  user: WaselUser;
};

function isLocalE2EAuthEnabled() {
  return (import.meta.env.VITE_E2E_LOCAL_AUTH as string | undefined) === 'true';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createLocalUser(name: string, email: string, phone?: string): WaselUser {
  const now = new Date();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}`;

  return {
    id,
    name: name.trim() || email.split('@')[0] || 'Wasel User',
    email: normalizeEmail(email),
    phone: phone?.trim() || undefined,
    role: 'rider',
    balance: 0,
    rating: 5,
    trips: 0,
    verified: false,
    sanadVerified: false,
    verificationLevel: 'level_0',
    walletStatus: 'active',
    joinedAt: now.toISOString().slice(0, 10),
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    trustScore: 55,
    backendMode: 'supabase',
  };
}

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

function loadLocalAccounts(): LocalStoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalStoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalStoredAccount[]) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage errors.
  }
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WaselUser | null>(loadUser);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Partial<WaselUser> | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) {
      return;
    }

    if (!auth.user) {
      if (isLocalE2EAuthEnabled() || !auth.isBackendConnected) {
        const storedUser = loadUser();
        setUser(storedUser);
        return;
      }

      setUser(null);
      setOptimisticUpdates(null);
      saveUser(null);
      return;
    }

    const mapped = mapBackendProfile({
      authUser: auth.user,
      profile: auth.profile,
    });
    const nextUser = optimisticUpdates ? applyUserUpdates(mapped, optimisticUpdates) : mapped;
    setUser(nextUser);
    saveUser(nextUser);
  }, [auth.isBackendConnected, auth.loading, auth.profile, auth.user, optimisticUpdates]);

  const authUserId = auth.user?.id;

  useEffect(() => {
    if (!authUserId) {
      setOptimisticUpdates(null);
    }
  }, [authUserId]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (isLocalE2EAuthEnabled()) {
      setLocalLoading(true);
      try {
        const account = loadLocalAccounts().find(
          entry => normalizeEmail(entry.email) === normalizeEmail(email),
        );

        if (!account || account.password !== password) {
          return { error: 'Incorrect email or password.' };
        }

        setUser(account.user);
        saveUser(account.user);
        return { error: null };
      } finally {
        setLocalLoading(false);
      }
    }

    const result = await auth.signIn(email, password);
    return { error: result.error ? toMessage(result.error) : null };
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    returnTo?: string,
  ): Promise<{
    error: string | null;
    requiresEmailConfirmation?: boolean;
    email?: string;
  }> => {
    if (isLocalE2EAuthEnabled()) {
      setLocalLoading(true);
      try {
        const normalizedEmail = normalizeEmail(email);
        const accounts = loadLocalAccounts();

        if (accounts.some(account => normalizeEmail(account.email) === normalizedEmail)) {
          return {
            error: 'This email is already registered.',
            requiresEmailConfirmation: false,
            email: normalizedEmail,
          };
        }

        const localUser = createLocalUser(name, normalizedEmail, phone);
        accounts.push({
          email: normalizedEmail,
          password,
          user: localUser,
        });

        saveLocalAccounts(accounts);
        saveUser(localUser);
        setUser(localUser);
        setOptimisticUpdates(null);

        return {
          error: null,
          requiresEmailConfirmation: false,
          email: normalizedEmail,
        };
      } finally {
        setLocalLoading(false);
      }
    }

    const result = await auth.signUp(email, password, name, phone, returnTo);
    return {
      error: result.error ? toMessage(result.error) : null,
      requiresEmailConfirmation: result.requiresEmailConfirmation,
      email,
    };
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } finally {
      setUser(null);
      setOptimisticUpdates(null);
      saveUser(null);
    }
  };

  const updateUser = (updates: Partial<WaselUser>) => {
    setOptimisticUpdates(previous => ({ ...(previous ?? {}), ...updates }));
    setUser(previous => {
      if (!previous) return previous;
      const next = applyUserUpdates(previous, updates);
      if (isLocalE2EAuthEnabled()) {
        const accounts = loadLocalAccounts();
        const nextAccounts = accounts.map(account =>
          account.user.id === next.id ? { ...account, user: next } : account,
        );
        saveLocalAccounts(nextAccounts);
      }
      saveUser(next);
      return next;
    });
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading: auth.loading || localLoading,
        signIn,
        register,
        signOut,
        updateUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocalAuth must be inside LocalAuthProvider');
  return ctx;
}
