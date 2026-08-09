export type WalletRow = {
  wallet_id?: string;
  user_id?: string;
  balance?: number | string | null;
  pending_balance?: number | string | null;
  wallet_status?: string | null;
  currency_code?: string | null;
  auto_top_up_enabled?: boolean | null;
  auto_top_up_amount?: number | string | null;
  auto_top_up_threshold?: number | string | null;
  pin_hash?: string | null;
  created_at?: string | null;
};

export type TransactionRow = {
  transaction_id?: string;
  amount?: number | string | null;
  direction?: string | null;
  transaction_type?: string | null;
  transaction_status?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PaymentMethodRow = {
  id?: string;
  payment_method_id?: string;
  method_type?: string | null;
  provider?: string | null;
  token_reference?: string | null;
  is_default?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export interface PaymentMethodInput {
  id?: string;
  type: string;
  provider: string;
  last4?: string;
  token_reference?: string | null;
  is_default?: boolean;
  [key: string]: unknown;
}

export interface WalletEscrow {
  escrowId?: string;
  bookingId?: string;
  payerId?: string;
  payeeId?: string;
  amount: number;
  currency?: string;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  createdAt?: string;
  releasedAt?: string | null;
  [key: string]: unknown;
}

export interface WalletSummary {
  id: string | null;
  userId: string | null;
  walletType?: string;
  status: string;
  currency: string;
  autoTopUp: boolean;
  autoTopUpAmount: number;
  autoTopUpThreshold: number;
  paymentMethods: PaymentMethodRow[];
  createdAt: string | null;
}

export type RewardItem = {
  id: string;
  description: string;
  amount: number;
  expirationDate: string;
};

export interface WalletTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  createdAt: string;
  status?: string;
}

export interface WalletSubscription {
  id: string;
  status: string;
  plan: string;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
}

export interface WalletData {
  wallet: WalletSummary;
  balance: number;
  pendingBalance: number;
  rewardsBalance: number;
  total_earned: number;
  total_spent: number;
  total_deposited: number;
  currency: string;
  pinSet: boolean;
  autoTopUp: boolean;
  transactions: WalletTransaction[];
  activeEscrows: WalletEscrow[];
  activeRewards: RewardItem[];
  subscription: WalletSubscription | null;
}

export interface WalletCapabilities {
  topUp: boolean;
  rewardClaim: boolean;
  subscription: boolean;
  pin: boolean;
  send: boolean;
  withdraw: boolean;
  autoTopUp: boolean;
}

export interface InsightsData {
  thisMonthSpent: number;
  lastMonthSpent: number;
  thisMonthEarned: number;
  changePercent: number;
  categoryBreakdown: Record<string, number>;
  monthlyTrend: { month: string; spent: number; earned: number }[];
  totalTransactions: number;
  carbonSaved: number;
}

export type LocalWalletRecord = {
  userId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  autoTopUpEnabled: boolean;
  autoTopUpAmount: number;
  autoTopUpThreshold: number;
  pinSet: boolean;
  paymentMethods: PaymentMethodRow[];
  transactions: WalletTransaction[];
  createdAt: string;
  updatedAt: string;
};
