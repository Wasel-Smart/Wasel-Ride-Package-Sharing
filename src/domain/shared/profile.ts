import { deriveAccountTrustScore } from '../trust/score';

export type WaselUserRole = 'passenger' | 'driver' | 'both' | 'admin';
export type WaselVerificationLevel = 'level_0' | 'level_1' | 'level_2' | 'level_3';
export type WaselWalletStatus = 'active' | 'limited' | 'frozen' | 'closed';
export type WaselBackendMode = 'supabase' | 'demo';

export interface WaselUserProfile {
  id: string;
  name: string;
  email: string;
  role: WaselUserRole;
  verified: boolean;
  rating: number;
  trips: number;
  balance: number;
  phone?: string;
  avatar?: string;
  joinedAt?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  sanadVerified: boolean;
  verificationLevel: WaselVerificationLevel;
  trustScore: number;
  walletStatus: WaselWalletStatus;
  backendMode: WaselBackendMode;
}

type DemoProfileInput = {
  id: string;
  name: string;
  email: string;
  role?: WaselUserRole;
  verified?: boolean;
  rating?: number;
  trips?: number;
  balance?: number;
  phone?: string;
  avatar?: string;
  joinedAt?: string;
};

type PartialProfileSource = Partial<{
  full_name: string;
  fullName: string;
  name: string;
  phone: string;
  phone_number: string;
  role: string;
  verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  sanad_verified: boolean;
  verification_level: string;
  rating: number;
  trips: number;
  trip_count: number;
  wallet_balance: number;
  balance: number;
  wallet_status: string;
  created_at: string;
  joined_at: string;
  avatar_url: string;
  two_factor_enabled: boolean;
}>;

function toRole(value: unknown): WaselUserRole {
  if (value === 'driver' || value === 'admin' || value === 'both') {return value;}
  return 'passenger';
}

export function deriveVerificationLevel(input: {
  phoneVerified?: boolean;
  role?: WaselUserRole;
  verified?: boolean;
}): WaselVerificationLevel {
  if (input.role === 'driver' || input.role === 'both') {return 'level_3';}
  if (input.verified) {return 'level_2';}
  if (input.phoneVerified) {return 'level_1';}
  return 'level_0';
}

export function deriveTrustScore(input: {
  verificationLevel: WaselVerificationLevel;
  rating?: number;
  trips?: number;
}): number {
  return deriveAccountTrustScore({
    phoneVerified: input.verificationLevel !== 'level_0',
    emailVerified: input.verificationLevel === 'level_2' || input.verificationLevel === 'level_3',
    rating: input.rating,
    trips: input.trips,
  });
}

export function createDemoUserProfile(input: DemoProfileInput): WaselUserProfile {
  const role = input.role ?? 'passenger';
  const phoneVerified = Boolean(input.phone);
  const emailVerified = Boolean(input.email);
  const verified = Boolean(input.verified);
  const verificationLevel = deriveVerificationLevel({ phoneVerified, role, verified });
  const rating = input.rating ?? 4.8;
  const trips = input.trips ?? 0;

  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role,
    verified,
    rating,
    trips,
    balance: input.balance ?? 0,
    phone: input.phone,
    avatar: input.avatar,
    joinedAt: input.joinedAt ?? new Date().toISOString().slice(0, 10),
    phoneVerified,
    emailVerified,
    sanadVerified: false,
    verificationLevel,
    trustScore: deriveTrustScore({ verificationLevel, rating, trips }),
    walletStatus: 'active',
    backendMode: 'demo',
  };
}

export function mapBackendProfile(args: {
  authUser: {
    id: string;
    email?: string;
    phone?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    email_confirmed_at?: string | null;
    phone_confirmed_at?: string | null;
  };
  profile?: PartialProfileSource | null;
}): WaselUserProfile {
  const { authUser, profile } = args;
  const metadata = authUser.user_metadata ?? {};
  const role = toRole(profile?.role ?? metadata.role);
  const phone = profile?.phone_number ?? profile?.phone ?? authUser.phone ?? undefined;
  const rating = typeof profile?.rating === 'number' ? profile.rating : 4.7;
  const trips = resolveTripCount(profile);
  const verified = Boolean(profile?.verified);
  const phoneVerified = Boolean(profile?.phone_verified ?? authUser.phone_confirmed_at ?? false);
  const emailVerified = Boolean(profile?.email_verified ?? authUser.email_confirmed_at ?? false);
  const verificationLevel = resolveVerificationLevel(profile, phoneVerified, role, verified);

  return {
    id: authUser.id,
    name: resolveName(profile, metadata, authUser),
    email: authUser.email ?? '',
    role,
    verified: verified || verificationLevel === 'level_2' || verificationLevel === 'level_3',
    rating,
    trips,
    balance: resolveBalance(profile),
    phone,
    avatar: typeof profile?.avatar_url === 'string' ? profile.avatar_url : undefined,
    joinedAt: profile?.created_at ?? profile?.joined_at ?? authUser.created_at?.slice(0, 10),
    phoneVerified,
    emailVerified,
    sanadVerified: false,
    verificationLevel,
    trustScore: deriveTrustScore({ verificationLevel, rating, trips }),
    walletStatus: resolveWalletStatus(profile),
    backendMode: 'supabase',
  };
}

function resolveTripCount(profile?: PartialProfileSource | null): number {
  if (typeof profile?.trip_count === 'number') {return profile.trip_count;}
  if (typeof profile?.trips === 'number') {return profile.trips;}
  return 0;
}

function resolveVerificationLevel(
  profile: PartialProfileSource | null | undefined,
  phoneVerified: boolean,
  role: WaselUserRole,
  verified: boolean,
): WaselVerificationLevel {
  const raw = profile?.verification_level;
  if (raw === 'level_0' || raw === 'level_1' || raw === 'level_2' || raw === 'level_3') {
    return raw;
  }
  return deriveVerificationLevel({ phoneVerified, role, verified });
}

function resolveName(
  profile: PartialProfileSource | null | undefined,
  metadata: Record<string, unknown>,
  authUser: { email?: string },
): string {
  return String(
    profile?.full_name ??
      profile?.fullName ??
      profile?.name ??
      metadata.full_name ??
      metadata.name ??
      authUser.email?.split('@')[0] ??
      'Wasel User',
  );
}

function resolveBalance(profile?: PartialProfileSource | null): number {
  if (typeof profile?.wallet_balance === 'number') {return profile.wallet_balance;}
  if (typeof profile?.balance === 'number') {return profile.balance;}
  return 0;
}

function resolveWalletStatus(profile?: PartialProfileSource | null): WaselWalletStatus {
  const status = profile?.wallet_status;
  if (status === 'limited' || status === 'frozen' || status === 'closed') {return status;}
  return 'active';
}
