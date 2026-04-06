import { describe, expect, it } from 'vitest';

import { getResetPasswordRedirectCandidates } from '@/contexts/AuthContext';

describe('getResetPasswordRedirectCandidates', () => {
  it('includes both common localhost callback URLs during local development', () => {
    const candidates = getResetPasswordRedirectCandidates('http://localhost:3000');

    expect(candidates).toContain('http://localhost:3000/app/auth/callback');
    expect(candidates).toContain('http://localhost:5173/app/auth/callback');
  });

  it('keeps configured non-local origins without duplicating entries', () => {
    const candidates = getResetPasswordRedirectCandidates('https://wasel.jo');

    expect(candidates).toContain('https://wasel.jo/app/auth/callback');
    expect(new Set(candidates).size).toBe(candidates.length);
  });
});
