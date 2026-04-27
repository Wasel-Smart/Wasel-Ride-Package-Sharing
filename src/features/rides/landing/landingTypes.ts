/**
 * landing/landingTypes.ts
 *
 * Shared types, constants, and style helpers used across all Landing modules.
 * No React dependency — safe to import from any module in this feature.
 */
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

// ── Colour palette ────────────────────────────────────────────────────────────

export const LANDING_COLORS = {
  bg: 'var(--background)',
  bgDeep: 'var(--wasel-surface-0)',
  panel: 'var(--wasel-panel-strong)',
  panelSoft: 'var(--wasel-panel-muted)',
  text: 'var(--wasel-copy-primary)',
  muted: 'var(--wasel-copy-muted)',
  soft: 'var(--wasel-copy-soft)',
  cyan: 'var(--ds-accent, #f59a2c)',
  blue: 'var(--ds-accent-strong, #ffb357)',
  gold: 'var(--ds-warning, #efb45d)',
  green: 'var(--ds-success, #79c67d)',
  border: 'var(--ds-border, #313841)',
  borderStrong:
    'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 30%, var(--ds-border, #313841))',
} as const;

// ── Shared types ──────────────────────────────────────────────────────────────

export type LandingActionCard = {
  title: string;
  detail: string;
  path: string;
  icon: LucideIcon;
  color: string;
};

export type LandingSignalCard = {
  title: string;
  detail: string;
  accent: string;
  trendLabel: string;
  trendDirection: 'up' | 'down';
  intensity: string;
  sparkline: readonly number[];
};

export type LandingSlotId = 'hero' | 'map' | 'signals' | 'why' | 'trust' | 'footer';

export type LandingRowDefinition = {
  id: string;
  className?: string;
  style?: CSSProperties;
  slots: readonly LandingSlotId[];
};

// ── Shared style helpers ──────────────────────────────────────────────────────

export const landingPanel = (radius = 28): CSSProperties => ({
  borderRadius: radius,
  background: 'var(--wasel-panel-strong)',
  border: `1px solid ${LANDING_COLORS.border}`,
  boxShadow: 'var(--wasel-shadow-lg)',
  backdropFilter: 'blur(22px)',
});

/** Identity helper — keeps JSX readable without template literal noise. */
export const lc = (value: string): string => value;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
