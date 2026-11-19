/**
 * Tests for src/domain/payments/cliq.ts — Jordan CliQ domain utilities.
 * These functions have zero existing test coverage.
 */
import { describe, it, expect } from 'vitest';
import {
  isValidJordanCliqPhone,
  isValidJordanIban,
  generateJordanCliqDeeplink,
  generateJordanCliqQrPayload,
  type CliqPaymentRequest,
} from '../../src/domain/payments/cliq';

// ── isValidJordanCliqPhone ───────────────────────────────────────────────────

describe('isValidJordanCliqPhone', () => {
  it('passes 077xxxxxxx', () => expect(isValidJordanCliqPhone('0771234567')).toBe(true));
  it('passes 078xxxxxxx', () => expect(isValidJordanCliqPhone('0781234567')).toBe(true));
  it('passes 079xxxxxxx', () => expect(isValidJordanCliqPhone('0791234567')).toBe(true));

  it('passes with +962 prefix', () => expect(isValidJordanCliqPhone('+9627 71 234 567')).toBe(true));
  it('passes with 962 prefix', () => expect(isValidJordanCliqPhone('962771234567')).toBe(true));
  it('passes with 00962 prefix', () => expect(isValidJordanCliqPhone('00962771234567')).toBe(true));

  it('strips spaces and dashes', () => expect(isValidJordanCliqPhone('077 123-4567')).toBe(true));

  it('rejects Iraqi numbers (074)', () => expect(isValidJordanCliqPhone('07412345678')).toBe(false));
  it('rejects landline (06)', () => expect(isValidJordanCliqPhone('064001234')).toBe(false));
  it('rejects empty string', () => expect(isValidJordanCliqPhone('')).toBe(false));
  it('rejects too-short number', () => expect(isValidJordanCliqPhone('07712')).toBe(false));
  it('rejects non-numeric', () => expect(isValidJordanCliqPhone('abcdefghij')).toBe(false));
});

// ── isValidJordanIban ────────────────────────────────────────────────────────

describe('isValidJordanIban', () => {
  it('passes a valid Jordan IBAN', () => {
    // JO: country (2) + check (2) + bank (4) + account (20) = 28 chars
    expect(isValidJordanIban('JO94CBJO0010000000000131000302')).toBe(true);
  });

  it('passes with spaces (strips them)', () => {
    expect(isValidJordanIban('JO94 CBJO 0010 0000 0000 0131 0003 02')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isValidJordanIban('jo94cbjo0010000000000131000302')).toBe(true);
  });

  it('rejects non-JO country code', () => {
    expect(isValidJordanIban('GB29NWBK60161331926819')).toBe(false);
  });

  it('rejects too-short IBAN', () => {
    expect(isValidJordanIban('JO94CBJO001')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidJordanIban('')).toBe(false);
  });
});

// ── generateJordanCliqDeeplink ───────────────────────────────────────────────

describe('generateJordanCliqDeeplink', () => {
  const req: CliqPaymentRequest = {
    identifierType: 'alias',
    identifierValue: 'WASELJO',
    amountJod: 15.5,
    orderOrBookingId: 'booking-001',
  };

  it('starts with the jopacc scheme', () => {
    expect(generateJordanCliqDeeplink(req)).toMatch(/^jopacc:\/\/cliq\?/);
  });

  it('includes type, id, amount, currency and ref', () => {
    const link = generateJordanCliqDeeplink(req);
    expect(link).toContain('type=alias');
    expect(link).toContain('id=WASELJO');
    expect(link).toContain('amount=15.500');
    expect(link).toContain('currency=JOD');
    expect(link).toContain('ref=booking-001');
  });

  it('URL-encodes special characters in identifierValue', () => {
    const special = { ...req, identifierValue: 'WASEL JO' };
    expect(generateJordanCliqDeeplink(special)).toContain('WASEL%20JO');
  });

  it('uses default note when none supplied', () => {
    const link = generateJordanCliqDeeplink(req);
    expect(link).toContain('note=');
    expect(link).toContain('booking-001');
  });

  it('uses supplied note', () => {
    const withNote = { ...req, note: 'Ride payment' };
    const link = generateJordanCliqDeeplink(withNote);
    expect(link).toContain('Ride%20payment');
  });

  it('formats amount to 3 decimal places', () => {
    const link = generateJordanCliqDeeplink({ ...req, amountJod: 5 });
    expect(link).toContain('amount=5.000');
  });
});

// ── generateJordanCliqQrPayload ──────────────────────────────────────────────

describe('generateJordanCliqQrPayload', () => {
  const req: CliqPaymentRequest = {
    identifierType: 'phone',
    identifierValue: '0791234567',
    amountJod: 7.25,
    orderOrBookingId: 'trip-99',
  };

  it('starts with CLIQ_JO', () => {
    expect(generateJordanCliqQrPayload(req)).toMatch(/^CLIQ_JO\|/);
  });

  it('contains all required fields', () => {
    const payload = generateJordanCliqQrPayload(req);
    expect(payload).toContain('TYPE:phone');
    expect(payload).toContain('ID:0791234567');
    expect(payload).toContain('AMT:7.250');
    expect(payload).toContain('CUR:JOD');
    expect(payload).toContain('REF:trip-99');
  });

  it('strips pipe characters from identifierValue (injection prevention)', () => {
    const malicious = { ...req, identifierValue: 'WASEL|AMT:0.001' };
    const payload = generateJordanCliqQrPayload(malicious);
    // The injected AMT:0.001 field should not appear as a separate segment
    const segments = payload.split('|');
    const amtFields = segments.filter(s => s.startsWith('AMT:'));
    expect(amtFields.length).toBe(1);
    expect(amtFields[0]).toBe('AMT:7.250');
  });

  it('strips control characters from ref field', () => {
    const malicious = { ...req, orderOrBookingId: 'trip\x00inject' };
    const payload = generateJordanCliqQrPayload(malicious);
    expect(payload).not.toContain('\x00');
  });

  it('formats amount to 3 decimal places', () => {
    const payload = generateJordanCliqQrPayload({ ...req, amountJod: 10 });
    expect(payload).toContain('AMT:10.000');
  });
});
