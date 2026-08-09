export type {
  DbClient,
  DriverRow,
  RawBooking,
  RawCommunicationDelivery,
  RawCommunicationPreferences,
  RawDemandAlert,
  RawGrowthEvent,
  RawNotification,
  RawPackage,
  RawProfile,
  RawReferral,
  RawVerificationRecord,
  TripRow,
  UserContext,
  UserRow,
  WalletRow,
} from './types';

export { getDb, toNumber, mapProfileFromContext, buildTrustLikeUser } from './helpers.js';

export { buildUserContext, ensureCanonicalUser, ensureDriverForUser } from './userContext.js';

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
} from './trips.js';

export {
  recordDirectGrowthEvent,
  createDirectDemandAlert,
  getDirectDemandAlerts,
  getDirectGrowthAnalytics,
} from './growth.js';

export {
  processReferralConversionForPassenger,
  getDirectReferralSnapshot,
  redeemDirectReferralCode,
} from './referrals.js';

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
} from './packagesAndNotifications.js';

export {
  createDirectSupportTicket,
  getDirectSupportTickets,
  getDirectUserSettings,
  updateDirectSupportTicketStatus,
  upsertDirectUserSettings,
} from './accountAndSupport.js';

export { enableDirectTrustDriverMode, submitDirectTrustDriverDocuments, submitDirectTrustIdentityVerification, startDirectTrustPhoneVerification, confirmDirectTrustPhoneVerification } from './trust.js';

// Price calculator — canonical implementation lives in src/shared/pricing/priceCalculator.ts.
// This re-export preserves the existing API for all current importers.
export { calculateDirectPrice } from '../../shared/pricing/priceCalculator';
