import { getDb } from './helpers';
import { buildUserContext } from './userContext';
import type { DriverRow } from './types';

function isDriverRole(role?: string | null): boolean {
  return role === 'driver' || role === 'both';
}

function currentSanadStatus(value?: string | null) {
  return value === 'verified' || value === 'pending' || value === 'rejected' || value === 'expired'
    ? value
    : 'unverified';
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
  if (verificationError) throw verificationError;

  const { error: userError } = await db
    .from('users')
    .update({ verification_level: 'level_1' })
    .eq('id', context.user.id);
  if (userError) throw userError;

  return {
    submitted: true,
    verificationId: `${context.user.id}-identity-${Date.now()}`,
  };
}

export async function startDirectTrustPhoneVerification(userId: string, phoneNumber: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const normalized = phoneNumber.trim();
  if (!normalized) {
    throw new Error('Enter a valid phone number to verify.');
  }

  const { error } = await db
    .from('users')
    .update({ phone_number: normalized })
    .eq('id', context.user.id);
  if (error) throw error;

  return {
    started: true,
    phoneNumber: normalized,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

export async function confirmDirectTrustPhoneVerification(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const { error } = await db
    .from('users')
    .update({ phone_verified_at: new Date().toISOString() })
    .eq('id', context.user.id);
  if (error) throw error;

  return {
    verified: true,
    phoneNumber: context.user.phone_number ?? '',
  };
}

export async function enableDirectTrustDriverMode(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();

  const { error } = await db.from('users').update({ role: 'driver' }).eq('id', context.user.id);
  if (error) throw error;

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
    if (error) throw error;
  } else {
    const { data, error } = await db
      .from('drivers')
      .insert({
        user_id: context.user.id,
        ...driverPatch,
      })
      .select('driver_id')
      .single();
    if (error) throw error;
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
  if (verificationError) throw verificationError;

  return {
    submitted: true,
    driverId: String(driver?.driver_id ?? ''),
  };
}
