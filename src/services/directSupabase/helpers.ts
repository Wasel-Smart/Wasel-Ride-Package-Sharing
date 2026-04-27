// ─── Pure utility & mapping helpers ──────────────────────────────────────────

import { supabase } from '../../utils/supabase/client';
import { evaluateTrustCapability } from '../trustRules';
import type {
  DbClient,
  RawBooking,
  RawProfile,
  TripRow,
  UserContext,
  WalletRow,
} from './types';
import type { TripCreatePayload, TripSearchResult } from '../trips';

export function getDb(): DbClient {
  if (!supabase) {throw new Error('Supabase client is not initialised');}
  return supabase as DbClient;
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatTime(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) {return '';}
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    const timeMatch = text.match(/^\d{2}:\d{2}/);
    return timeMatch ? timeMatch[0] : text;
  }
  return date.toISOString().slice(11, 16);
}

export function formatDate(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  if (!text) {return fallback;}
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {return text.slice(0, 10) || fallback;}
  return date.toISOString().slice(0, 10);
}

export function mapCanonicalRole(role?: string | null): string | null {
  if (!role) {return null;}
  if (role === 'rider') {return 'passenger';}
  if (role === 'both') {return 'driver';}
  return role;
}

export function mapProfileFromContext(
  context: UserContext,
  stats?: { tripCount?: number; rating?: number },
): RawProfile {
  const sanadVerified =
    context.verification?.sanad_status === 'verified' ||
    context.user.sanad_verified_status === 'verified' ||
    context.driver?.sanad_identity_linked === true;
  const walletBalance = toNumber(context.wallet?.balance, 0);
  const tripCount = toNumber(stats?.tripCount, 0);
  const rating = toNumber(stats?.rating, 5);

  return {
    id: context.authUserId,
    canonical_user_id: context.user.id,
    email: context.user.email ?? null,
    full_name: context.user.full_name ?? null,
    role: context.user.role ?? null,
    phone: context.user.phone_number ?? null,
    phone_number: context.user.phone_number ?? null,
    phone_verified: Boolean(context.user.phone_verified_at),
    email_verified: Boolean(context.user.email),
    wallet_balance: walletBalance,
    rating,
    rating_as_driver: rating,
    total_trips: tripCount,
    trip_count: tripCount,
    verified: sanadVerified,
    id_verified: sanadVerified,
    is_verified: sanadVerified,
    sanad_verified: sanadVerified,
    verification_level:
      context.verification?.verification_level ??
      context.driver?.verification_level ??
      context.user.verification_level ??
      'level_0',
    wallet_status: context.wallet?.wallet_status ?? 'active',
    avatar_url: context.user.avatar_url ?? null,
    two_factor_enabled: Boolean(context.user.two_factor_enabled),
    created_at: context.user.created_at ?? null,
  };
}

export function buildTrustLikeUser(profile: RawProfile) {
  const tripCount = toNumber(profile.trip_count ?? profile.total_trips, 0);
  const rating = toNumber(profile.rating ?? profile.rating_as_driver, 5);
  const verificationLevel = String(profile.verification_level ?? 'level_0');
  const phoneVerified = Boolean(profile.phone_verified);
  const emailVerified = Boolean(profile.email_verified ?? profile.email);
  const role = profile.role === 'driver' || profile.role === 'both' ? profile.role : 'rider';
  const trustScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        45 +
          (emailVerified ? 10 : 0) +
          (phoneVerified ? 10 : 0) +
          (profile.verified || profile.sanad_verified ? 15 : 0) +
          Math.min(tripCount, 50) * 0.4 +
          Math.max(0, Math.min(rating, 5)) * 2,
      ),
    ),
  );
  return {
    role,
    verificationLevel,
    walletStatus:
      profile.wallet_status === 'frozen' || profile.wallet_status === 'limited'
        ? profile.wallet_status
        : 'active',
    trustScore,
    phoneVerified,
    emailVerified,
  } as const;
}

export function ensureBookingEligibility(profile: RawProfile, allowPackageCarry = false) {
  const bookingUser = buildTrustLikeUser(profile);
  const payoutGate = evaluateTrustCapability(bookingUser, 'receive_payouts');
  if (!payoutGate.allowed && bookingUser.walletStatus === 'frozen') {
    throw new Error(payoutGate.reason ?? 'Wallet standing needs review before booking.');
  }
  if (!bookingUser.phoneVerified) {
    throw new Error('Booking requires a verified phone number.');
  }
  if (allowPackageCarry) {
    const packageGate = evaluateTrustCapability(bookingUser, 'carry_packages');
    if (!packageGate.allowed) {
      throw new Error(packageGate.reason ?? 'Package carrying requires a higher trust standing.');
    }
  }
}

