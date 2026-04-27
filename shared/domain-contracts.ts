import type {
  PaymentIntentStatus,
  WalletData,
  WalletPaymentMethodType,
  WalletProviderName,
  WalletTransactionStatus,
} from './wallet-contracts';

export interface Wallet extends WalletData {}

export const PAYMENT_TRANSACTION_KINDS = [
  'deposit',
  'withdrawal',
  'transfer',
  'ride_payment',
  'package_payment',
  'subscription',
  'refund',
] as const;

export type PaymentTransactionKind = (typeof PAYMENT_TRANSACTION_KINDS)[number];
export type PaymentTransactionStatus = PaymentIntentStatus | WalletTransactionStatus;

export interface PaymentTransaction {
  id: string;
  kind: PaymentTransactionKind;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  description: string;
  direction: 'credit' | 'debit';
  paymentMethodType: WalletPaymentMethodType;
  provider: WalletProviderName;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
  meta: Readonly<Record<string, unknown>>;
}

export function isPaymentTransactionKind(value: unknown): value is PaymentTransactionKind {
  return typeof value === 'string' && PAYMENT_TRANSACTION_KINDS.includes(value as PaymentTransactionKind);
}

export const NOTIFICATION_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export type NotificationSource = 'local' | 'server';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  read: boolean;
  created_at: string;
  priority?: NotificationPriority;
  action_url?: string;
  source?: NotificationSource;
}
