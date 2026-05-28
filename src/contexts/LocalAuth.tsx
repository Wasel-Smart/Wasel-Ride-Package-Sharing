import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
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

interface LocalAuthCtx {
  user: WaselUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
    returnTo?: string
  ) => Promise<{
    error: string | null;
    requiresEmailConfirmation?: boolean;
    email?: string;
  }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<WaselUser>) => void;
}

const LocalAuthContext =
  createContext<LocalAuthCtx | null>(null);

function computeTrustScore(
  user: Pick<
    WaselUser,
    | 'verified'
    | 'sanadVerified'
    | 'emailVerified'
    | 'phoneVerified'
    | 'trips'
    | 'rating'
  >
): number {
  let score = 45;

  if (user.emailVerified) score += 10;
  if (user.phoneVerified) score += 10;
  if (user.verified || user.sanadVerified)
    score += 15;

  score += Math.min(user.trips, 50) * 0.4;
  score += Math.min(
    Math.max(user.rating, 0),
    5
  ) * 2;

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
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
  const role =
    profile?.role === 'driver' ||
    profile?.role === 'both'
      ? profile.role
      : 'rider';

  const verified = Boolean(
    profile?.verified ??
      profile?.sanad_verified
  );

  const sanadVerified = Boolean(
    profile?.sanad_verified ??
      verified
  );

  const emailVerified = Boolean(
    profile?.email_verified ??
      authUser.email_confirmed_at
  );

  const phoneVerified = Boolean(
    profile?.phone_verified ??
      authUser.phone_confirmed_at
  );

  const verificationLevel =
    profile?.verification_level ??
    (sanadVerified
      ? role !== 'rider'
        ? 'level_3'
        : 'level_2'
      : phoneVerified
      ? 'level_1'
      : 'level_0');

  const walletStatus:
    WaselUser['walletStatus'] =
    profile?.wallet_status ===
      'limited' ||
    profile?.wallet_status ===
      'frozen' ||
    profile?.wallet_status ===
      'closed'
      ? profile.wallet_status
      : 'active';

  const baseUser: WaselUser = {
    id: authUser.id,
    name:
      profile?.full_name ||
      authUser.user_metadata
        ?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'Wasel User',

    email:
      authUser.email ??
      profile?.email ??
      '',

    phone:
      profile?.phone_number ??
      authUser.phone ??
      undefined,

    role,
    balance: Number(
      profile?.wallet_balance ?? 0
    ),
    rating: Number(
      profile?.rating ?? 5
    ),
    trips: Number(
      profile?.trip_count ?? 0
    ),
    verified,
    sanadVerified,
    verificationLevel,
    walletStatus,

    avatar:
      profile?.avatar_url ??
      authUser.user_metadata
        ?.avatar_url,

    joinedAt: String(
      authUser.created_at ??
        new Date().toISOString()
    ).slice(0, 10),

    emailVerified,
    phoneVerified,

    twoFactorEnabled: Boolean(
      profile?.two_factor_enabled
    ),

    trustScore: 0,
    backendMode: 'supabase',
  };

  return {
    ...baseUser,
    trustScore:
      computeTrustScore(baseUser),
  };
}

function toMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong';
}

export function LocalAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const auth = useAuth();

  const [user, setUser] =
    useState<WaselUser | null>(
      null
    );

  useEffect(() => {
    if (auth.loading) return;

    try {
      if (!auth.user) {
        setUser(null);
        return;
      }

      setUser(
        mapBackendProfile({
          authUser: auth.user,
          profile: auth.profile,
        })
      );
    } catch (error) {
      console.error(
        '[LocalAuth] Failed to map user',
        error
      );

      setUser(null);
    }
  }, [
    auth.loading,
    auth.user,
    auth.profile,
  ]);

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ) => {
      const result =
        await auth.signIn(
          email,
          password
        );

      return {
        error: result.error
          ? toMessage(
              result.error
            )
          : null,
      };
    },
    [auth]
  );

  const register =
    useCallback(
      async (
        name: string,
        email: string,
        password: string,
        phone?: string,
        returnTo?: string
      ) => {
        const result =
          await auth.signUp(
            email,
            password,
            name,
            phone,
            returnTo
          );

        return {
          error: result.error
            ? toMessage(
                result.error
              )
            : null,
          requiresEmailConfirmation:
            result.requiresEmailConfirmation,
          email,
        };
      },
      [auth]
    );

  const signOut =
    useCallback(async () => {
      try {
        await auth.signOut();
      } finally {
        setUser(null);
      }
    }, [auth]);

  const updateUser =
    useCallback(
      (
        updates: Partial<WaselUser>
      ) => {
        setUser(previous => {
          if (!previous)
            return previous;

          const next = {
            ...previous,
            ...updates,
          };

          next.trustScore =
            computeTrustScore(
              next
            );

          return next;
        });
      },
      []
    );

  const value = useMemo(
    () => ({
      user,
      loading: auth.loading,
      isAuthenticated:
        !!user,
      signIn,
      register,
      signOut,
      updateUser,
    }),
    [
      user,
      auth.loading,
      signIn,
      register,
      signOut,
      updateUser,
    ]
  );

  return (
    <LocalAuthContext.Provider
      value={value}
    >
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const context =
    useContext(
      LocalAuthContext
    );

  if (!context) {
    throw new Error(
      'useLocalAuth must be used inside LocalAuthProvider'
    );
  }

  return context;
}