export const WALLET_PAYMENT_METHOD_TYPES = [
  'card',
  'wallet',
  'bank_transfer',
  'cliq',
] as const;

export type WalletPaymentMethodType = (typeof WALLET_PAYMENT_METHOD_TYPES)[number];

export const WALLET_PROVIDER_NAMES = [
  'stripe',
  'cliq',
  'aman',
  'wallet',
] as const;

export type WalletProviderName = (typeof WALLET_PROVIDER_NAMES)[number];

export const WALLET_TRANSACTION_TYPES = [
  'deposit',
  'withdrawal',
  'transfer',
  'escrow_hold',
  'escrow_release',
  'refund',
  'payment',
] as const;

export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const WALLET_TRANSACTION_STATUSES = [
  'pending',
  'processing',
  'requires_action',
  'authorized',
  'posted',
  'completed',
  'failed',
  'refunded',
  'cancelled',
] as const;

export type WalletTransactionStatus = (typeof WALLET_TRANSACTION_STATUSES)[number];

export const PAYMENT_INTENT_PURPOSES = [
  'deposit',
  'ride_payment',
  'package_payment',
  'subscription',
  'withdrawal',
] as const;

export type PaymentIntentPurpose = (typeof PAYMENT_INTENT_PURPOSES)[number];

export const PAYMENT_INTENT_STATUSES = [
  'created',
  'requires_confirmation',
  'requires_action',
  'processing',
  'webhook_received',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export const ESCROW_STATUSES = [
  'pending',
  'held',
  'released',
  'refunded',
  'cancelled',
] as const;

export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

export const PAYOUT_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const STEP_UP_PURPOSES = [
  'transfer',
  'withdrawal',
  'payment_method',
  'deposit',
  'subscription',
] as const;

export type StepUpPurpose = (typeof STEP_UP_PURPOSES)[number];

export const STEP_UP_CHANNELS = ['email', 'sms'] as const;

export type StepUpChannel = (typeof STEP_UP_CHANNELS)[number];

export function isWalletPaymentMethodType(value: unknown): value is WalletPaymentMethodType {
  return typeof value === 'string' && WALLET_PAYMENT_METHOD_TYPES.includes(value as WalletPaymentMethodType);
}

export function isWalletProviderName(value: unknown): value is WalletProviderName {
  return typeof value === 'string' && WALLET_PROVIDER_NAMES.includes(value as WalletProviderName);
}

export function isWalletTransactionType(value: unknown): value is WalletTransactionType {
  return typeof value === 'string' && WALLET_TRANSACTION_TYPES.includes(value as WalletTransactionType);
}

export function isPaymentIntentPurpose(value: unknown): value is PaymentIntentPurpose {
  return typeof value === 'string' && PAYMENT_INTENT_PURPOSES.includes(value as PaymentIntentPurpose);
}

export function isStepUpPurpose(value: unknown): value is StepUpPurpose {
  return typeof value === 'string' && STEP_UP_PURPOSES.includes(value as StepUpPurpose);
}

export interface WalletPaymentMethod {
  id: string;
  type: WalletPaymentMethodType;
  provider: WalletProviderName;
  label: string;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  status: 'active' | 'pending_verification' | 'disabled';
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  description: string;
  amount: number;
  createdAt: string;
  status: WalletTransactionStatus;
  counterpartyUserId?: string | null;
  paymentIntentId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface WalletEscrow {
  id: string;
  type: 'ride' | 'package';
  amount: number;
  tripId: string | null;
  status: EscrowStatus;
  createdAt?: string | null;
}

export interface WalletSubscription {
  id: string;
  planName: string;
  price: number;
  status: SubscriptionStatus;
  renewalDate: string | null;
  type?: 'plus' | 'commuter-pass';
  corridorId?: string | null;
  corridorLabel?: string | null;
  benefits?: string[];
}

export interface WalletAccountSummary {
  id: string | null;
  userId: string | null;
  walletType: 'custodial';
  status: 'active' | 'limited' | 'suspended' | 'closed';
  currency: string;
  autoTopUp: boolean;
  autoTopUpAmount: number;
  autoTopUpThreshold: number;
  paymentMethods: WalletPaymentMethod[];
  createdAt: string | null;
}

export interface WalletData {
  wallet: WalletAccountSummary;
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
  activeRewards: Array<{
    id: string;
    description: string;
    amount: number;
    expirationDate: string;
  }>;
  subscription: WalletSubscription | null;
}

export interface WalletStepUpVerification {
  purpose: StepUpPurpose;
  verified: boolean;
  otpRequired: boolean;
  challengeId?: string;
  verificationToken?: string;
  expiresAt?: string;
  deliveryChannel?: StepUpChannel;
  maskedDestination?: string | null;
}

export interface PaymentIntentView {
  id: string;
  purpose: PaymentIntentPurpose;
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  paymentMethodType: WalletPaymentMethodType;
  provider: WalletProviderName;
  clientSecret?: string | null;
  redirectUrl?: string | null;
  createdAt: string;
  referenceType?: string | null;
  referenceId?: string | null;
}
