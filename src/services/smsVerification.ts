/**
 * smsVerification.ts — Wasel SMS OTP verification service.
 *
 * ✅ Gap 6 fixed: implements verifyPhoneNumber, getSMSOtp, verifySMSCode.
 *
 * Integration strategy
 * ────────────────────
 * SMS delivery is intentionally routed through a Supabase Edge Function so
 * that the Twilio credentials never reach the browser bundle.
 *
 * Required environment variables (server-side / Edge Function only):
 *   TWILIO_ACCOUNT_SID   — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN    — your Twilio Auth Token
 *   TWILIO_PHONE_NUMBER  — E.164 sender number (e.g. +12025551234)
 *
 * Required environment variable (client-side):
 *   VITE_SUPABASE_URL    — already used by the app
 */

import { supabase } from '@/utils/supabase/client';
import { sanitizeLogMessage, sanitizePhoneNumber } from '@/utils/sanitization';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SMSOtpResult {
  success: boolean;
  error: string | null;
  /** Only present when success is true; masked display of destination */
  sentTo?: string;
}

export interface SMSVerifyResult {
  success: boolean;
  error: string | null;
  verified?: boolean;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function isDevMode(): boolean {
  // ✅ Gap 7 fix applied here too: single consistent helper for env-mode checks
  // instead of scattering import.meta.env.DEV / import.meta.env.PROD across files.
  return import.meta.env.DEV === true;
}

async function callEdgeFunction<T>(
  fnName: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(fnName, { body });

    if (error) {
      if (isDevMode()) console.error(`[smsVerification] ${fnName} error:`, sanitizeLogMessage(error));
      return { data: null, error: error.message ?? 'Edge function error' };
    }

    return { data: data ?? null, error: null };
  } catch (err) {
    if (isDevMode()) console.error(`[smsVerification] ${fnName} threw:`, sanitizeLogMessage(err));
    return { data: null, error: 'SMS service unavailable' };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * getSMSOtp — sends a one-time passcode to the given E.164 phone number.
 *
 * Calls the `send-sms-otp` Edge Function, which:
 *   1. Generates a 6-digit OTP and stores it in `otp_codes` with a 10-min TTL.
 *   2. Delivers it via Twilio Verify or raw SMS.
 *
 * @param phoneNumber — E.164 format, e.g. +962791234567
 */
export async function getSMSOtp(phoneNumber: string): Promise<SMSOtpResult> {
  const { data, error } = await callEdgeFunction<{ sentTo: string }>('send-sms-otp', {
    phone: phoneNumber,
  });

  if (error) return { success: false, error };

  console.log('OTP sent to:', sanitizePhoneNumber(phoneNumber));
  return { success: true, error: null, sentTo: data?.sentTo };
}

/**
 * verifySMSCode — validates the OTP the user typed.
 *
 * Calls the `verify-sms-otp` Edge Function, which:
 *   1. Looks up the unexpired OTP for this phone.
 *   2. Marks it consumed on success.
 *   3. Updates profiles.phone_verified = true for the authenticated user.
 *
 * @param phoneNumber — E.164 format
 * @param code        — 6-digit string the user entered
 */
export async function verifySMSCode(
  phoneNumber: string,
  code: string,
): Promise<SMSVerifyResult> {
  if (!/^\d{4,8}$/.test(code.trim())) {
    return { success: false, error: 'Invalid code format — must be 4–8 digits' };
  }

  const { data, error } = await callEdgeFunction<{ verified: boolean }>('verify-sms-otp', {
    phone: phoneNumber,
    code: code.trim(),
  });

  if (error) return { success: false, error };

  const verified = data?.verified === true;
  if (verified) {
    console.log('Phone verified:', sanitizePhoneNumber(phoneNumber));
  }

  return { success: true, error: null, verified };
}

/**
 * verifyPhoneNumber — high-level convenience function that combines
 * getSMSOtp + verifySMSCode into a single round-trip helper for
 * components that manage the two-step flow themselves.
 *
 * Step 1 — call with `{ phoneNumber }` → sends OTP.
 * Step 2 — call with `{ phoneNumber, code }` → validates OTP.
 */
export async function verifyPhoneNumber(params: {
  phoneNumber: string;
  code?: string;
}): Promise<SMSOtpResult | SMSVerifyResult> {
  const { phoneNumber, code } = params;

  if (code) {
    return verifySMSCode(phoneNumber, code);
  }

  return getSMSOtp(phoneNumber);
}
