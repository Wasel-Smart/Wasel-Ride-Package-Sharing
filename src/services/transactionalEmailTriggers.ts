import { getConfig } from '../utils/env';
import { emailService } from './emailService';
import type { RideBookingRecord } from './rideLifecycle';
import type { WalletTransaction } from './walletApi';

function getAppUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return getConfig().appUrl;
}

export function getTransactionalEmailAppUrl(): string {
  return getAppUrl();
}

export async function triggerWelcomeEmail(opts: {
  name: string;
  email: string;
  confirmUrl?: string;
}): Promise<void> {
  void emailService
    .sendWelcome({
      to: opts.email,
      name: opts.name,
      confirmUrl: opts.confirmUrl,
    })
    .catch((error) => console.error('[email] welcome failed:', error));
}

export async function triggerPasswordResetEmail(opts: {
  name: string;
  email: string;
  resetUrl: string;
}): Promise<void> {
  void emailService
    .sendPasswordReset({
      to: opts.email,
      name: opts.name,
      resetUrl: opts.resetUrl,
    })
    .catch((error) => console.error('[email] password reset failed:', error));
}

export async function triggerSecurityAlert(opts: {
  name: string;
  email: string;
  eventType: 'new_login' | 'password_changed' | 'email_changed';
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  void emailService
    .sendSecurityAlert({
      to: opts.email,
      name: opts.name,
      eventType: opts.eventType,
      ip: opts.ip,
      userAgent: opts.userAgent,
    })
    .catch((error) => console.error('[email] security alert failed:', error));
}

export function triggerRideBookingEmails(opts: {
  booking: RideBookingRecord;
  passengerEmail: string;
  driverEmail?: string;
  priceJod: number;
  appUrl?: string;
}): void {
  const { booking, passengerEmail, driverEmail, priceJod } = opts;
  const appUrl = opts.appUrl ?? getAppUrl();

  void emailService
    .sendBookingConfirmation({
      to: passengerEmail,
      passengerName: booking.passengerName,
      ticketCode: booking.ticketCode,
      from: booking.from,
      to_city: booking.to,
      date: booking.date,
      time: booking.time,
      driverName: booking.driverName,
      driverPhone: booking.driverPhone,
      seats: booking.seatsRequested,
      priceJod,
      status: booking.status === 'pending_driver' ? 'pending_driver' : 'confirmed',
    })
    .catch((error) => console.error('[email] booking confirmation failed:', error));

  if (booking.status === 'pending_driver' && driverEmail) {
    void emailService
      .sendDriverBookingRequest({
        to: driverEmail,
        driverName: booking.driverName,
        passengerName: booking.passengerName,
        ticketCode: booking.ticketCode,
        from: booking.from,
        to_city: booking.to,
        date: booking.date,
        time: booking.time,
        seats: booking.seatsRequested,
        priceJod,
        acceptUrl: `${appUrl}/app/offer-ride?action=accept&ticket=${encodeURIComponent(booking.ticketCode)}`,
        declineUrl: `${appUrl}/app/offer-ride?action=decline&ticket=${encodeURIComponent(booking.ticketCode)}`,
      })
      .catch((error) => console.error('[email] driver booking request failed:', error));
  }
}

export function triggerBookingStatusUpdateEmail(opts: {
  passengerEmail: string;
  passengerName: string;
  ticketCode: string;
  from: string;
  to_city: string;
  date: string;
  time: string;
  driverName: string;
  newStatus: 'confirmed' | 'rejected' | 'cancelled';
  priceJod: number;
}): void {
  void emailService
    .sendBookingStatusUpdate({
      to: opts.passengerEmail,
      passengerName: opts.passengerName,
      ticketCode: opts.ticketCode,
      from: opts.from,
      to_city: opts.to_city,
      date: opts.date,
      time: opts.time,
      driverName: opts.driverName,
      newStatus: opts.newStatus,
      priceJod: opts.priceJod,
    })
    .catch((error) => console.error('[email] booking status update failed:', error));
}

export function triggerRideCompletedEmails(opts: {
  passengerEmail: string;
  passengerName: string;
  driverEmail: string;
  driverName: string;
  ticketCode: string;
  from: string;
  to_city: string;
  date: string;
  driverEarningsJod: number;
  appUrl?: string;
}): void {
  const appUrl = opts.appUrl ?? getAppUrl();
  const ratingUrl = `${appUrl}/app/my-trips?tab=rides`;

  void emailService
    .sendRideCompleted({
      to: opts.passengerEmail,
      recipientName: opts.passengerName,
      role: 'passenger',
      ticketCode: opts.ticketCode,
      from: opts.from,
      to_city: opts.to_city,
      date: opts.date,
      counterpartName: opts.driverName,
      amountJod: 0,
      ratingUrl,
    })
    .catch((error) => console.error('[email] ride completed (passenger) failed:', error));

  void emailService
    .sendRideCompleted({
      to: opts.driverEmail,
      recipientName: opts.driverName,
      role: 'driver',
      ticketCode: opts.ticketCode,
      from: opts.from,
      to_city: opts.to_city,
      date: opts.date,
      counterpartName: opts.passengerName,
      amountJod: opts.driverEarningsJod,
      ratingUrl,
    })
    .catch((error) => console.error('[email] ride completed (driver) failed:', error));
}

export function triggerPaymentReceiptEmail(opts: {
  userEmail: string;
  userName: string;
  transaction: WalletTransaction;
  balanceJod: number;
  paymentMethod?: string;
}): void {
  const { transaction } = opts;
  const typeMap: Record<
    string,
    'top_up' | 'ride_payment' | 'package_payment' | 'withdrawal'
  > = {
    add_funds: 'top_up',
    ride_payment: 'ride_payment',
    package_payment: 'package_payment',
    withdrawal: 'withdrawal',
    transfer_funds: 'withdrawal',
  };

  void emailService
    .sendPaymentReceipt({
      to: opts.userEmail,
      name: opts.userName,
      transactionId: transaction.id,
      type: typeMap[transaction.type] ?? 'top_up',
      amountJod: Math.abs(transaction.amount),
      balanceJod: opts.balanceJod,
      description: transaction.description,
      createdAt: transaction.createdAt,
      paymentMethod: opts.paymentMethod,
    })
    .catch((error) => console.error('[email] payment receipt failed:', error));
}

export function triggerPackageConfirmationEmail(opts: {
  senderEmail: string;
  senderName: string;
  trackingId: string;
  handoffCode: string;
  from: string;
  to_city: string;
  weight: string;
  recipientName?: string;
  matchedDriver?: string;
  status: 'searching' | 'matched';
}): void {
  void emailService
    .sendPackageConfirmation({
      to: opts.senderEmail,
      senderName: opts.senderName,
      trackingId: opts.trackingId,
      handoffCode: opts.handoffCode,
      from: opts.from,
      to_city: opts.to_city,
      weight: opts.weight,
      recipientName: opts.recipientName,
      matchedDriver: opts.matchedDriver,
      status: opts.status,
    })
    .catch((error) => console.error('[email] package confirmation failed:', error));
}

export function triggerBusBookingConfirmationEmail(opts: {
  passengerEmail: string;
  passengerName: string;
  ticketCode: string;
  pickupStop: string;
  dropoffStop: string;
  scheduleDate: string;
  departureTime: string;
  seats: number;
  seatPreference: string;
  priceJod: number;
}): void {
  void emailService
    .sendBusBookingConfirmation({
      to: opts.passengerEmail,
      passengerName: opts.passengerName,
      ticketCode: opts.ticketCode,
      pickupStop: opts.pickupStop,
      dropoffStop: opts.dropoffStop,
      scheduleDate: opts.scheduleDate,
      departureTime: opts.departureTime,
      seats: opts.seats,
      seatPreference: opts.seatPreference,
      priceJod: opts.priceJod,
    })
    .catch((error) => console.error('[email] bus confirmation failed:', error));
}
