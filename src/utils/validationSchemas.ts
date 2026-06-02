/**
 * Centralized Input Validation Schemas
 * Uses Zod for type-safe validation
 */

import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^\+?[1-9]\d{1,14}$/;
const jordanPhoneRegex = /^(\+962|00962|962|0)?7[789]\d{7}$/;

// Custom error messages
const errorMessages = {
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  invalidPhone: 'Please enter a valid phone number',
  invalidJordanPhone: 'Please enter a valid Jordanian phone number',
  passwordTooShort: 'Password must be at least 8 characters',
  passwordTooWeak:
    'Password must include lowercase, uppercase, number, and special character',
  invalidAmount: 'Please enter a valid amount',
  amountTooLow: 'Amount must be greater than 0',
  amountTooHigh: 'Amount exceeds maximum limit',
  invalidDate: 'Please enter a valid date',
  dateTooOld: 'Date is too far in the past',
  dateTooFuture: 'Date is too far in the future',
  invalidCoordinates: 'Invalid location coordinates',
  stringTooLong: 'Text is too long',
  stringTooShort: 'Text is too short',
};

// ============================================================================
// Authentication Schemas
// ============================================================================

export const emailSchema = z
  .string({ required_error: errorMessages.required })
  .min(1, errorMessages.required)
  .email(errorMessages.invalidEmail)
  .max(255, errorMessages.stringTooLong)
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string({ required_error: errorMessages.required })
  .min(8, errorMessages.passwordTooShort)
  .max(128, errorMessages.stringTooLong)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, errorMessages.passwordTooWeak);

export const phoneSchema = z
  .string({ required_error: errorMessages.required })
  .regex(phoneRegex, errorMessages.invalidPhone)
  .trim();

export const jordanPhoneSchema = z
  .string({ required_error: errorMessages.required })
  .regex(jordanPhoneRegex, errorMessages.invalidJordanPhone)
  .trim();

export const nameSchema = z
  .string({ required_error: errorMessages.required })
  .min(2, errorMessages.stringTooShort)
  .max(100, errorMessages.stringTooLong)
  .trim();

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  phone: jordanPhoneSchema.optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, errorMessages.required),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, errorMessages.required),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, errorMessages.required),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// Profile Schemas
// ============================================================================

export const profileUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: jordanPhoneSchema.optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  bio: z.string().max(500, errorMessages.stringTooLong).optional(),
  avatarUrl: z.string().url().optional(),
});

// ============================================================================
// Wallet & Payment Schemas
// ============================================================================

export const amountSchema = z
  .number({ required_error: errorMessages.required })
  .positive(errorMessages.amountTooLow)
  .max(10000, errorMessages.amountTooHigh)
  .multipleOf(0.01);

export const currencySchema = z.enum(['JOD', 'USD', 'EUR']);

export const topUpSchema = z.object({
  amount: amountSchema,
  currency: currencySchema.default('JOD'),
  paymentMethod: z.enum(['card', 'cliq', 'wallet']),
});

export const withdrawSchema = z.object({
  amount: amountSchema,
  currency: currencySchema.default('JOD'),
  bankAccount: z.string().min(1, errorMessages.required),
});

export const transferSchema = z.object({
  amount: amountSchema,
  currency: currencySchema.default('JOD'),
  recipientId: z.string().uuid(),
  note: z.string().max(200, errorMessages.stringTooLong).optional(),
});

