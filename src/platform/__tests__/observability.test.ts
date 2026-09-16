import { describe, it, expect } from 'vitest';
import { createStructuredLogEntry, createCorrelationId } from '../observability';

describe('Observability', () => {
  it('creates a log entry with required fields', () => {
    const entry = createStructuredLogEntry('info', 'test message', 'test-service');
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.service).toBe('test-service');
    expect(entry.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.requestId).toMatch(/^req-/);
  });

  it('accepts an optional requestId', () => {
    const entry = createStructuredLogEntry('error', 'err', 'svc', undefined, 'my-req');
    expect(entry.requestId).toBe('my-req');
  });

  it('includes context when provided', () => {
    const entry = createStructuredLogEntry('info', 'msg', 'svc', { key: 'value' });
    expect(entry.context).toBeDefined();
    expect(entry.context?.key).toBe('value');
  });

  it('generates unique correlation IDs', () => {
    const id1 = createCorrelationId('req');
    const id2 = createCorrelationId('req');
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^req-/);
  });
});