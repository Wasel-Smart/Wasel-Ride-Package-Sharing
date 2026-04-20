/**
 * Input Validation & Sanitization - Wasel | واصل
 *
 * Comprehensive validation system with:
 * - Type-safe validation using Zod
 * - Input sanitization
 * - Custom validators for Jordan-specific data
 * - XSS protection
 * - SQL injection prevention
 */

import { z } from 'zod';
import { logger } from './enhanced-logging';

// Common validation schemas
export const ValidationSchemas = {
  // Basic types
  email: z.string().email('Invalid email format').toLowerCase().trim(),

  phone: z
    .string()
    .regex(/^\+962[0-9]{8,9}$/, 'Invalid Jordanian phone number format (+962XXXXXXXX)')
    .transform(phone => phone.replace(/\s+/g, '')),

  internationalPhone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid international phone number format')
    .transform(phone => phone.replace(/\s+/g, '')),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\u0600-\u06FF\s'-]+$/, 'Name contains invalid characters')
    .transform(name => name.trim())
    .refine(name => name.length > 0, 'Name cannot be empty or whitespace only'),

  // Jordan-specific validations
  jordanianId: z
    .string()
    .regex(/^[0-9]{10}$/, 'Jordanian ID must be exactly 10 digits')
    .refine(validateJordanianId, 'Invalid Jordanian ID number'),

  jordanianLicense: z
    .string()
    .regex(/^[0-9]{7,8}$/, 'Jordanian driving license must be 7-8 digits'),

  // Geographic
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),

  jordanianCoordinates: z.object({
    latitude: z.number().min(29.18).max(33.37), // Jordan's approximate bounds
    longitude: z.number().min(34.88).max(39.3),
  }),

  // Financial
  currency: z.number().positive('Amount must be positive').multipleOf(0.01),

  jordanianDinar: z
    .number()
    .positive('Amount must be positive')
    .max(10000, 'Amount exceeds maximum limit')
    .multipleOf(0.001), // JOD has 3 decimal places

  // URLs and paths
  url: z.string().url('Invalid URL format'),

  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must not exceed 50 characters'),

  // Dates
  futureDate: z
    .string()
    .datetime('Invalid date format')
    .refine(date => new Date(date) > new Date(), 'Date must be in the future'),

  pastDate: z
    .string()
    .datetime('Invalid date format')
    .refine(date => new Date(date) < new Date(), 'Date must be in the past'),

  // Trip-specific
  tripCapacity: z.number().int().min(1).max(8),

  tripPrice: z
    .number()
    .positive('Price must be positive')
    .max(1000, 'Price exceeds maximum limit')
    .multipleOf(0.1),

  // Package-specific
  packageWeight: z
    .number()
    .positive('Weight must be positive')
    .max(50, 'Weight exceeds 50kg limit'),

  packageDimensions: z
    .object({
      length: z.number().positive().max(200), // cm
      width: z.number().positive().max(200),
      height: z.number().positive().max(200),
    })
    .refine(
      dims => dims.length * dims.width * dims.height <= 1000000, // 1m³
      'Package dimensions exceed volume limit',
    ),
};

// Jordanian ID validation algorithm
function validateJordanianId(id: string): boolean {
  if (id.length !== 10) {return false;}

  const digits = id.split('').map(Number);
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let product = digits[i] * weights[i];
    if (product > 9) {
      product = Math.floor(product / 10) + (product % 10);
    }
    sum += product;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
}

