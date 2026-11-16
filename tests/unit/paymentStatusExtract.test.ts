import { describe, it, expect } from 'vitest';
import { extractPaymentStatus } from '@/services/payment';

describe('extractPaymentStatus', () => {
  it('returns string status lowercased', () => {
    expect(extractPaymentStatus('Succeeded')).toBe('succeeded');
    expect(extractPaymentStatus('FAILED')).toBe('failed');
    expect(extractPaymentStatus('pending')).toBe('pending');
  });

  it('returns unknown for empty string', () => {
    expect(extractPaymentStatus('')).toBe('unknown');
  });

  it('reads paymentStatus from object', () => {
    expect(extractPaymentStatus({ paymentStatus: 'succeeded' })).toBe('succeeded');
  });

  it('reads payment_status from object', () => {
    expect(extractPaymentStatus({ payment_status: 'paid' })).toBe('paid');
  });

  it('reads status from object', () => {
    expect(extractPaymentStatus({ status: 'completed' })).toBe('completed');
  });

  it('prefers paymentStatus over status', () => {
    expect(extractPaymentStatus({ paymentStatus: 'succeeded', status: 'pending' })).toBe('succeeded');
  });

  it('returns unknown for null', () => {
    expect(extractPaymentStatus(null)).toBe('unknown');
  });

  it('returns unknown for undefined', () => {
    expect(extractPaymentStatus(undefined)).toBe('unknown');
  });

  it('returns unknown for object with no recognized key', () => {
    expect(extractPaymentStatus({ foo: 'bar' })).toBe('unknown');
  });

  it('returns unknown for object with empty paymentStatus', () => {
    expect(extractPaymentStatus({ paymentStatus: '' })).toBe('unknown');
  });

  it('trims whitespace from string status', () => {
    expect(extractPaymentStatus('  succeeded  ')).toBe('succeeded');
  });

  it('handles succeeded status for success set membership', () => {
    const successStatuses = ['succeeded', 'paid', 'completed'];
    for (const s of successStatuses) {
      expect(extractPaymentStatus(s)).toBe(s);
    }
  });

  it('handles failure statuses', () => {
    const failStatuses = ['failed', 'canceled', 'cancelled'];
    for (const s of failStatuses) {
      expect(extractPaymentStatus(s)).toBe(s);
    }
  });
});
