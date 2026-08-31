/**
 * Shared auth error message normaliser.
 * Single source of truth — imported by WaselAuth and auth.ts.
 */
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

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('authentication failed') ||
    lower.includes('wrong email') ||
    lower.includes('wrong password') ||
    normalizedCode === 'invalid_credentials'
  )
    return 'Incorrect email or password.';

  if (lower.includes('email not confirmed') || normalizedCode === 'email_not_confirmed')
    return 'Please confirm your email before signing in.';

  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    normalizedCode === 'email_exists'
  )
    return 'This email is already registered.';

  if (normalizedCode === 'user_not_found' || lower.includes('user not found'))
    return 'Account not found. Please check your email or sign up.';

  if (normalizedCode === 'over_request_rate_limit' || lower.includes('too many requests'))
    return 'Too many attempts. Please wait a moment and try again.';

  if (
    normalizedCode === 'email_address_not_authorized' ||
    lower.includes('signups not allowed') ||
    lower.includes('not allowed for this email domain')
  )
    return 'Sign-up is not allowed for this email domain.';

  if (normalizedCode === 'email_address_invalid' || lower.includes('invalid email'))
    return 'Please enter a valid email address.';

  if (normalizedCode === 'user_banned' || lower.includes('user banned'))
    return 'Your account has been suspended. Please contact support.';

  if (normalizedCode === 'weak_password')
    return 'Password is too weak. Please choose a stronger password.';

  if (normalizedCode === 'signup_disabled' || lower.includes('signup disabled'))
    return 'Sign-up is currently disabled. Please contact support.';

  if (normalizedCode === 'phone_exists' || lower.includes('phone already exists'))
    return 'This phone number is already registered.';

  return message || fallback;
}

/**
 * Password strength scorer.
 * Returns score 0-5, label, and colour token from wasel-ds.
 */
import { C } from '../utils/wasel-ds';

export function pwStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: C.textMuted };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

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
