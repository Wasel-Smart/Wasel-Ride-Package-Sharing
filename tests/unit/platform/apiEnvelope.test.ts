import { describe, expect, it } from 'vitest';
import {
  createErrorEnvelope,
  createSuccessEnvelope,
  isApiEnvelope,
  unwrapApiEnvelope,
} from '../../../src/platform/api-envelope';

describe('api envelope', () => {
  it('unwraps success envelopes', () => {
    const envelope = createSuccessEnvelope({ ok: true }, { version: 'v1' });
    expect(unwrapApiEnvelope(envelope)).toEqual({ ok: true });
  });

  it('throws normalized errors for failed envelopes', () => {
    const envelope = createErrorEnvelope('Nope', 'bad_request');
    expect(() => unwrapApiEnvelope(envelope)).toThrow('Nope');
  });

  it('detects envelope shape', () => {
    expect(isApiEnvelope(createSuccessEnvelope({ id: 1 }))).toBe(true);
    expect(isApiEnvelope({ id: 1 })).toBe(false);
  });
});
