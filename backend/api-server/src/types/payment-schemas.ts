import { z } from 'zod';

export const PaymentChargeSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  methodId: z.string().uuid().optional(),
  rideId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PaymentChargeInput = z.infer<typeof PaymentChargeSchema>;

export const PaymentRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export type PaymentRefundInput = z.infer<typeof PaymentRefundSchema>;

export const PaymentVerifySchema = z.object({
  providerTransactionId: z.string().min(1),
  methodId: z.string().uuid().optional(),
});

export type PaymentVerifyInput = z.infer<typeof PaymentVerifySchema>;
