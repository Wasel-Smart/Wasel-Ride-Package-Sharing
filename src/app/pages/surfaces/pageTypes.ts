/**
 * Shared type definitions for page surfaces.
 *
 * Extracted from the monolithic AppSurfaces.tsx to give each
 * surface module a single responsibility and a clear import target.
 */
import type { ReactNode } from 'react';
import {
  ENTRY_CITY_OPTIONS,
  ENTRY_DEFAULT_ROUTE_RETURN_TO,
} from '../../../contracts/entry';

export type OverviewCard = {
  detail: string;
  title: string;
};

export type OverviewConfig = {
  cards: OverviewCard[];
  ctaLabel: string;
  ctaPath: string;
  description: string;
  eyebrow: string;
  title: string;
};

export type BrandPillItem = {
  icon: ReactNode;
  label: string;
};

export type HeroFeatureItem = {
  detail: string;
  icon: ReactNode;
  title: string;
};

export const CITY_OPTIONS = ENTRY_CITY_OPTIONS.map((option) => ({
  label: option.en,
  value: option.value,
}));

export const RIDE_TYPE_OPTIONS = [
  { label: 'Any ride', value: 'any' },
  { label: 'Economy', value: 'economy' },
  { label: 'Comfort', value: 'comfort' },
  { label: 'Family', value: 'family' },
] as const;

export const LANDING_SUPPORT_PHONE = '+962790000000';
export const LANDING_SUPPORT_EMAIL = 'support@wasel.jo';
export const LANDING_RETURN_TO = ENTRY_DEFAULT_ROUTE_RETURN_TO;