export function mapTripRow(row: TripRow, driverProfile?: RawProfile | null): TripSearchResult {
  const createdAt = String(row.created_at ?? new Date().toISOString());
  const date = formatDate(row.departure_time, createdAt.slice(0, 10));
  return {
    id: String(row.trip_id ?? ''),
    from: String(row.origin_city ?? ''),
    to: String(row.destination_city ?? ''),
    date,
    time: formatTime(row.departure_time),
    seats: toNumber(row.available_seats, 0),
    price: toNumber(row.price_per_seat, 0),
    driver: {
      id: String(driverProfile?.id ?? 'driver'),
      name: String(
        driverProfile?.full_name ||
          driverProfile?.email?.split('@')[0] ||
          'Wasel Driver',
      ),
      rating: toNumber(driverProfile?.rating_as_driver ?? driverProfile?.rating, 5),
      verified: Boolean(
        driverProfile?.id_verified ??
          driverProfile?.is_verified ??
          driverProfile?.sanad_verified ??
          driverProfile?.verified ??
          false,
      ),
    },
  };
}

export function buildTripNotes(payload: TripCreatePayload): string | null {
  const notes: string[] = [];
  if (payload.note?.trim()) {notes.push(payload.note.trim());}
  if (payload.acceptsPackages) {
    const packageLine = [
      `Packages enabled (${payload.packageCapacity ?? 'medium'})`,
      payload.packageNote?.trim() || '',
    ]
      .filter(Boolean)
      .join(': ');
    notes.push(packageLine);
  }
  if (payload.gender && payload.gender !== 'mixed') {notes.push(`Preference: ${payload.gender}`);}
  if (payload.prayer) {notes.push('Prayer stop requested');}
  return notes.length > 0 ? notes.join('\n') : null;
}

export function normalizeBookingStatus(status?: string | null): string {
  switch (status) {
    case 'accepted': return 'confirmed';
    case 'rejected': return 'cancelled';
    case 'pending_payment': return 'pending';
    default: return status || 'pending';
  }
}

export function normalizeTripStatus(status?: string | null): string {
  switch (status) {
    case 'active':
    case 'published': return 'open';
    default: return status || 'draft';
  }
}

export function normalizePackageCapacity(capacity?: TripCreatePayload['packageCapacity']): number {
  switch (capacity) {
    case 'small': return 1;
    case 'medium': return 2;
    case 'large': return 3;
    default: return 0;
  }
}

export function mapBookingRow(row: RawBooking): RawBooking {
  const seatNumber = toNumber(row.seat_number, 1);
  const amount = toNumber(row.amount ?? row.total_price, 0);
  const pricePerSeat = toNumber(row.price_per_seat, amount);
  const runtimeStatus =
    typeof row.status === 'string' && row.status.trim().length > 0
      ? row.status.trim()
      : normalizeBookingStatus(row.booking_status);

  return {
    ...row,
    id: String(row.booking_id ?? row.id ?? ''),
    booking_id: String(row.booking_id ?? row.id ?? ''),
    seats_requested: toNumber(row.seats_requested, 1),
    seat_number: seatNumber,
    price_per_seat: pricePerSeat,
    total_price: amount,
    amount,
    status: runtimeStatus,
    booking_status: row.booking_status ?? normalizeBookingStatus(row.status),
  };
}

export function packageSizeFromWeight(weightKg: number): 'small' | 'medium' | 'large' | 'extra_large' {
  if (weightKg <= 1) {return 'small';}
  if (weightKg <= 5) {return 'medium';}
  if (weightKg <= 12) {return 'large';}
  return 'extra_large';
}

export async function getWalletByCanonicalUserId(canonicalUserId: string): Promise<WalletRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('wallets')
    .select('*')
    .eq('user_id', canonicalUserId)
    .maybeSingle();
  if (error) {throw error;}
  return (data as WalletRow | null) ?? null;
}

export async function creditWalletBalance(canonicalUserId: string, amountJod: number) {
  const db = getDb();
  const wallet = await getWalletByCanonicalUserId(canonicalUserId);
  if (wallet?.wallet_id) {
    const nextBalance = toNumber(wallet.balance, 0) + amountJod;
    const nextPending = Math.max(0, toNumber(wallet.pending_balance, 0));
    const { error } = await db
      .from('wallets')
      .update({ balance: nextBalance, pending_balance: nextPending, wallet_status: wallet.wallet_status ?? 'active' })
      .eq('wallet_id', wallet.wallet_id);
    if (error) {throw error;}
    return;
  }
  const { error } = await db.from('wallets').insert({
    user_id: canonicalUserId,
    balance: amountJod,
    pending_balance: 0,
    wallet_status: 'active',
    currency_code: 'JOD',
  });
  if (error) {throw error;}
}