// ============================================================================
// Ride Schemas
// ============================================================================

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const locationSchema = z.object({
  address: z.string().min(1, errorMessages.required).max(500, errorMessages.stringTooLong),
  coordinates: coordinatesSchema,
  placeId: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const rideSearchSchema = z.object({
  pickup: locationSchema,
  dropoff: locationSchema,
  passengers: z.number().int().min(1).max(8).default(1),
  departureTime: z.string().datetime().optional(),
  preferences: z.object({
    smokingAllowed: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    musicAllowed: z.boolean().optional(),
    maxDetour: z.number().min(0).max(30).optional(),
  }).optional(),
});

export const rideOfferSchema = z.object({
  pickup: locationSchema,
  dropoff: locationSchema,
  departureTime: z.string().datetime(),
  availableSeats: z.number().int().min(1).max(8),
  pricePerSeat: amountSchema,
  vehicleInfo: z.object({
    make: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
    color: z.string().min(1),
    licensePlate: z.string().min(1),
  }),
  preferences: z.object({
    smokingAllowed: z.boolean().default(false),
    petsAllowed: z.boolean().default(false),
    musicAllowed: z.boolean().default(true),
    maxDetour: z.number().min(0).max(30).default(10),
  }).optional(),
});

export const rideBookingSchema = z.object({
  rideId: z.string().uuid(),
  passengers: z.number().int().min(1).max(8),
  pickupLocation: locationSchema.optional(),
  dropoffLocation: locationSchema.optional(),
  note: z.string().max(200, errorMessages.stringTooLong).optional(),
});

export const rideCancellationSchema = z.object({
  rideId: z.string().uuid(),
  reason: z.enum([
    'driver_no_show',
    'passenger_no_show',
    'emergency',
    'weather',
    'vehicle_issue',
    'personal_reason',
    'other',
  ]),
  details: z.string().max(500, errorMessages.stringTooLong).optional(),
});

export const rideRatingSchema = z.object({
  rideId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500, errorMessages.stringTooLong).optional(),
  tags: z.array(z.string()).max(5).optional(),
});

// ============================================================================
// Package Schemas
// ============================================================================

export const packageSizeSchema = z.enum(['small', 'medium', 'large', 'extra_large']);

export const packageWeightSchema = z
  .number()
  .positive()
  .max(50, 'Package weight cannot exceed 50kg');

export const packageSchema = z.object({
  senderName: nameSchema,
  senderPhone: jordanPhoneSchema,
  senderAddress: locationSchema,
  recipientName: nameSchema,
  recipientPhone: jordanPhoneSchema,
  recipientAddress: locationSchema,
  packageSize: packageSizeSchema,
  packageWeight: packageWeightSchema,
  description: z.string().min(1).max(500, errorMessages.stringTooLong),
  value: amountSchema.optional(),
  fragile: z.boolean().default(false),
  urgent: z.boolean().default(false),
  deliveryInstructions: z.string().max(500, errorMessages.stringTooLong).optional(),
});

export const packageTrackingSchema = z.object({
  trackingNumber: z.string().min(1, errorMessages.required),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const notificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(true),
  push: z.boolean().default(true),
  whatsapp: z.boolean().default(false),
  categories: z.object({
    rideUpdates: z.boolean().default(true),
    packageUpdates: z.boolean().default(true),
    paymentUpdates: z.boolean().default(true),
    promotions: z.boolean().default(false),
    systemUpdates: z.boolean().default(true),
  }),
});

// ============================================================================
// Support Schemas
// ============================================================================

export const supportTicketSchema = z.object({
  category: z.enum([
    'account',
    'payment',
    'ride',
    'package',
    'technical',
    'safety',
    'other',
  ]),
  subject: z.string().min(5).max(200, errorMessages.stringTooLong),
  description: z.string().min(20).max(2000, errorMessages.stringTooLong),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  attachments: z.array(z.string().url()).max(5).optional(),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(error.message);
  });

  return { success: false, errors };
}

export function validateField<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): string | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return null;
  }
  return result.error.errors[0]?.message || 'Invalid input';
}

// Export all schemas as a registry
export const validationSchemas = {
  // Auth
  signUp: signUpSchema,
  signIn: signInSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  
  // Profile
  profileUpdate: profileUpdateSchema,
  
  // Wallet & Payment
  topUp: topUpSchema,
  withdraw: withdrawSchema,
  transfer: transferSchema,
  
  // Ride
  rideSearch: rideSearchSchema,
  rideOffer: rideOfferSchema,
  rideBooking: rideBookingSchema,
  rideCancellation: rideCancellationSchema,
  rideRating: rideRatingSchema,
  
  // Package
  package: packageSchema,
  packageTracking: packageTrackingSchema,
  
  // Notification
  notificationPreferences: notificationPreferencesSchema,
  
  // Support
  supportTicket: supportTicketSchema,
};

export type ValidationSchemas = typeof validationSchemas;
export type SchemaKey = keyof ValidationSchemas;
