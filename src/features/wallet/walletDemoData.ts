import type { WaselUser } from '../../contexts/LocalAuth';
import type { InsightsData, WalletData } from '../../services/walletApi';

export function createDemoWalletData(user: WaselUser | null): WalletData {
  const baseBalance = typeof user?.balance === 'number' ? user.balance : 145.75;
  const createdAt = user?.joinedAt ? `${user.joinedAt}T09:00:00.000Z` : '2025-01-15T09:00:00.000Z';

  return {
    wallet: {
      id: `wallet-${user?.id ?? 'guest'}`,
      walletType: user?.role === 'driver' ? 'driver' : 'user',
      createdAt,
      autoTopUp: false,
      autoTopUpAmount: 20,
      autoTopUpThreshold: 5,
    },
    balance: baseBalance,
    pendingBalance: 30,
    rewardsBalance: 12.5,
    total_earned: 156.5,
    total_spent: 42,
    total_deposited: 175,
    currency: 'JOD',
    pinSet: false,
    autoTopUp: false,
    transactions: [
      { id: 'tx-demo-1', type: 'earning', description: 'Trip to Aqaba', amount: 25.5, createdAt: '2026-03-16T13:20:00.000Z' },
      { id: 'tx-demo-2', type: 'payment', description: 'Wasel delivery fee', amount: -8, createdAt: '2026-03-12T10:10:00.000Z' },
      { id: 'tx-demo-3', type: 'topup', description: 'Top up via CliQ', amount: 50, createdAt: '2026-03-08T18:40:00.000Z' },
      { id: 'tx-demo-4', type: 'reward', description: 'Ramadan cashback', amount: 6.25, createdAt: '2026-03-03T16:00:00.000Z' },
    ],
    activeEscrows: [
      { id: 'escrow-demo-1', type: 'ride', tripId: 'TRIP-948233', amount: 14 },
    ],
    activeRewards: [
      { id: 'reward-demo-1', description: '5 JOD loyalty cashback', amount: 5, expirationDate: '2026-04-15T00:00:00.000Z' },
    ],
    subscription: {
      planName: 'Wasel Plus',
      status: 'active',
      renewalDate: '2026-04-20T00:00:00.000Z',
    },
  };
}

export function createDemoInsights(wallet: WalletData): InsightsData {
  return {
    thisMonthSpent: wallet.total_spent,
    lastMonthSpent: 36,
    thisMonthEarned: wallet.total_earned,
    changePercent: 17,
    categoryBreakdown: {
      rides: 21,
      delivery: 9,
      wallet_fees: 5,
      rewards: 7,
    },
    monthlyTrend: [
      { month: 'Nov', spent: 18, earned: 72 },
      { month: 'Dec', spent: 27, earned: 88 },
      { month: 'Jan', spent: 31, earned: 94 },
      { month: 'Feb', spent: 36, earned: 101 },
      { month: 'Mar', spent: wallet.total_spent, earned: wallet.total_earned },
    ],
    totalTransactions: wallet.transactions.length,
    carbonSaved: 42,
  };
}

export function prependTransaction(wallet: WalletData, tx: Record<string, unknown>): WalletData {
  return {
    ...wallet,
    transactions: [tx, ...wallet.transactions],
  };
}
