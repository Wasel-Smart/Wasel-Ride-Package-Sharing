/**
 * Wasel — Zod Validation Schemas
 *
 * Central schema definitions for all forms in the app.
 * Used with react-hook-form via zodResolver.
 *
 * Usage:
 *   import { signInSchema, type SignInFields } from '@/utils/validation';
 *   const form = useForm<SignInFields>({ resolver: zodResolver(signInSchema) });
 */
import { z } from 'zod';
import { WALLET_PAYMENT_METHOD_TYPES } from '../../shared/wallet-contracts';

// ── Reusable field validators ─────────────────────────────────────────────────

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const phoneField = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in international format: +962xxxxxxxxx')
  .optional()
  .or(z.literal(''));

const nameField = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name is too long')
  .refine((value) => value.length > 0, 'Name is required');

const safeAvatarUrlField = z
  .string()
  .url('Invalid image URL')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Avatar URL must use http or https');

// ── Auth schemas ──────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: emailField,
  password: passwordField,
});
export type SignInFields = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    fullName: nameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
    phone: phoneField,
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpFields = z.infer<typeof signUpSchema>;

export const resetPasswordSchema = z.object({
  email: emailField,
});
export type ResetPasswordFields = z.infer<typeof resetPasswordSchema>;

// ── Trip schemas ───────────────────────────────────────────────────────────────

const JORDAN_CITIES = [
  'Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Madaba', 'Karak',
  'Jerash', 'Mafraq', 'Dead Sea', 'Petra', 'Ajloun', 'Salt',
] as const;

export const offerRideSchema = z.object({
  origin: z.enum(JORDAN_CITIES, { required_error: 'Please select a departure city' }),
  destination: z.enum(JORDAN_CITIES, { required_error: 'Please select a destination city' }),
  departureDate: z.string({ required_error: 'Departure date is required' }),
  departureTime: z.string({ required_error: 'Departure time is required' }),
  seats: z.number({ required_error: 'Number of seats is required' }).int().min(1).max(7),
  pricePerSeat: z.number({ required_error: 'Price is required' }).positive('Price must be greater than 0').max(500, 'Price seems too high'),
  notes: z.string().max(500, 'Notes too long').optional(),
  allowPackages: z.boolean().default(false),
  genderPreference: z.enum(['any', 'male', 'female']).default('any'),
}).refine(data => data.origin !== data.destination, {
  message: 'Origin and destination must be different cities',
  path: ['destination'],
});
export type OfferRideFields = z.infer<typeof offerRideSchema>;

export const findRideSchema = z.object({
  origin: z.enum(JORDAN_CITIES, { required_error: 'Please select a departure city' }),
  destination: z.enum(JORDAN_CITIES, { required_error: 'Please select a destination city' }),
  date: z.string({ required_error: 'Date is required' }),
  passengers: z.number().int().min(1).max(7).default(1),
}).refine(data => data.origin !== data.destination, {
  message: 'Origin and destination must be different',
  path: ['destination'],
});
export type FindRideFields = z.infer<typeof findRideSchema>;

// ── Package schemas ───────────────────────────────────────────────────────────

export const sendPackageSchema = z.object({
  senderName: nameField,
  senderPhone: phoneField.pipe(z.string().min(1, 'Sender phone is required')),
  recipientName: nameField,
  recipientPhone: phoneField.pipe(z.string().min(1, 'Recipient phone is required')),
  origin: z.enum(JORDAN_CITIES),
  destination: z.enum(JORDAN_CITIES),
  description: z.string().min(3, 'Please describe the package').max(200),
  weightKg: z.number().positive().max(50, 'Max package weight is 50 kg'),
  fragile: z.boolean().default(false),
  declaredValue: z.number().min(0).max(10000).optional(),
});
export type SendPackageFields = z.infer<typeof sendPackageSchema>;

// ── Profile / Account schemas ─────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: nameField,
  phone: phoneField,
  bio: z.string().max(250, 'Bio too long').optional(),
  avatarUrl: safeAvatarUrlField.optional().or(z.literal('')),
});
export type UpdateProfileFields = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: passwordField.refine(
      pw => /[A-Z]/.test(pw) && /[0-9]/.test(pw),
      'New password must contain at least one uppercase letter and one number',
    ),
    confirmNewPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });
export type ChangePasswordFields = z.infer<typeof changePasswordSchema>;

// ── Wallet schemas ────────────────────────────────────────────────────────────

export const topUpSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be positive')
    .max(500, 'Maximum top-up is JOD 500 per transaction'),
  paymentMethod: z.enum(WALLET_PAYMENT_METHOD_TYPES).refine((method) => method !== 'wallet', {
    message: 'Wallet balance cannot be used to fund a deposit.',
  }).default('card'),
});
export type TopUpFields = z.infer<typeof topUpSchema>;

export const transferSchema = z.object({
  recipientPhone: phoneField.pipe(z.string().min(1, 'Recipient phone is required')),
  amount: z.number().positive('Amount must be positive').max(200, 'Maximum transfer is JOD 200'),
  note: z.string().max(100).optional(),
});
export type TransferFields = z.infer<typeof transferSchema>;
