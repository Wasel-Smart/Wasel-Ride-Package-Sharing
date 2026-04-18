// ─── directSupabase/index.ts ──────────────────────────────────────────────────
// Barrel re-export — all existing imports of `./directSupabase` continue to
// resolve here without any changes to call sites.

export type {
  DbClient,
  DriverRow,
  RawBooking,
  RawCommunicationDelivery,
  RawCommunicationPreferences,
  RawDemandAlert,
  RawGrowthEvent,
  RawNotification,
  RawAutomationJob,
  RawPackage,
  RawPricingSnapshot,
  RawProfile,
  RawReferral,
  RawRouteReminder,
  RawSupportTicket,
  RawSupportTicketEvent,
  RawVerificationRecord,
  TripRow,
  UserContext,
  UserRow,
  WalletRow,
} from './types';

export { supabase } from '../../utils/supabase/client';
export { getDb, toNumber, mapProfileFromContext, buildTrustLikeUser } from './helpers';

export { buildUserContext, ensureCanonicalUser, ensureDriverForUser } from './userContext.ts';

export {
  getDirectProfile,
  getDirectVerificationRecord,
  updateDirectProfile,
  searchDirectTrips,
  getDirectTripById,
  getDirectDriverTrips,
  createDirectTrip,
  updateDirectTrip,
  deleteDirectTrip,
  createDirectBooking,
  getDirectUserBookings,
  getDirectTripBookings,
  updateDirectBookingStatus,
  getDirectDriverBookings,
} from './trips';

export {
  recordDirectGrowthEvent,
  createDirectDemandAlert,
  getDirectDemandAlerts,
  getDirectGrowthAnalytics,
} from './growth';

export {
  createDirectPricingSnapshot,
  createDirectSupportTicket,
  enqueueDirectAutomationJob,
  getDirectRouteReminders,
  getDirectSupportTickets,
  markDirectRouteReminderDelivered,
  updateDirectSupportTicketStatus,
  upsertDirectRouteReminder,
} from './automation';

export {
  processReferralConversionForPassenger,
  getDirectReferralSnapshot,
  redeemDirectReferralCode,
} from './referrals';

export {
  createDirectPackage,
  getDirectPackageByTrackingId,
  updateDirectPackageStatus,
  getDirectCommunicationDeliveries,
  getDirectCommunicationPreferences,
  getDirectNotifications,
  markDirectNotificationAsRead,
  createDirectNotification,
  queueDirectCommunicationDeliveries,
  upsertDirectCommunicationPreferences,
} from './packagesAndNotifications';

// Price calculator (pure, no Supabase dependency)
import type { PriceCalculationResult } from '../trips';
import { toNumber } from './helpers';

export function calculateDirectPrice(
  type: 'passenger' | 'package',
  weight?: number,
  distanceKm?: number,
  basePrice?: number,
): PriceCalculationResult {
  const resolvedDistance = Math.max(1, toNumber(distanceKm, 8));
  const resolvedBase = Math.max(1, toNumber(basePrice, type === 'package' ? 3.5 : 2.5));
  const packageSurcharge = type === 'package' ? Math.max(0, toNumber(weight, 0.5) - 1) * 0.35 : 0;
  const distanceCharge = resolvedDistance * (type === 'package' ? 0.22 : 0.18);
  const price = Number((resolvedBase + distanceCharge + packageSurcharge).toFixed(3));
  return {
    price,
    currency: 'JOD',
    breakdown: {
      base: resolvedBase,
      distance: Number(distanceCharge.toFixed(3)),
      package: Number(packageSurcharge.toFixed(3)),
    },
  };
}
