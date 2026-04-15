import { z } from 'zod';
import {
  ESCROW_STATUSES,
  PAYMENT_INTENT_PURPOSES,
  PAYMENT_INTENT_STATUSES,
  STEP_UP_CHANNELS,
  STEP_UP_PURPOSES,
  SUBSCRIPTION_STATUSES,
  WALLET_PAYMENT_METHOD_TYPES,
  WALLET_PROVIDER_NAMES,
  WALLET_TRANSACTION_STATUSES,
  WALLET_TRANSACTION_TYPES,
} from '../../shared/wallet-contracts';

export const WALLET_CONTRACT_VERSION = '2026-04-15';

const walletPaymentMethodSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WALLET_PAYMENT_METHOD_TYPES),
  provider: z.enum(WALLET_PROVIDER_NAMES),
  label: z.string().min(1),
  last4: z.string().nullable(),
  expiryMonth: z.number().int().nullable(),
  expiryYear: z.number().int().nullable(),
  isDefault: z.boolean(),
  status: z.enum(['active', 'pending_verification', 'disabled']),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const walletTransactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WALLET_TRANSACTION_TYPES),
  description: z.string().min(1),
  amount: z.number().finite(),
  createdAt: z.string().min(1),
  status: z.enum(WALLET_TRANSACTION_STATUSES),
  counterpartyUserId: z.string().nullable().optional(),
  paymentIntentId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

const walletEscrowSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['ride', 'package']),
  amount: z.number().finite(),
  tripId: z.string().nullable(),
  status: z.enum(ESCROW_STATUSES),
  createdAt: z.string().nullable().optional(),
});

const walletSubscriptionSchema = z.object({
  id: z.string().min(1),
  planName: z.string().min(1),
  price: z.number().finite(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  renewalDate: z.string().nullable(),
  type: z.enum(['plus', 'commuter-pass']).optional(),
  corridorId: z.string().nullable().optional(),
  corridorLabel: z.string().nullable().optional(),
  benefits: z.array(z.string()).optional(),
});

const walletAccountSummarySchema = z.object({
  id: z.string().nullable(),
  userId: z.string().nullable(),
  walletType: z.enum(['custodial']),
  status: z.enum(['active', 'limited', 'suspended', 'closed']),
  currency: z.string().min(1),
  autoTopUp: z.boolean(),
  autoTopUpAmount: z.number().finite(),
  autoTopUpThreshold: z.number().finite(),
  paymentMethods: z.array(walletPaymentMethodSchema),
  createdAt: z.string().nullable(),
});

export const walletDataSchema = z.object({
  wallet: walletAccountSummarySchema,
  balance: z.number().finite(),
  pendingBalance: z.number().finite(),
  rewardsBalance: z.number().finite(),
  total_earned: z.number().finite(),
  total_spent: z.number().finite(),
  total_deposited: z.number().finite(),
  currency: z.string().min(1),
  pinSet: z.boolean(),
  autoTopUp: z.boolean(),
  transactions: z.array(walletTransactionSchema),
  activeEscrows: z.array(walletEscrowSchema),
  activeRewards: z.array(
    z.object({
      id: z.string().min(1),
      description: z.string().min(1),
      amount: z.number().finite(),
      expirationDate: z.string().min(1),
    }),
  ),
  subscription: walletSubscriptionSchema.nullable(),
});

export const walletStepUpVerificationSchema = z.object({
  purpose: z.enum(STEP_UP_PURPOSES),
  verified: z.boolean(),
  otpRequired: z.boolean(),
  challengeId: z.string().optional(),
  verificationToken: z.string().optional(),
  expiresAt: z.string().optional(),
  deliveryChannel: z.enum(STEP_UP_CHANNELS).optional(),
  maskedDestination: z.string().nullable().optional(),
});

export const paymentIntentViewSchema = z.object({
  id: z.string().min(1),
  purpose: z.enum(PAYMENT_INTENT_PURPOSES),
  status: z.enum(PAYMENT_INTENT_STATUSES),
  amount: z.number().finite(),
  currency: z.string().min(1),
  paymentMethodType: z.enum(WALLET_PAYMENT_METHOD_TYPES),
  provider: z.enum(WALLET_PROVIDER_NAMES),
  clientSecret: z.string().nullable().optional(),
  redirectUrl: z.string().nullable().optional(),
  createdAt: z.string().min(1),
  referenceType: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
});

export const paymentIntentConfirmationSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  settled: z.boolean(),
  clientSecret: z.string().nullable().optional(),
});
