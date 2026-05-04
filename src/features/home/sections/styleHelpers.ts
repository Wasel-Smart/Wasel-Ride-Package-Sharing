import type { CSSProperties } from 'react';
import { C, glass } from '../HomePageShared';

interface HomeCardOptions {
  background?: string;
  border?: string;
  borderRadius?: number;
  padding?: string;
  boxShadow?: string;
}

interface HomeButtonOptions {
  background: string;
  color: string;
  border?: string;
  height?: number;
  padding?: string;
  borderRadius?: number;
  fontWeight?: number;
}

export function homeSectionMargin(marginTop: number, marginBottom?: number): CSSProperties {
  return {
    marginTop,
    ...(marginBottom === undefined ? null : { marginBottom }),
  };
}

export function homeGrid(
  gridTemplateColumns: string,
  gap: number,
  extra?: CSSProperties,
): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns,
    gap,
    ...extra,
  };
}

export function homeCardShell({
  background = glass(0.44),
  border = `1px solid ${C.border}`,
  borderRadius = 22,
  padding = '18px 16px 16px',
  boxShadow,
}: HomeCardOptions = {}): CSSProperties {
  return {
    borderRadius,
    padding,
    background,
    border,
    ...(boxShadow ? { boxShadow } : null),
  };
}

export function homeIconTile(
  background: string,
  border?: string,
  size = 42,
  borderRadius = 14,
): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius,
    display: 'grid',
    placeItems: 'center',
    background,
    ...(border ? { border } : null),
  };
}

export function homeBadgeBubble(color: string): CSSProperties {
  return {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color,
    fontSize: '0.68rem',
    fontWeight: 900,
  };
}

export function homeButtonStyle({
  background,
  color,
  border = 'none',
  height = 48,
  padding = '0 18px',
  borderRadius = 14,
  fontWeight = 800,
}: HomeButtonOptions): CSSProperties {
  return {
    height,
    padding,
    borderRadius,
    border,
    background,
    color,
    fontWeight,
    cursor: 'pointer',
  };
}

export function homeAccentLink(color: string): CSSProperties {
  return {
    marginTop: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color,
    fontWeight: 800,
    fontSize: '0.75rem',
  };
}

export const homeSurfaceStyles = {
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'start',
  } satisfies CSSProperties,
  cardTitle: {
    marginTop: 14,
    fontWeight: 900,
    fontSize: '0.9rem',
  } satisfies CSSProperties,
  mutedBody: {
    marginTop: 7,
    color: C.textDim,
    fontSize: '0.74rem',
    lineHeight: 1.6,
  } satisfies CSSProperties,
  metaLabel: {
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  } satisfies CSSProperties,
  bodyCopy: {
    marginTop: 8,
    color: C.textMuted,
    lineHeight: 1.65,
    fontSize: '0.8rem',
  } satisfies CSSProperties,
  cardStack: {
    display: 'grid',
    gap: 12,
  } satisfies CSSProperties,
  buttonRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 14,
  } satisfies CSSProperties,
  centeredButtonRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
  } satisfies CSSProperties,
  utilityCaption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.72rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.textDim,
  } satisfies CSSProperties,
};
