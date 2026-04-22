// ─── Referral operations ──────────────────────────────────────────────────────

import { getDb, toNumber, creditWalletBalance } from './helpers';
import { buildUserContext } from './userContext';
import { recordDirectGrowthEvent } from './growth';
import type { RawReferral, UserRow } from './types';

export async function processReferralConversionForPassenger(passengerCanonicalUserId: string) {
  const db = getDb();
  const { data, error } = await db
    .from('referrals')
    .select('*')
    .eq('referee_id', passengerCanonicalUserId)
    .eq('referee_completed_first_trip', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {throw error;}
  if (!data) {return null;}

  const row = data as RawReferral;
  const reward = toNumber(row.referrer_reward_jod, 2);
  await db
    .from('referrals')
    .update({
      referee_completed_first_trip: true,
      referrer_rewarded: true,
      completed_at: new Date().toISOString(),
      rewarded_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (row.referrer_id) {
    await creditWalletBalance(String(row.referrer_id), reward);
    await recordDirectGrowthEvent({
      userId: String(row.referrer_id),
      eventName: 'referral_reward_issued',
      funnelStage: 'rewarded',
      serviceType: 'referral',
      valueJod: reward,
      metadata: { refereeId: passengerCanonicalUserId, referralId: row.id },
    }).catch(() => {});
  }
  return row;
}

export async function getDirectReferralSnapshot(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const existingCode = (context.user as UserRow & { referral_code?: string | null }).referral_code;
  const referralCode = existingCode || `WASEL-${context.user.id.slice(0, 6).toUpperCase()}`;
  if (!existingCode) {
    await db.from('users').update({ referral_code: referralCode }).eq('id', context.user.id);
  }

  const { data: referrals, error } = await db
    .from('referrals')
    .select('*')
    .eq('referrer_id', context.user.id);
  if (error) {throw error;}

  const rows = Array.isArray(referrals) ? (referrals as Array<Record<string, unknown>>) : [];
  return {
    code: referralCode,
    invited: rows.length,
    converted: rows.filter((r) => r.referee_completed_first_trip).length,
    pendingCredit: rows.filter((r) => !r.referrer_rewarded).reduce((sum, r) => sum + toNumber(r.referrer_reward_jod, 0), 0),
    earnedCredit: rows.filter((r) => r.referrer_rewarded).reduce((sum, r) => sum + toNumber(r.referrer_reward_jod, 0), 0),
  };
}

export async function redeemDirectReferralCode(userId: string, referralCode: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const normalizedCode = referralCode.trim().toUpperCase();
  if (!normalizedCode) {throw new Error('Enter a referral code first.');}

  const { data: referrer, error: referrerError } = await db
    .from('users')
    .select('id, referral_code, full_name')
    .eq('referral_code', normalizedCode)
    .maybeSingle();
  if (referrerError) {throw referrerError;}
  if (!referrer) {throw new Error('Referral code was not found.');}
  if (String((referrer as { id?: string }).id) === context.user.id) {
    throw new Error('You cannot redeem your own referral code.');
  }

  const { data: existing, error: existingError } = await db
    .from('referrals')
    .select('*')
    .eq('referee_id', context.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) {throw existingError;}
  if (existing) {return existing as RawReferral;}

  const reward = 2;
  const { data, error } = await db
    .from('referrals')
    .insert({
      referrer_id: String((referrer as { id?: string }).id),
      referee_id: context.user.id,
      referral_code: normalizedCode,
      referrer_reward_jod: reward,
      referee_reward_jod: 0,
      referee_completed_first_trip: false,
      referrer_rewarded: false,
      redeemed_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) {throw error;}

  await recordDirectGrowthEvent({
    userId,
    eventName: 'referral_code_redeemed',
    funnelStage: 'redeemed',
    serviceType: 'referral',
    valueJod: reward,
    metadata: { code: normalizedCode },
  }).catch(() => {});

  return data as RawReferral;
}
