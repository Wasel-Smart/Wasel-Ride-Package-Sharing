import { supabase } from '../../utils/supabase/client';
import { getDb, getWalletByCanonicalUserId } from './helpers';
import type { DriverRow, RawVerificationRecord, UserContext, UserRow } from './types';

type UserSeed = {
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
};

export async function resolveCanonicalUser(userKey: string): Promise<UserRow | null> {
  const db = getDb();
  const { data: byAuth } = await db
    .from('users')
    .select('*')
    .eq('auth_user_id', userKey)
    .maybeSingle();
  if (byAuth) {return byAuth as UserRow;}

  const { data: byId, error } = await db
    .from('users')
    .select('*')
    .eq('id', userKey)
    .maybeSingle();
  if (error) {throw error;}
  return (byId as UserRow | null) ?? null;
}

async function resolveAuthSeed(userKey: string, seed?: UserSeed): Promise<UserSeed> {
  const mergedSeed: UserSeed = {
    email: seed?.email?.trim() || null,
    full_name: seed?.full_name?.trim() || null,
    phone_number: seed?.phone_number?.trim() || null,
  };

  if ((!mergedSeed.email || !mergedSeed.full_name || !mergedSeed.phone_number) && supabase) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    if (authUser && authUser.id === userKey) {
      mergedSeed.email = mergedSeed.email || authUser.email || null;
      mergedSeed.full_name =
        mergedSeed.full_name ||
        String(
          authUser.user_metadata?.full_name ??
          authUser.user_metadata?.name ??
          '',
        ).trim() ||
        null;
      mergedSeed.phone_number =
        mergedSeed.phone_number ||
        String(
          authUser.user_metadata?.phone_number ??
          authUser.user_metadata?.phone ??
          authUser.phone ??
          '',
        ).trim() ||
        null;
    }
  }

  return mergedSeed;
}

export async function ensureCanonicalUser(
  userKey: string,
  seed?: UserSeed,
): Promise<UserRow> {
  const existing = await resolveCanonicalUser(userKey);
  if (existing) {return existing;}

  const resolvedSeed = await resolveAuthSeed(userKey, seed);
  const email = resolvedSeed.email?.trim() || null;
  const fullName =
    resolvedSeed.full_name?.trim() ||
    email?.split('@')[0]?.trim() ||
    'Wasel User';
  const phoneNumber = resolvedSeed.phone_number?.trim() || null;

  if (!email) {
    throw new Error(
      'User profile is incomplete. Add a valid email address before continuing.',
    );
  }

  const db = getDb();
  const { data, error } = await db
    .from('users')
    .insert({
      auth_user_id: userKey,
      email,
      full_name: fullName,
      phone_number: phoneNumber,
      role: 'passenger',
    })
    .select('*')
    .single();
  if (error) {throw error;}
  return data as UserRow;
}

export async function getDriverByCanonicalUserId(userId: string): Promise<DriverRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {throw error;}
  return (data as DriverRow | null) ?? null;
}

export async function ensureDriverForUser(context: UserContext): Promise<DriverRow> {
  if (!context.driver) {
    throw new Error(
      'Driver profile is not provisioned. Complete driver onboarding and approval before offering rides.',
    );
  }

  if (context.driver.driver_status !== 'approved' && context.driver.driver_status !== 'online' && context.driver.driver_status !== 'offline' && context.driver.driver_status !== 'busy') {
    throw new Error(
      'Driver profile is pending approval. You can offer rides after driver verification is approved.',
    );
  }

  return context.driver;
}

export async function getLatestVerificationRecord(canonicalUserId: string): Promise<RawVerificationRecord | null> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_records')
    .select('sanad_status, document_status, verification_level, verification_timestamp, failure_reason, updated_at')
    .eq('user_id', canonicalUserId)
    .order('verification_timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {throw error;}
  return (data as RawVerificationRecord | null) ?? null;
}

export async function buildUserContext(
  userKey: string,
  seed?: Parameters<typeof ensureCanonicalUser>[1],
): Promise<UserContext> {
  const user = await ensureCanonicalUser(userKey, seed);
  const [wallet, verification, driver] = await Promise.all([
    getWalletByCanonicalUserId(user.id).catch(() => null),
    getLatestVerificationRecord(user.id).catch(() => null),
    getDriverByCanonicalUserId(user.id).catch(() => null),
  ]);
  return {
    user,
    wallet,
    verification,
    driver,
    authUserId: user.auth_user_id ?? userKey,
  };
}
