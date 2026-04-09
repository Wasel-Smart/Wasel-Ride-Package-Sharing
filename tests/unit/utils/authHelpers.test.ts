import { describe, expect, it } from 'vitest';
import { friendlyAuthError, validatePassword } from '../../../src/utils/authHelpers';

describe('friendlyAuthError()', () => {
  it('maps the Supabase signup trigger failure to an actionable message', () => {
    expect(
      friendlyAuthError(
        'Database error saving new user: null value in column "phone_number" of relation "users" violates not-null constraint',
        'fallback',
      ),
    ).toContain('Supabase signup trigger');
  });
});

describe('validatePassword()', () => {
  it('rejects weak passwords that only satisfy the length requirement', () => {
    expect(validatePassword('12345678')).toContain('Choose a stronger password');
  });

  it('accepts a strong password', () => {
    expect(validatePassword('StrongPass1!')).toBeNull();
  });
});