// Input sanitization functions
export class InputSanitizer {
  // HTML sanitization to prevent XSS
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // SQL injection prevention
  static sanitizeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  // Remove potentially dangerous characters
  static sanitizeGeneral(input: string): string {
    return input.replace(/[<>\"'%;()&+]/g, '').trim();
  }

  // Sanitize for file names
  static sanitizeFileName(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  // Sanitize for URLs
  static sanitizeUrl(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      return '';
    }
  }

  // Remove Arabic diacritics for search
  static normalizeArabicText(input: string): string {
    return input
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // Remove diacritics and tatweel
      .replace(/[أإآ]/g, 'ا') // Normalize alef
      .replace(/[ة]/g, 'ه') // Normalize taa marbouta
      .replace(/[ي]/g, 'ى') // Normalize yaa
      .trim();
  }
}

// Validation result types
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Main validation class
export class Validator {
  // Validate with Zod schema
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);

        logger.warning('Validation failed', {
          errors,
          data: typeof data === 'object' ? JSON.stringify(data) : data,
        });

        return { success: false, errors };
      }

      logger.error('Unexpected validation error', { error });
      return { success: false, errors: ['Validation failed'] };
    }
  }

  // Safe validation that doesn't throw
  static safeParse<T>(schema: z.ZodSchema<T>, data: unknown): z.SafeParseReturnType<unknown, T> {
    return schema.safeParse(data);
  }

  // Validate and sanitize input
  static validateAndSanitize<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    sanitizer?: (input: any) => any,
  ): ValidationResult<T> {
    try {
      // Apply sanitization if provided
      const sanitizedData = sanitizer ? sanitizer(data) : data;

      // Validate with schema
      const result = schema.parse(sanitizedData);

      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }

      return { success: false, errors: ['Validation failed'] };
    }
  }

  // Batch validation
  static validateBatch<T>(
    schema: z.ZodSchema<T>,
    dataArray: unknown[],
  ): { valid: T[]; invalid: { index: number; errors: string[] }[] } {
    const valid: T[] = [];
    const invalid: { index: number; errors: string[] }[] = [];

    dataArray.forEach((data, index) => {
      const result = this.validate(schema, data);
      if (result.success && result.data) {
        valid.push(result.data);
      } else {
        invalid.push({ index, errors: result.errors || [] });
      }
    });

    return { valid, invalid };
  }
}

// Custom validation rules
export const CustomValidators = {
  // Check if string contains only Arabic characters
  isArabicOnly: (text: string): boolean => {
    return /^[\u0600-\u06FF\s]+$/.test(text);
  },

  // Check if string contains only English characters
  isEnglishOnly: (text: string): boolean => {
    return /^[a-zA-Z\s]+$/.test(text);
  },

  // Validate Jordanian postal code
  isValidJordanianPostalCode: (code: string): boolean => {
    return /^[0-9]{5}$/.test(code);
  },

  // Check if coordinates are within Jordan
  isWithinJordan: (lat: number, lng: number): boolean => {
    return lat >= 29.18 && lat <= 33.37 && lng >= 34.88 && lng <= 39.3;
  },

  // Validate IBAN for Jordan
  isValidJordanianIBAN: (iban: string): boolean => {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    return /^JO\d{2}[A-Z]{4}\d{22}$/.test(cleanIban);
  },

  // Check if time is within business hours
  isBusinessHours: (time: string): boolean => {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 8 && hour <= 18;
  },

  // Validate that date is not on Friday (weekend in Jordan)
  isNotFriday: (date: string): boolean => {
    const day = new Date(date).getDay();
    return day !== 5; // Friday is 5
  },
};

// Form validation helpers
export class FormValidator {
  private errors: Record<string, string[]> = {};

  addError(field: string, message: string): void {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(message);
  }

