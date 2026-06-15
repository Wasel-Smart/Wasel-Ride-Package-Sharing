import { describe, expect, it } from 'vitest';
import {
  createCorrelationId,
  createStructuredLogEntry,
} from '../../../src/platform/observability';

describe('observability helpers', () => {
  it('creates correlation ids with the expected prefix', () => {
    expect(createCorrelationId('test')).toMatch(/^test-/);
  });

  it('builds structured log entries', () => {
    const entry = createStructuredLogEntry('info', 'hello', 'wasel-web', {
      route: '/app/find-ride',
    });

    expect(entry.level).toBe('info');
    expect(entry.service).toBe('wasel-web');
    expect(entry.context).toEqual({ route: '/app/find-ride' });
  });
});
