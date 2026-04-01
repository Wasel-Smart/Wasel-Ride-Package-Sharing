/**
 * Shared auth error message normaliser.
 * Single source of truth — imported by WaselAuth and auth.ts.
 */
export function friendlyAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower   = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials')       ||
    lower.includes('authentication failed')     ||
    lower.includes('wrong email')               ||
    lower.includes('wrong password')
  ) return 'Incorrect email or password.';

  if (lower.includes('email not confirmed'))
    return 'Please confirm your email before signing in.';

  if (lower.includes('already registered') || lower.includes('already been registered'))
    return 'This email is already registered.';

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
  if (password.length >= 8)          score += 1;
  if (password.length >= 12)         score += 1;
  if (/[A-Z]/.test(password))        score += 1;
  if (/\d/.test(password))           score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const map = [
    { score: 0, label: '',          color: C.textMuted },
    { score: 1, label: 'Weak',      color: C.error     },
    { score: 2, label: 'Fair',      color: C.gold      },
    { score: 3, label: 'Good',      color: C.cyan      },
    { score: 4, label: 'Strong',    color: C.green     },
    { score: 5, label: 'Excellent', color: C.green     },
  ];

  return map[Math.min(score, 5)];
}
