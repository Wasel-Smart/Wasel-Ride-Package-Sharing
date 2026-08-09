import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  toNumber,
  buildDefaultLocalWalletRecord,
  normalizeLocalWalletRecord,
  readLocalWalletRecord,
  writeLocalWalletRecord,
  buildWalletPayloadFromLocal,
  buildInsightsFromTransactions,
  toWalletTransaction,
  describeTransaction,
} from '../wallet/walletLocalStorage';
import type { TransactionRow } from '../wallet/walletTypes';

describe('walletLocalStorage', () => {
  beforeEach(() => globalThis.localStorage.clear());
  afterEach(() => globalThis.localStorage.clear());

  describe('toNumber', () => {
    it('converts valid numbers', () => expect(toNumber(42)).toBe(42));
    it('returns fallback for NaN', () => expect(toNumber('abc', 5)).toBe(5));
    it('returns fallback for null', () => expect(toNumber(null, 3)).toBe(3));
    it('returns fallback for undefined', () => expect(toNumber(undefined, 7)).toBe(7));
    it('handles string numbers', () => expect(toNumber('12.5')).toBe(12.5));
  });

  describe('buildDefaultLocalWalletRecord', () => {
    it('returns a valid record with JOD currency', () => {
      const record = buildDefaultLocalWalletRecord('user-1');
      expect(record.userId).toBe('user-1');
      expect(record.currency).toBe('JOD');
      expect(record.balance).toBe(0);
      expect(record.pinSet).toBe(false);
      expect(Array.isArray(record.transactions)).toBe(true);
    });
  });

  describe('normalizeLocalWalletRecord', () => {
    it('falls back to default for null input', () => {
      const record = normalizeLocalWalletRecord('user-1', null);
      expect(record.userId).toBe('user-1');
      expect(record.currency).toBe('JOD');
    });

    it('normalizes currency to uppercase', () => {
      const record = normalizeLocalWalletRecord('user-1', { currency: 'jod' });
      expect(record.currency).toBe('JOD');
    });

    it('coerces balance to number', () => {
      const record = normalizeLocalWalletRecord('user-1', { balance: '55.5' });
      expect(record.balance).toBe(55.5);
    });

    it('normalizes transaction array', () => {
      const record = normalizeLocalWalletRecord('user-1', {
        transactions: [{ id: 'tx-1', type: 'add_funds', description: 'Top-up', amount: 10, createdAt: new Date().toISOString() }],
      });
      expect(record.transactions).toHaveLength(1);
      expect(record.transactions[0]?.type).toBe('add_funds');
    });
  });

  describe('readLocalWalletRecord / writeLocalWalletRecord', () => {
    it('round-trips a record through localStorage', () => {
      const defaults = buildDefaultLocalWalletRecord('user-2');
      const written = writeLocalWalletRecord('user-2', { ...defaults, balance: 99 });
      expect(written.balance).toBe(99);

      const read = readLocalWalletRecord('user-2');
      expect(read.balance).toBe(99);
      expect(read.userId).toBe('user-2');
    });

    it('returns default when localStorage is empty', () => {
      const record = readLocalWalletRecord('user-new');
      expect(record.balance).toBe(0);
    });
  });

  describe('buildWalletPayloadFromLocal', () => {
    it('builds a valid WalletData from a local record', () => {
      const record = buildDefaultLocalWalletRecord('user-3');
      const payload = buildWalletPayloadFromLocal(record);
      expect(payload.balance).toBe(0);
      expect(payload.currency).toBe('JOD');
      expect(payload.wallet.status).toBe('active');
      expect(Array.isArray(payload.transactions)).toBe(true);
    });

    it('sorts transactions newest-first', () => {
      const record = buildDefaultLocalWalletRecord('user-3');
      record.transactions = [
        { id: 'old', type: 'add_funds', description: 'Old', amount: 5, createdAt: '2026-01-01T00:00:00Z' },
        { id: 'new', type: 'add_funds', description: 'New', amount: 10, createdAt: '2026-06-01T00:00:00Z' },
      ];
      const payload = buildWalletPayloadFromLocal(record);
      expect(payload.transactions[0]?.id).toBe('new');
    });
  });

  describe('describeTransaction', () => {
    it('uses metadata description when present', () => {
      const row: TransactionRow = { transaction_type: 'add_funds', metadata: { description: 'Custom label' } };
      expect(describeTransaction(row)).toBe('Custom label');
    });

    it('falls back to type label', () => {
      expect(describeTransaction({ transaction_type: 'withdrawal' })).toBe('Wallet withdrawal');
      expect(describeTransaction({ transaction_type: 'ride_payment' })).toBe('Ride payment');
      expect(describeTransaction({ transaction_type: 'driver_earning' })).toBe('Driver earnings');
    });

    it('returns generic label for unknown type', () => {
      expect(describeTransaction({ transaction_type: 'unknown_type' })).toBe('Wallet transaction');
    });
  });

  describe('toWalletTransaction', () => {
    it('signs debit amounts as negative', () => {
      const row: TransactionRow = { transaction_id: 'tx-1', amount: 10, direction: 'debit', transaction_type: 'ride_payment', created_at: new Date().toISOString() };
      const tx = toWalletTransaction(row);
      expect(tx.amount).toBe(-10);
    });

    it('signs credit amounts as positive', () => {
      const row: TransactionRow = { transaction_id: 'tx-2', amount: 20, direction: 'credit', transaction_type: 'add_funds', created_at: new Date().toISOString() };
      const tx = toWalletTransaction(row);
      expect(tx.amount).toBe(20);
    });
  });

  describe('buildInsightsFromTransactions', () => {
    it('returns zeroed insights for empty array', () => {
      const insights = buildInsightsFromTransactions([]);
      expect(insights.totalTransactions).toBe(0);
      expect(insights.thisMonthSpent).toBe(0);
      expect(insights.carbonSaved).toBe(0);
    });

    it('calculates thisMonthSpent correctly', () => {
      const now = new Date().toISOString();
      const insights = buildInsightsFromTransactions([
        { id: '1', type: 'ride_payment', description: 'Ride', amount: -15, createdAt: now },
        { id: '2', type: 'add_funds', description: 'Top-up', amount: 50, createdAt: now },
      ]);
      expect(insights.thisMonthSpent).toBe(15);
      expect(insights.thisMonthEarned).toBe(50);
    });

    it('computes carbonSaved as transactions * 1.5 rounded', () => {
      const now = new Date().toISOString();
      const txs = Array.from({ length: 4 }, (_, i) => ({
        id: String(i), type: 'ride_payment', description: '', amount: -5, createdAt: now,
      }));
      const insights = buildInsightsFromTransactions(txs);
      expect(insights.carbonSaved).toBe(6);
    });
  });
});
