import { describe, expect, it } from 'vitest';
import {
  getLatestNewTransaction,
  getWalletErrorMessage,
} from '../../../src/features/wallet/walletControllerUtils';
import type { WalletData } from '../../../src/services/walletApi';

function buildWalletData(transactionIds: string[]): WalletData {
  return {
    wallet: {
      id: 'wallet-1',
      userId: 'user-1',
      walletType: 'user',
      status: 'active',
      currency: 'JOD',
      autoTopUp: false,
      autoTopUpAmount: 20,
      autoTopUpThreshold: 5,
      paymentMethods: [],
      createdAt: '2026-04-09T00:00:00.000Z',
    },
    balance: 20,
    pendingBalance: 0,
    rewardsBalance: 0,
    total_earned: 0,
    total_spent: 0,
    total_deposited: 0,
    currency: 'JOD',
    pinSet: false,
    autoTopUp: false,
    transactions: transactionIds.map((id, index) => ({
      id,
      type: 'wallet',
      description: `Transaction ${index + 1}`,
      amount: 5,
      createdAt: `2026-04-0${index + 1}T00:00:00.000Z`,
      status: 'completed',
    })),
    activeEscrows: [],
    activeRewards: [],
    subscription: null,
  };
}

describe('walletControllerUtils', () => {
  it('returns a human-friendly message from Error objects', () => {
    expect(
      getWalletErrorMessage(new Error('Wallet request failed'), 'Fallback'),
    ).toBe('Wallet request failed');
  });

  it('falls back when the incoming error is empty or unknown', () => {
    expect(getWalletErrorMessage('', 'Fallback')).toBe('Fallback');
    expect(getWalletErrorMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('detects the newest wallet transaction introduced by a refresh', () => {
    const previousWallet = buildWalletData(['tx-1', 'tx-2']);
    const refreshedWallet = buildWalletData(['tx-3', 'tx-1', 'tx-2']);

    expect(getLatestNewTransaction(previousWallet, refreshedWallet)?.id).toBe('tx-3');
  });

  it('returns null when a refresh does not introduce a new transaction', () => {
    const previousWallet = buildWalletData(['tx-1', 'tx-2']);
    const refreshedWallet = buildWalletData(['tx-1', 'tx-2']);

    expect(getLatestNewTransaction(previousWallet, refreshedWallet)).toBeNull();
  });
});
