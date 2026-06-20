export type UserRole = 'passenger' | 'driver' | 'admin' | string;
export type VerificationLevel = 'level_0' | 'level_1' | 'level_2' | 'level_3';

export interface TrustProfileInput {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  role?: UserRole | null;
  verified?: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  sanadVerified?: boolean;
  verificationLevel?: VerificationLevel;
  rating?: number;
  trips?: number;
  balance?: number;
}

export interface RuntimeTrustProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  backendMode: 'demo' | 'supabase';
  phoneVerified: boolean;
  emailVerified: boolean;
  sanadVerified: boolean;
  verificationLevel: VerificationLevel;
  trustScore: number;
  walletStatus: 'active' | 'inactive';
  balance: number;
  trips: number;
  rating: number;
}

export function deriveVerificationLevel(input: TrustProfileInput): VerificationLevel {
  if (input.verificationLevel) return input.verificationLevel;
  if (input.sanadVerified && input.role === 'driver') return 'level_3';
  if (input.sanadVerified || input.verified) return 'level_2';
  if (input.phoneVerified || input.emailVerified) return 'level_1';
  return 'level_0';
}

export function deriveTrustScore(input: TrustProfileInput): number {
  const level = deriveVerificationLevel(input);
  const levelScore: Record<VerificationLevel, number> = {
    level_0: 15,
    level_1: 35,
    level_2: 62,
    level_3: 78,
  };
  const rating = Math.max(0, Math.min(5, input.rating ?? 0));
  const trips = Math.max(0, input.trips ?? 0);
  const ratingBoost = rating ? Math.round((rating / 5) * 12) : 0;
  const tripBoost = Math.min(9, Math.floor(trips / 10));
  return Math.max(0, Math.min(99, levelScore[level] + ratingBoost + tripBoost));
}

export function createDemoUserProfile(input: TrustProfileInput): RuntimeTrustProfile {
  const verificationLevel = deriveVerificationLevel({
    ...input,
    sanadVerified: input.sanadVerified ?? input.verified ?? false,
    emailVerified: input.emailVerified ?? Boolean(input.email),
    phoneVerified: input.phoneVerified ?? Boolean(input.phone),
  });
  const profileInput = { ...input, verificationLevel };

  return {
    id: input.id ?? 'demo-user',
    name: input.name ?? 'Demo User',
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
    role: input.role ?? 'passenger',
    backendMode: 'demo',
    phoneVerified: input.phoneVerified ?? Boolean(input.phone),
    emailVerified: input.emailVerified ?? Boolean(input.email),
    sanadVerified: input.sanadVerified ?? input.verified ?? false,
    verificationLevel,
    trustScore: deriveTrustScore(profileInput),
    walletStatus: 'active',
    balance: input.balance ?? 0,
    trips: input.trips ?? 0,
    rating: input.rating ?? 0,
  };
}

export function mapBackendProfile(input: {
  authUser: {
    id: string;
    email?: string | null;
    created_at?: string | null;
    email_confirmed_at?: string | null;
    phone_confirmed_at?: string | null;
  };
  profile?: Record<string, unknown> | null;
}): RuntimeTrustProfile {
  const profile = input.profile ?? {};
  const phone = stringValue(profile.phone_number);
  const role = stringValue(profile.role) || 'passenger';
  const trips = numberValue(profile.trip_count);
  const rating = numberValue(profile.rating);
  const balance = numberValue(profile.wallet_balance);
  const sanadVerified = Boolean(profile.sanad_verified);
  const explicitLevel = verificationLevelValue(profile.verification_level);
  const emailVerified = Boolean(input.authUser.email_confirmed_at);
  const phoneVerified = Boolean(input.authUser.phone_confirmed_at);
  const verificationLevel = deriveVerificationLevel({
    verificationLevel: explicitLevel,
    role,
    sanadVerified,
    phoneVerified,
    emailVerified,
  });

  return {
    id: input.authUser.id,
    name: stringValue(profile.full_name) || input.authUser.email || 'Wasel User',
    email: input.authUser.email ?? undefined,
    phone: phone || undefined,
    role,
    backendMode: 'supabase',
    phoneVerified,
    emailVerified,
    sanadVerified,
    verificationLevel,
    trustScore: deriveTrustScore({ verificationLevel, trips, rating }),
    walletStatus: balance > 0 ? 'active' : 'inactive',
    balance,
    trips,
    rating,
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function verificationLevelValue(value: unknown): VerificationLevel | undefined {
  return value === 'level_0' || value === 'level_1' || value === 'level_2' || value === 'level_3'
    ? value
    : undefined;
}
