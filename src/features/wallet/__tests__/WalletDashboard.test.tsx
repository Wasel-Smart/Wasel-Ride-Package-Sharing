import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WalletDashboard } from '../WalletDashboard';

// Mock dependency modules
vi.mock('../../services/walletApi', () => ({
  walletApi: {
    getWalletSummary: vi.fn(async () => ({
      id: 'wallet-123',
      userId: 'user-1',
      status: 'active',
      currency: 'JOD',
      autoTopUp: false,
      autoTopUpAmount: 10,
      autoTopUpThreshold: 5,
      paymentMethods: [],
      createdAt: null,
    })),
    getBalance: vi.fn(async () => 15.5),
    getTransactions: vi.fn(async () => []),
    getPaymentMethods: vi.fn(async () => []),
  },
}));

vi.mock('../../contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => key,
  }),
}));

describe('WalletDashboard Component', () => {
  it('renders successfully', async () => {
    render(<WalletDashboard />);
    // Just verify the initial component render is safe
    const heading = screen.getByText(/wallet/i) || screen.getByText(/balance/i);
    expect(heading).toBeDefined();
  });
});
