/**
 * Wasel Branded SMS Templates
 *
 * SMS templates with consistent branding and character limits.
 * All templates are under 160 characters (single SMS) unless noted.
 */

export const SMS_TOKENS = {
  brandName: 'Wasel',
  brandNameAr: 'واصل',
  brandCyan: '#00E5FF',
  brandLime: '#72C70D',
  brandEmber: '#FF8A0B',
};

export interface SmsTemplate {
  id: string;
  name: string;
  category: 'auth' | 'booking' | 'delivery' | 'payment' | 'marketing' | 'system';
  template: string;
  variables: string[];
  maxLength: number;
  language: 'en' | 'ar' | 'both';
  notes?: string;
}

export const smsTemplates: SmsTemplate[] = [
  {
    id: 'auth-otp',
    name: 'OTP Verification',
    category: 'auth',
    template: 'Wasel: Your verification code is {otp}. Valid for 10 minutes. Do not share this code.',
    variables: ['otp'],
    maxLength: 160,
    language: 'en',
    notes: 'Jordan OTP format',
  },
  {
    id: 'auth-otp-ar',
    name: 'OTP Verification (Arabic)',
    category: 'auth',
    template: 'واصل: رمز التحقق الخاص بك هو {otp}. صالح لمدة 10 دقائق. لا تشارك هذا الرمز.',
    variables: ['otp'],
    maxLength: 160,
    language: 'ar',
    notes: 'RTL Arabic OTP',
  },
  {
    id: 'booking-confirmed',
    name: 'Booking Confirmed',
    category: 'booking',
    template: 'Wasel: Your ride from {pickup} to {dropoff} is confirmed. Driver: {driver}. Track: {url}',
    variables: ['pickup', 'dropoff', 'driver', 'url'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'booking-confirmed-ar',
    name: 'Booking Confirmed (Arabic)',
    category: 'booking',
    template: 'واصل: تم تأكيد رحلتك من {pickup} إلى {dropoff}. السائق: {driver}. التتبع: {url}',
    variables: ['pickup', 'dropoff', 'driver', 'url'],
    maxLength: 160,
    language: 'ar',
  },
  {
    id: 'driver-assigned',
    name: 'Driver Assigned',
    category: 'booking',
    template: 'Wasel: {driver} is your driver. ETA: {eta} mins. Vehicle: {vehicle}. Call: {phone}',
    variables: ['driver', 'eta', 'vehicle', 'phone'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'ride-started',
    name: 'Ride Started',
    category: 'booking',
    template: 'Wasel: Your ride has started. Share your trip with loved ones for safety.',
    variables: [],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'ride-completed',
    name: 'Ride Completed',
    category: 'booking',
    template: 'Wasel: You arrived at {dropoff}. Fare: {amount} JOD. Rate your driver: {url}',
    variables: ['dropoff', 'amount', 'url'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'package-picked-up',
    name: 'Package Picked Up',
    category: 'delivery',
    template: 'Wasel: Your package {tracking} has been picked up and is on its way.',
    variables: ['tracking'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'package-delivered',
    name: 'Package Delivered',
    category: 'delivery',
    template: 'Wasel: Package {tracking} delivered to {recipient}. Receiver code: {code}',
    variables: ['tracking', 'recipient', 'code'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'payment-receipt',
    name: 'Payment Receipt',
    category: 'payment',
    template: 'Wasel: Payment of {amount} JOD received. TXN: {txn}. Wallet balance: {balance} JOD.',
    variables: ['amount', 'txn', 'balance'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'wallet-topped-up',
    name: 'Wallet Topped Up',
    category: 'payment',
    template: 'Wasel: Your wallet has been topped up with {amount} JOD. New balance: {balance} JOD.',
    variables: ['amount', 'balance'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'promo-code',
    name: 'Promo Code',
    category: 'marketing',
    template: 'Wasel: Use code {code} for {discount} off your next ride! Valid until {expiry}. T&C apply.',
    variables: ['code', 'discount', 'expiry'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'system-maintenance',
    name: 'System Maintenance',
    category: 'system',
    template: 'Wasel: Scheduled maintenance on {date} from {start} to {end}. Expect brief interruptions.',
    variables: ['date', 'start', 'end'],
    maxLength: 160,
    language: 'en',
  },
  {
    id: 'safety-check',
    name: 'Safety Check',
    category: 'system',
    template: 'Wasel: We noticed an unusual login. If this was you, ignore. If not, secure your account: {url}',
    variables: ['url'],
    maxLength: 160,
    language: 'en',
  },
];

export function renderSmsTemplate(id: string, variables: Record<string, string>): string {
  const template = smsTemplates.find(t => t.id === id);
  if (!template) throw new Error(`SMS template not found: ${id}`);

  let text = template.template;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(`{${key}}`, value);
  }

  if (text.length > template.maxLength) {
    console.warn(`SMS template ${id} exceeds max length: ${text.length}/${template.maxLength}`);
  }

  return text;
}

export function getTemplatesByCategory(category: SmsTemplate['category']): SmsTemplate[] {
  return smsTemplates.filter(t => t.category === category);
}
