import type { PaymentTransaction, Wallet } from '../../../shared/domain-contracts';
import type {
  PaymentIntentStatus,
  WalletPaymentMethod,
  WalletPaymentMethodType,
} from '../../../shared/wallet-contracts';

export const PAYMENT_FLOW_PURPOSES = [
  'ride_payment',
  'package_payment',
  'subscription',
  'deposit',
] as const;

export type PaymentFlowPurpose = (typeof PAYMENT_FLOW_PURPOSES)[number];

export interface PaymentRequestDraft {
  purpose: PaymentFlowPurpose;
  amount: number;
  paymentMethodType: WalletPaymentMethodType;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentConfirmationResult {
  id: string;
  status: PaymentIntentStatus | string;
  settled: boolean;
  clientSecret?: string | null;
}

export interface PaymentIntentSession {
  transaction: PaymentTransaction;
  clientSecret?: string | null;
  redirectUrl?: string | null;
}

export interface PaymentsSummary {
  availableBalance: number;
  paymentMethodsCount: number;
  defaultMethodLabel: string;
  pendingCount: number;
  pendingAmount: number;
  settledThisMonth: number;
}

export interface PaymentsDashboardData {
  wallet: Wallet;
  paymentMethods: WalletPaymentMethod[];
  recentPayments: PaymentTransaction[];
  summary: PaymentsSummary;
}
