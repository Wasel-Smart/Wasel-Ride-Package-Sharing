/**
 * Coverage for src/platform/observability.ts.
 * The existing observability.test.ts covers the basic happy path; this file
 * pins edge cases on createCorrelationId and createStructuredLogEntry.
 */
import { describe, it, expect } from 'vitest';
import { createCorrelationId, createStructuredLogEntry } from '../../src/platform/observability';

describe('createCorrelationId', () => {
  it('uses "req" as the default prefix', () => {
    expect(createCorrelationId()).toMatch(/^req-/);
  });

  it('uses the supplied prefix', () => {
    expect(createCorrelationId('worker')).toMatch(/^worker-/);
    expect(createCorrelationId('payment')).toMatch(/^payment-/);
  });

  it('produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createCorrelationId()));
    expect(ids.size).toBe(100);
  });

  it('contains a timestamp segment', () => {
    // Format: prefix-<timestamp>-<uuid_fragment>
    const id = createCorrelationId('x');
    const parts = id.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(Number(parts[1])).toBeGreaterThan(0);
  });
});

describe('createStructuredLogEntry', () => {
  it('populates all required fields', () => {
    const entry = createStructuredLogEntry('info', 'test message', 'wasel-web');
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.service).toBe('wasel-web');
    expect(typeof entry.requestId).toBe('string');
    expect(entry.requestId.length).toBeGreaterThan(0);
    expect(typeof entry.timestamp).toBe('string');
  });

  it('uses the supplied requestId when provided', () => {
    const entry = createStructuredLogEntry('error', 'oops', 'svc', undefined, 'my-req-id');
    expect(entry.requestId).toBe('my-req-id');
  });

  it('generates a requestId when none is supplied', () => {
    const entry = createStructuredLogEntry('warning', 'warn', 'svc');
    expect(entry.requestId).toMatch(/^req-/);
  });

  it('sanitizes newlines in the message', () => {
    const entry = createStructuredLogEntry('info', 'line1\nline2', 'svc');
    expect(entry.message).not.toContain('\n');
  });

  it('sanitizes string values in context', () => {
    const entry = createStructuredLogEntry('info', 'msg', 'svc', { key: 'val\nue' });
    expect(entry.context?.['key']).not.toContain('\n');
  });

  it('leaves non-string context values intact', () => {
    const entry = createStructuredLogEntry('info', 'msg', 'svc', { count: 42, flag: true });
    expect(entry.context?.['count']).toBe(42);
    expect(entry.context?.['flag']).toBe(true);
  });

  it('omits context when not provided', () => {
    const entry = createStructuredLogEntry('debug', 'msg', 'svc');
    expect(entry.context).toBeUndefined();
  });

  it('produces a valid ISO timestamp', () => {
    const entry = createStructuredLogEntry('info', 'msg', 'svc');
    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('handles all log levels', () => {
    for (const level of ['debug', 'info', 'warning', 'error'] as const) {
      const entry = createStructuredLogEntry(level, 'msg', 'svc');
      expect(entry.level).toBe(level);
    }
  });
});
