import { z } from 'zod';

export const TRIPS_CONTRACT_VERSION = '2026-04-15';

export const tripDriverSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rating: z.number().finite().min(0).max(5),
  verified: z.boolean(),
});

export const tripSearchResultSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  seats: z.number().int().nonnegative(),
  price: z.number().finite().nonnegative(),
  driver: tripDriverSchema,
});

export const tripSearchResultsSchema = z.array(tripSearchResultSchema);

export const tripMutationResultSchema = tripSearchResultSchema;

export const tripPublishResultSchema = z.object({
  success: z.boolean(),
});

export const tripPriceCalculationResultSchema = z.object({
  price: z.number().finite(),
  currency: z.string().min(1),
  breakdown: z.record(z.number().finite()).optional(),
});
