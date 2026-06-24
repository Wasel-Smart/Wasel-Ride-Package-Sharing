import { z } from 'zod';

export const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CityCoordsSchema = z.object({
  city: z.string().min(1),
  coords: CoordinateSchema,
});

export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
