import { z } from 'zod';

// Phone number validation - supports Jordan format
const jordanPhoneRegex = /^\+962[0-9]{9}$/;
const internationalPhoneRegex = /^\+[1-9]\d{1,14}$/;

export const profileValidationSchemas = {
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters')
    .regex(/^[a-zA-Z\u0600-\u06FF\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),

  phone: z
    .string()
    .refine(
      val => jordanPhoneRegex.test(val) || internationalPhoneRegex.test(val),
      'Please enter a valid phone number (e.g., +962791234567)'
    ),

  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters')
    .transform(val => val.toLowerCase().trim()),

  avatar: z.object({
    size: z.number().max(2 * 1024 * 1024, 'Image must be smaller than 2MB'),
    type: z.string().refine(
      type => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type),
      'Please upload a valid image (JPEG, PNG, WebP, or GIF)'
    ),
  }),
};

export type ProfileValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export function validateProfileField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): ProfileValidationResult<T> {
  try {
    const data = schema.parse(value);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { success: false, error: 'Validation failed' };
  }
}

export function normalizePhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/[\s()-]/g, '');
  
  // Jordan number without country code
  if (/^(077|078|079)\d{7}$/.test(cleaned)) {
    return `+962${cleaned}`;
  }
  
  // Already has country code
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Add + if missing
  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  
  return null;
}
