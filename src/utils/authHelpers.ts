import { checkPasswordStrength } from './security';
import { C } from '../utils/wasel-ds';

export type PasswordRequirement = {
  key: 'length' | 'lowercase' | 'uppercase' | 'number' | 'special';
  label: string;
  met: boolean;
};

export type SupportedAuthProvider = 'google' | 'facebook' | 'whatsapp';

export type AuthProviderWarningReason =
  | 'disabled_in_environment'
  | 'missing_backend'
  | 'missing_support_channel';

export interface AuthProviderWarning {
  action: 'hide-provider';
  configKey?: string;
  environment: string;
  provider: SupportedAuthProvider;
  reason: AuthProviderWarningReason;
  scope: 'auth-provider-config';
}

export function buildAuthProviderWarning(
  provider: SupportedAuthProvider,
  reason: AuthProviderWarningReason,
  options: {
    configKey?: string;
    environment: string;
  },
): AuthProviderWarning {
  return {
    action: 'hide-provider',
    configKey: options.configKey,
    environment: options.environment,
    provider,
    reason,
    scope: 'auth-provider-config',
  };
}

export function logAuthProviderWarning(warning: AuthProviderWarning): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[AuthProviderConfig]', warning);
  }
}

function extractAuthMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

/**
 * Shared auth error message normaliser.
 * Single source of truth used across email auth and OAuth callbacks.
 */
export function friendlyAuthError(error: unknown, fallback: string): string {
  const message = extractAuthMessage(error).trim();
  const lower = message.toLowerCase();

  if (!message) {
    return fallback;
  }

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('authentication failed') ||
    lower.includes('wrong email') ||
    lower.includes('wrong password') ||
    lower.includes('user not found')
  ) {
    return 'Incorrect email or password.';
  }

  if (lower.includes('email not confirmed') || lower.includes('confirm your email')) {
    return 'Please confirm your email before signing in.';
  }

  if (lower.includes('locked') || lower.includes('temporarily blocked')) {
    return 'This account is temporarily locked. Please wait a little and try again, or contact support if this keeps happening.';
  }

  if (lower.includes('disabled') || lower.includes('suspended')) {
    return 'This account is currently disabled. Please contact support for help.';
  }

  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already exists') ||
    lower.includes('email is already in use') ||
    lower.includes('already associated')
  ) {
    return 'An account with this email already exists. Sign in instead, or reset your password if you need access.';
  }

  if (
    lower.includes('password should be at least') ||
    lower.includes('weak password') ||
    lower.includes('password is too weak')
  ) {
    return 'Choose a stronger password with at least 8 characters, plus uppercase, lowercase, a number, and a symbol.';
  }

  if (
    lower.includes('email address is invalid') ||
    lower.includes('invalid email') ||
    lower.includes('email must be a valid email')
  ) {
    return 'Enter a valid email address.';
  }

  if (
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limited')
  ) {
    return 'Too many attempts right now. Please wait a moment and try again.';
  }

  if (
    lower.includes('database error saving new user') ||
    (lower.includes('null value in column') &&
      lower.includes('phone_number') &&
      lower.includes('relation "users"'))
  ) {
    return 'Account creation is blocked by the current Supabase signup trigger. Apply the latest auth signup migration, then try again.';
  }

  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider') ||
    lower.includes('oauth provider not supported')
  ) {
    return 'This sign-in option is not available in this environment.';
  }

  if (
    lower.includes('popup closed') ||
    lower.includes('popup_closed') ||
    lower.includes('access_denied') ||
    lower.includes('user denied') ||
    lower.includes('cancelled') ||
    lower.includes('canceled')
  ) {
    return 'Sign-in was canceled before it finished. Please try again when you are ready.';
  }

  if (lower.includes('missing email')) {
    return 'Your social account did not share an email address, so we could not finish sign-in.';
  }

  if (
    lower.includes('already linked') ||
    lower.includes('provider conflict') ||
    lower.includes('different provider') ||
    lower.includes('use a different sign in method') ||
    lower.includes('account exists with different credential')
  ) {
    return 'This email is already linked to a different sign-in method. Use the original provider or email sign-in for this account.';
  }

  if (
    (lower.includes('state') && lower.includes('invalid')) ||
    lower.includes('code verifier') ||
    lower.includes('auth code')
  ) {
    return 'This sign-in link has expired or is no longer valid. Please start again from the sign-in page.';
  }

  if (
    lower.includes('networkerror') ||
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('network error')
  ) {
    return 'We could not reach the server. Check your connection and try again.';
  }

  if (
    lower.includes('backend not configured') ||
    lower.includes('not configured') ||
    lower.includes('supabase auth is not configured')
  ) {
    return 'Authentication is not configured for this environment yet.';
  }

  return message || fallback;
}

/**
 * Password strength scorer.
 * Returns score 0-5, label, and colour token from wasel-ds.
 */
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

  return map[Math.min(score, 5)];
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      key: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      key: 'lowercase',
      label: 'One lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      key: 'uppercase',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      key: 'number',
      label: 'One number',
      met: /\d/.test(password),
    },
    {
      key: 'special',
      label: 'One special character',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function validatePassword(password: string): string | null {
  const result = checkPasswordStrength(password);

  if (!password) {
    return 'Enter a password.';
  }

  if (!result.isValid) {
    return 'Choose a stronger password with at least 8 characters, plus uppercase, lowercase, a number, and a symbol.';
  }

  return null;
}

export function validateFullName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return 'Enter your full name.';
  }

  if (trimmed.length < 2) {
    return 'Your name looks too short.';
  }

  return null;
}

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}
