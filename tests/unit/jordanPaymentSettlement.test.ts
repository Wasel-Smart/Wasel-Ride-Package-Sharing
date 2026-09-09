import { describe, it, expect } from 'vitest';
import {
  isValidJordanCliqPhone,
  isValidJordanIban,
  generateJordanCliqDeeplink,
  generateJordanCliqQrPayload,
} from '@/domain/payments/cliq';
import { SettlementLedger } from '@/domain/payments/settlement';

describe('Jordan CliQ Payments (JoPACC Standard)', () => {
  it('validates Jordanian CliQ phone numbers accurately', () => {
    expect(isValidJordanCliqPhone('0791234567')).toBe(true);
    expect(isValidJordanCliqPhone('0789876543')).toBe(true);
    expect(isValidJordanCliqPhone('0771122334')).toBe(true);
    expect(isValidJordanCliqPhone('+962791234567')).toBe(true);
    expect(isValidJordanCliqPhone('00962789876543')).toBe(true);

    // Invalid numbers
    expect(isValidJordanCliqPhone('0761234567')).toBe(false); // Invalid prefix
    expect(isValidJordanCliqPhone('123456')).toBe(false);      // Too short
    expect(isValidJordanCliqPhone('079123456789')).toBe(false); // Too long
  });

  it('validates Jordanian IBAN format', () => {
    expect(isValidJordanIban('JO21ABCO0000000000000000000000')).toBe(true);
    expect(isValidJordanIban('JO99ETHB1234567890123456789012')).toBe(true);
    expect(isValidJordanIban('US21ABCO0000000000000000000000')).toBe(false); // Not JO
    expect(isValidJordanIban('JO21ABCO123')).toBe(false);                      // Too short
  });

  it('generates a compliant JoPACC deep link for banking apps', () => {
    const link = generateJordanCliqDeeplink({
      identifierType: 'alias',
      identifierValue: 'WASELSMART',
      amountJod: 12.5,
      orderOrBookingId: 'PKG-7712',
    });

    expect(link).toContain('jopacc://cliq');
    expect(link).toContain('type=alias');
    expect(link).toContain('id=WASELSMART');
    expect(link).toContain('amount=12.500');
    expect(link).toContain('currency=JOD');
    expect(link).toContain('ref=PKG-7712');
  });

  it('generates a scan-ready QR code payload', () => {
    const qrText = generateJordanCliqQrPayload({
      identifierType: 'phone',
      identifierValue: '0795551234',
      amountJod: 8.25,
      orderOrBookingId: 'RIDE-1049',
    });

    expect(qrText).toBe('CLIQ_JO|TYPE:phone|ID:0795551234|AMT:8.250|CUR:JOD|REF:RIDE-1049');
  });
});

describe('Double-Entry Cash-on-Delivery (COD) Settlement Ledger', () => {
  it('correctly creates balanced postings for completed COD package deliveries', () => {
    const postings = SettlementLedger.recordPackageDeliveryCod({
      packageId: 'PKG-2001',
      courierId: 'DRIVER-88',
      merchantId: 'STORE-AMMAN-4',
      totalCodCollectedJod: 35.000,
      deliveryFeeJod: 3.500,
      now: '2026-09-09T05:00:00.000Z',
    });

    expect(postings).toHaveLength(3);

    // 1. Courier Cash Holding = +35.000 (Debit)
    const cashEntry = postings.find(p => p.debitAccount === 'COURIER_CASH_HOLDING');
    expect(cashEntry?.amountJod).toBe(35);

    // 2. Wasel Commission = +3.500 (Credit)
    const feeEntry = postings.find(p => p.creditAccount === 'PLATFORM_COMMISSION');
    expect(feeEntry?.amountJod).toBe(3.5);

    // 3. Merchant Net Payout = +31.500 (Credit)
    const merchantEntry = postings.find(p => p.creditAccount === 'MERCHANT_PAYABLE');
    expect(merchantEntry?.amountJod).toBe(31.5);

    // Verify zero-sum invariant
    expect(SettlementLedger.verifyZeroSum(postings)).toBe(true);
  });

  it('correctly records cash ride commission', () => {
    const postings = SettlementLedger.recordCashRideCompletion({
      tripId: 'TRIP-990',
      driverId: 'DRIVER-42',
      riderId: 'RIDER-19',
      totalFareJod: 10.000,
      platformCommissionJod: 1.500,
      now: '2026-09-09T05:00:00.000Z',
    });

    expect(postings).toHaveLength(1);
    expect(postings[0].debitAccount).toBe('COURIER_CASH_HOLDING');
    expect(postings[0].creditAccount).toBe('PLATFORM_COMMISSION');
    expect(postings[0].amountJod).toBe(1.5);
    expect(SettlementLedger.verifyZeroSum(postings)).toBe(true);
  });
});
