/**
 * Shared auth error message normaliser.
 * Single source of truth — imported by WaselAuth and auth.ts.
 */
type AuthErrorMatch = { patterns: string[]; code?: string; message: string };

const AUTH_ERROR_MATCHES: AuthErrorMatch[] = [
  { patterns: ['invalid login credentials', 'invalid credentials', 'authentication failed', 'wrong email', 'wrong password'], code: 'invalid_credentials', message: 'Incorrect email or password.' },
  { patterns: ['email not confirmed'], code: 'email_not_confirmed', message: 'Please confirm your email before signing in.' },
  { patterns: ['already registered', 'already been registered'], code: 'email_exists', message: 'This email is already registered.' },
  { patterns: ['user not found'], code: 'user_not_found', message: 'Account not found. Please check your email or sign up.' },
  { patterns: ['too many requests'], code: 'over_request_rate_limit', message: 'Too many attempts. Please wait a moment and try again.' },
  { patterns: ['signups not allowed', 'not allowed for this email domain'], code: 'email_address_not_authorized', message: 'Sign-up is not allowed for this email domain.' },
  { patterns: ['invalid email'], code: 'email_address_invalid', message: 'Please enter a valid email address.' },
  { patterns: ['user banned'], code: 'user_banned', message: 'Your account has been suspended. Please contact support.' },
  { patterns: ['signup disabled'], code: 'signup_disabled', message: 'Sign-up is currently disabled. Please contact support.' },
  { patterns: ['phone already exists'], code: 'phone_exists', message: 'This phone number is already registered.' },
];

function matchAuthError(lower: string, normalizedCode: string | undefined): string | undefined {
  for (const entry of AUTH_ERROR_MATCHES) {
    if (entry.code && entry.code === normalizedCode) {return entry.message;}
    if (entry.patterns.some(pattern => lower.includes(pattern))) {return entry.message;}
  }
  return undefined;
}

export function friendlyAuthError(error: unknown, fallback: string, code?: string): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  const errorCode =
    code ||
    (typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? (error as Record<string, unknown>).code
      : undefined);
  const normalizedCode = typeof errorCode === 'string' ? errorCode : undefined;

  const matched = matchAuthError(lower, normalizedCode);
  if (matched) {return matched;}

  if (normalizedCode === 'weak_password') {
    return 'Password is too weak. Please choose a stronger password.';
  }

  return message || fallback;
}

/**
 * Password strength scorer.
 * Returns score 0-5, label, and colour token from wasel-ds.
 */
import { C } from '../utils/wasel-ds';

export function pwStrength(password: string): { score: number; label: string; color: string } {
  if (!password) {return { score: 0, label: '', color: C.textMuted };}

  let score = 0;
  if (password.length >= 8) {score += 1;}
  if (password.length >= 12) {score += 1;}
  if (/[A-Z]/.test(password)) {score += 1;}
  if (/\d/.test(password)) {score += 1;}
  if (/[^A-Za-z0-9]/.test(password)) {score += 1;}

  const map = [
    { score: 0, label: '', color: C.textMuted },
    { score: 1, label: 'Weak', color: C.error },
    { score: 2, label: 'Fair', color: C.gold },
    { score: 3, label: 'Good', color: C.cyan },
    { score: 4, label: 'Strong', color: C.green },
    { score: 5, label: 'Excellent', color: C.green },
  ];

  return map[Math.min(score, 5)] ?? { score: 0, label: '', color: C.textMuted };
}
