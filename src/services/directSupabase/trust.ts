import { getDb } from './helpers';
import { buildUserContext } from './userContext';
import type { DriverRow } from './types';
import { normalizePhone, isValidE164Phone } from '../../shared/validation/phone';

function isDriverRole(role?: string | null): boolean {
  return role === 'driver' || role === 'both';
}

function currentSanadStatus(value?: string | null) {
  return value === 'verified' || value === 'pending' || value === 'rejected' || value === 'expired'
    ? value
    : 'unverified';
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function hashOtpCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest))
    .map((chunk) => chunk.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function isExpired(isoValue?: string | null): boolean {
  if (!isoValue) return false;
  const expiresAt = new Date(isoValue).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return Date.now() > expiresAt;
}

interface OtpSessionRow {
  otp_session_id: string;
  phone_number: string;
  purpose: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export async function submitDirectTrustIdentityVerification(
  userId: string,
  input: { providerReference: string; documentReference?: string },
) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const providerReference = input.providerReference.trim();
  if (providerReference.length < 4) {
    throw new Error('Enter a valid identity provider reference before submitting.');
  }

  const { error: verificationError } = await db.from('verification_records').insert({
    user_id: context.user.id,
    sanad_status: 'pending',
    document_status: 'pending',
    verification_level: context.user.verification_level ?? 'level_1',
    provider_reference: providerReference,
    document_reference: input.documentReference?.trim() || null,
    failure_reason: null,
  });
  if (verificationError) {throw verificationError;}

  const { error: userError } = await db
    .from('users')
    .update({ verification_level: 'level_1' })
    .eq('id', context.user.id);
  if (userError) {throw userError;}

  return {
    submitted: true,
    verificationId: `${context.user.id}-identity-${Date.now()}`,
  };
}

const otpStartTimestamps = new Map<string, number>();
const OTP_START_COOLDOWN_MS = 30_000;

export function clearOtpStartRateLimit() {
  otpStartTimestamps.clear();
}

function enforceOtpStartRateLimit(userId: string) {
  const lastStart = otpStartTimestamps.get(userId) ?? 0;
  const now = Date.now();
  if (now - lastStart < OTP_START_COOLDOWN_MS) {
    throw new Error('Too many verification attempts. Please wait before requesting a new code.');
  }
  otpStartTimestamps.set(userId, now);
}

export async function startDirectTrustPhoneVerification(userId: string, phoneNumber: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  enforceOtpStartRateLimit(userId);

  const normalized = normalizePhone(phoneNumber);
  if (!isValidE164Phone(normalized)) {
    throw new Error('Enter a valid E.164 phone number such as +962791234567.');
  }

  const { data: existingPhoneOwner } = await db
    .from('users')
    .select('id')
    .eq('phone_number', normalized)
    .neq('id', context.user.id)
    .maybeSingle();
  if (existingPhoneOwner) {
    throw new Error('This phone number is already linked to another account.');
  }

  const { error: updateError } = await db
    .from('users')
    .update({ phone_number: normalized })
    .eq('id', context.user.id);
  if (updateError) {throw updateError;}

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const code = generateOtpCode();
  const otpHash = await hashOtpCode(code);

  const { error: invalidateError } = await db
    .from('otp_sessions')
    .update({ consumed_at: now })
    .eq('user_id', context.user.id)
    .eq('purpose', 'driver_action')
    .is('consumed_at', null);
  if (invalidateError) {throw invalidateError;}

  const { error: otpError } = await db
    .from('otp_sessions')
    .insert({
      user_id: context.user.id,
      phone_number: normalized,
      purpose: 'driver_action',
      otp_hash: otpHash,
      attempts: 0,
      max_attempts: 5,
      expires_at: expiresAt,
    });
  if (otpError) {throw otpError;}

  return {
    started: true,
    phoneNumber: normalized,
    expiresAt,
  };
}

export async function confirmDirectTrustPhoneVerification(userId: string, code: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const trimmedCode = String(code ?? '').trim();
  if (!trimmedCode) {
    throw new Error('Verification code is required.');
  }

  const { data: otpSession, error: otpError } = await db
    .from('otp_sessions')
    .select('otp_session_id, phone_number, otp_hash, attempts, max_attempts, expires_at, consumed_at')
    .eq('user_id', context.user.id)
    .eq('purpose', 'driver_action')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<OtpSessionRow>();
  if (otpError) {throw otpError;}

  if (!otpSession || otpSession.consumed_at) {
    throw new Error('No active verification session. Send a new code and try again.');
  }

  if (isExpired(otpSession.expires_at)) {
    throw new Error('The verification code expired. Send a new code.');
  }

  const attempts = Number(otpSession.attempts ?? 0);
  const maxAttempts = Number(otpSession.max_attempts ?? 5);
  if (attempts >= maxAttempts) {
    throw new Error('Too many incorrect verification attempts. Send a new code.');
  }

  const hashedCode = await hashOtpCode(trimmedCode);
  const isCodeValid = constantTimeEqual(hashedCode, String(otpSession.otp_hash ?? ''));

  const nextAttempts = attempts + 1;
  const now = new Date().toISOString();

  if (!isCodeValid) {
    await db
      .from('otp_sessions')
      .update({ attempts: nextAttempts })
      .eq('otp_session_id', otpSession.otp_session_id);
    throw new Error('That verification code is incorrect.');
  }

  await db
    .from('otp_sessions')
    .update({ consumed_at: now })
    .eq('otp_session_id', otpSession.otp_session_id);

  const { error } = await db
    .from('users')
    .update({ phone_verified_at: now, phone_number: otpSession.phone_number })
    .eq('id', context.user.id);
  if (error) {throw error;}

  return {
    verified: true,
    phoneNumber: otpSession.phone_number,
  };
}

export async function enableDirectTrustDriverMode(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const { error } = await db.from('users').update({ role: 'driver' }).eq('id', context.user.id);
  if (error) {throw error;}

  return {
    enabled: true,
    role: 'driver' as const,
  };
}

export async function submitDirectTrustDriverDocuments(
  userId: string,
  input: { licenseNumber: string; documentReference?: string },
) {
  const context = await buildUserContext(userId);
  if (!isDriverRole(context.user.role)) {
    throw new Error('Enable Driver mode before submitting driver documents.');
  }

  const licenseNumber = input.licenseNumber.trim();
  if (licenseNumber.length < 4) {
    throw new Error('Enter the driver license number before submitting.');
  }

  const db = getDb();
  const driverPatch = {
    license_number: licenseNumber,
    driver_status: 'pending_approval',
    background_check_status: 'pending',
    verification_level: context.user.verification_level ?? 'level_0',
    sanad_identity_linked:
      context.user.verification_level === 'level_2' ||
      context.user.verification_level === 'level_3' ||
      context.user.sanad_verified_status === 'verified',
  };

  let driver = context.driver as DriverRow | null;
  if (driver?.driver_id) {
    const { error } = await db
      .from('drivers')
      .update(driverPatch)
      .eq('driver_id', driver.driver_id);
    if (error) {throw error;}
  } else {
    const { data, error } = await db
      .from('drivers')
      .insert({
        user_id: context.user.id,
        ...driverPatch,
      })
      .select('driver_id')
      .single();
    if (error) {throw error;}
    driver = data as DriverRow;
  }

  const { error: verificationError } = await db.from('verification_records').insert({
    user_id: context.user.id,
    sanad_status: currentSanadStatus(context.user.sanad_verified_status),
    document_status: 'pending',
    verification_level: context.user.verification_level ?? 'level_0',
    provider_reference: 'driver_documents',
    document_reference: input.documentReference?.trim() || null,
    failure_reason: null,
  });
  if (verificationError) {throw verificationError;}

  return {
    submitted: true,
    driverId: String(driver?.driver_id ?? ''),
  };
}
