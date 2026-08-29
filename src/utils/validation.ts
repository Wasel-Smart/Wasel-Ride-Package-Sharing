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
import { normalizePhone, isValidE164Phone } from '../shared/validation/phone';

// ── Reusable field validators ─────────────────────────────────────────────────

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

// Supports Jordan (+962) and Iraq (+964) international formats
const phoneField = z
  .string()
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const normalized = normalizePhone(value);
        return isValidE164Phone(normalized);
      } catch {
        return false;
      }
    },
    {
      message: 'Phone must be a valid international format for Jordan (+962) or Iraq (+964).',
    },
  )
  .optional()
  .or(z.literal(''));

const nameField = z
  .string({ required_error: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name is too long')
  .trim();

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

// Jordan cities
const JORDAN_CITIES = [
  'Amman',
  'Irbid',
  'Zarqa',
  'Aqaba',
  'Madaba',
  'Karak',
  'Jerash',
  'Mafraq',
  'Dead Sea',
  'Petra',
  'Ajloun',
  'Salt',
] as const;

// Iraq cities — Baghdad, Erbil, Basra, Najaf and major governorates
const IRAQ_CITIES = [
  'Baghdad',
  'Erbil',
  'Basra',
  'Najaf',
  'Mosul',
  'Kirkuk',
  'Sulaymaniyah',
  'Karbala',
  'Nasiriyah',
  'Amarah',
  'Diwaniyah',
  'Hillah',
  'Ramadi',
  'Fallujah',
  'Tikrit',
  'Samarra',
  'Duhok',
] as const;

export const ALL_CITIES = [...JORDAN_CITIES, ...IRAQ_CITIES] as const;
export type SupportedCity = (typeof ALL_CITIES)[number];

export const offerRideSchema = z
  .object({
    origin: z.enum(ALL_CITIES, { required_error: 'Please select a departure city' }),
    destination: z.enum(ALL_CITIES, { required_error: 'Please select a destination city' }),
    departureDate: z.string({ required_error: 'Departure date is required' }),
    departureTime: z.string({ required_error: 'Departure time is required' }),
    seats: z.number({ required_error: 'Number of seats is required' }).int().min(1).max(7),
    pricePerSeat: z
      .number({ required_error: 'Price is required' })
      .positive('Price must be greater than 0')
      .max(500, 'Price seems too high'),
    notes: z.string().max(500, 'Notes too long').optional(),
    allowPackages: z.boolean().default(false),
    genderPreference: z.enum(['any', 'male', 'female']).default('any'),
  })
  .refine(data => data.origin !== data.destination, {
    message: 'Origin and destination must be different cities',
    path: ['destination'],
  });
export type OfferRideFields = z.infer<typeof offerRideSchema>;

export const findRideSchema = z
  .object({
    origin: z.enum(ALL_CITIES, { required_error: 'Please select a departure city' }),
    destination: z.enum(ALL_CITIES, { required_error: 'Please select a destination city' }),
    date: z.string({ required_error: 'Date is required' }),
    passengers: z.number().int().min(1).max(7).default(1),
  })
  .refine(data => data.origin !== data.destination, {
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
  origin: z.enum(ALL_CITIES),
  destination: z.enum(ALL_CITIES),
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
  avatarUrl: z
    .string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal('')),
});
export type UpdateProfileFields = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: passwordField,
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
  paymentMethod: z.enum(['card', 'cliq', 'cash_agent']).default('card'),
});
export type TopUpFields = z.infer<typeof topUpSchema>;

export const transferSchema = z.object({
  recipientPhone: phoneField.pipe(z.string().min(1, 'Recipient phone is required')),
  amount: z.number().positive('Amount must be positive').max(200, 'Maximum transfer is JOD 200'),
  note: z.string().max(100).optional(),
});
export type TransferFields = z.infer<typeof transferSchema>;