  validateField<T>(field: string, schema: z.ZodSchema<T>, value: unknown): T | null {
    const result = Validator.validate(schema, value);

    if (!result.success) {
      this.errors[field] = result.errors || [];
      return null;
    }

    return result.data || null;
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  getErrors(): Record<string, string[]> {
    return { ...this.errors };
  }

  getFieldErrors(field: string): string[] {
    return this.errors[field] || [];
  }

  clear(): void {
    this.errors = {};
  }

  clearField(field: string): void {
    delete this.errors[field];
  }
}

// Export commonly used schemas
export const CommonSchemas = {
  userRegistration: z
    .object({
      fullName: ValidationSchemas.name,
      email: ValidationSchemas.email,
      phone: ValidationSchemas.phone,
      password: ValidationSchemas.password,
      confirmPassword: z.string(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),

  tripCreation: z.object({
    from: z.string().min(2, 'Origin is required'),
    to: z.string().min(2, 'Destination is required'),
    departureTime: ValidationSchemas.futureDate,
    capacity: ValidationSchemas.tripCapacity,
    price: ValidationSchemas.tripPrice,
    description: z.string().max(500, 'Description too long').optional(),
  }),

  packageSending: z.object({
    senderName: ValidationSchemas.name,
    senderPhone: ValidationSchemas.phone,
    recipientName: ValidationSchemas.name,
    recipientPhone: ValidationSchemas.phone,
    weight: ValidationSchemas.packageWeight,
    dimensions: ValidationSchemas.packageDimensions,
    description: z.string().max(200, 'Description too long'),
    value: ValidationSchemas.jordanianDinar.optional(),
  }),
};

// Named schema exports for form validation
export const signInSchema = z.object({
  email: ValidationSchemas.email,
  password: ValidationSchemas.password,
});

export const signUpSchema = z
  .object({
    email: ValidationSchemas.email,
    password: ValidationSchemas.password,
    fullName: ValidationSchemas.name,
    confirmPassword: z.string(),
    phone: z
      .string()
      .refine(v => !v || ValidationSchemas.phone.safeParse(v).success, 'Invalid phone')
      .optional()
      .or(z.literal('')),
    agreedToTerms: z.boolean().optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    data =>
      !data.phone || data.phone === '' || ValidationSchemas.phone.safeParse(data.phone).success,
    {
      message: 'Invalid phone format',
      path: ['phone'],
    },
  );

export const resetPasswordSchema = z.object({
  email: ValidationSchemas.email,
});

export const offerRideSchema = z
  .object({
    origin: z.string().min(1),
    destination: z.string().min(1),
    departureDate: z.string(),
    departureTime: z.string(),
    seats: z.number().int().min(1).max(7),
    pricePerSeat: z.number().positive().max(500),
    genderPreference: z.enum(['none', 'only', 'preferred', 'any']),
    allowPackages: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(data => data.origin !== data.destination, {
    message: 'Origin and destination must be different',
    path: ['destination'],
  });

export const findRideSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    date: z.string(),
    passengers: z.number().int().min(1).max(7).optional().default(1),
  })
  .refine(data => data.from !== data.to, {
    message: 'Origin and destination must be different',
    path: ['to'],
  });

export const sendPackageSchema = z.object({
  senderPhone: ValidationSchemas.phone,
  recipientPhone: ValidationSchemas.phone,
  recipientName: ValidationSchemas.name,
  weight: z.number().positive().max(50),
  description: z.string().min(3).max(200),
  declaredValue: ValidationSchemas.jordanianDinar.optional(),
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
});

const safeUrl = z
  .string()
  .refine(url => {
    if (!url) {return true;}
    try {
      const parsed = new URL(url);
      return !['javascript:', 'data:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'Invalid URL')
  .or(z.literal(''));

export const updateProfileSchema = z.object({
  fullName: ValidationSchemas.name.optional(),
  phone: ValidationSchemas.phone.optional(),
  bio: z.string().max(250).optional(),
  avatarUrl: safeUrl.optional(),
});

export const changePasswordSchema = z
  .object({
    newPassword: ValidationSchemas.password,
    confirmPassword: z.string(),
    currentPassword: z.string().optional(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const topUpSchema = z.object({
  amount: z.number().positive().max(500),
  paymentMethod: z.enum(['card', 'cliq', 'bank_transfer']).default('card'),
});

export const transferSchema = z.object({
  recipientPhone: ValidationSchemas.phone,
  amount: z.number().positive().max(200),
  note: z.string().max(100).optional(),
});

// Export types
export type { ValidationResult };
