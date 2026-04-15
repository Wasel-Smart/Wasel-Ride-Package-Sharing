import { z } from 'zod';

export const GROWTH_CONTRACT_VERSION = '2026-04-15';

export const growthEventRecordSchema = z.object({
  eventName: z.string().min(1),
  funnelStage: z.string().min(1),
  serviceType: z.enum(['ride', 'bus', 'package', 'referral', 'wallet']),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  valueJod: z.number().finite().optional(),
  createdAt: z.string().min(1),
});

export const growthEventFeedSchema = z.array(growthEventRecordSchema);

export const referralSnapshotSchema = z.object({
  code: z.string().min(1),
  invited: z.number().int().nonnegative(),
  converted: z.number().int().nonnegative(),
  pendingCredit: z.number().finite().nonnegative(),
  earnedCredit: z.number().finite().nonnegative(),
  shareUrl: z.string().min(1),
});

const funnelSchema = z.object({
  searched: z.number().int().nonnegative(),
  selected: z.number().int().nonnegative(),
  booked: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
});

const serviceMixSchema = z.object({
  rides: z.number().int().nonnegative(),
  buses: z.number().int().nonnegative(),
  packages: z.number().int().nonnegative(),
  referrals: z.number().int().nonnegative(),
});

const corridorMetricSchema = z.object({
  corridor: z.string().min(1),
  demand: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
});

export const growthDashboardSchema = z.object({
  funnel: funnelSchema,
  serviceMix: serviceMixSchema,
  revenueJod: z.number().finite().nonnegative(),
  activeDemand: z.number().int().nonnegative(),
  topCorridors: z.array(corridorMetricSchema),
});

export type GrowthEventRecordContract = z.infer<typeof growthEventRecordSchema>;
export type GrowthDashboardContract = z.infer<typeof growthDashboardSchema>;
export type ReferralSnapshotContract = z.infer<typeof referralSnapshotSchema>;
