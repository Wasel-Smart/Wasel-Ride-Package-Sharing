import { describe, expect, it } from 'vitest';
import { sanitizeEdgeErrorMessage } from '../../../supabase/functions/make-server-0b1f4071/_shared/security-runtime';

describe('sanitizeEdgeErrorMessage', () => {
  it('does not expose provider or database exception messages', () => {
    expect(sanitizeEdgeErrorMessage(new Error('Postgres connection string: postgres://internal'))).toBe(
      'Internal server error',
    );
  });

  it('does not expose raw string errors', () => {
    expect(sanitizeEdgeErrorMessage('Stripe secret configuration is invalid')).toBe(
      'Internal server error',
    );
  });

  it('returns a generic message for unknown values', () => {
    expect(sanitizeEdgeErrorMessage({ detail: 'internal diagnostic' })).toBe(
      'Internal server error',
    );
  });
});
