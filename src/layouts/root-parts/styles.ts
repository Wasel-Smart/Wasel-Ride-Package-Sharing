import type { CSSProperties } from 'react';
import { C, F, GRAD, R } from '../../utils/wasel-ds';

interface ToolbarButtonOptions {
  background: string;
  border: string;
  color: string;
  padding?: string;
  gap?: number;
  borderRadius?: number;
  fontSize?: string;
  fontWeight?: number;
  height?: number;
}

interface PopoverOptions {
  width: number | string;
  top?: string;
  insetInlineEnd?: number;
  padding?: number;
  borderRadius?: number;
  background?: string;
  boxShadow?: string;
}

export function toolbarButtonStyle({
  background,
  border,
  color,
  padding = '0 10px',
  gap = 5,
  borderRadius = R.md,
  fontSize = '0.75rem',
  fontWeight = 700,
  height = 34,
}: ToolbarButtonOptions): CSSProperties {
  return {
    height,
    padding,
    borderRadius,
    background,
    border,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap,
    fontSize,
    fontWeight,
    color,
    fontFamily: F,
    transition: 'all 0.14s',
  };
}

export function popoverStyle({
  width,
  top = 'calc(100% + 8px)',
  insetInlineEnd = 0,
  padding,
  borderRadius = 16,
  background = 'rgba(8,22,35,0.98)',
  boxShadow = '0 24px 64px rgba(0,0,0,0.75)',
}: PopoverOptions): CSSProperties {
  return {
    position: 'absolute',
    top,
    insetInlineEnd,
    width,
    background,
    backdropFilter: 'blur(28px)',
    border: `1px solid ${C.border}`,
    borderRadius,
    boxShadow,
    ...(padding === undefined ? null : { padding }),
    animation: 'fade-in 0.15s ease',
    zIndex: 1000,
  };
}

export function menuRowStyle(
  textAlign: CSSProperties['textAlign'],
  color: string,
  fontWeight = 500,
): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    textAlign,
    fontSize: '0.82rem',
    fontWeight,
    color,
    fontFamily: F,
    cursor: 'pointer',
  };
}

export function navListRowStyle(textAlign: CSSProperties['textAlign']): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign,
  };
}

export function coloredDotStyle(color: string, glow = 10, extra?: CSSProperties): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 ${glow}px ${color}55`,
    flexShrink: 0,
    ...extra,
  };
}

export const rootPartStyles = {
  relative: {
    position: 'relative',
  } satisfies CSSProperties,
  chevron: (open: boolean) =>
    ({
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform 0.14s',
      opacity: 0.6,
    }) satisfies CSSProperties,
  menuLabel: {
    padding: '8px 12px 4px',
    fontSize: '0.6rem',
    fontWeight: 700,
    color: C.textMuted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontFamily: F,
  } satisfies CSSProperties,
  menuCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: '11px 13px',
    borderRadius: 12,
    background: C.card,
    border: `1px solid ${C.borderFaint}`,
    cursor: 'pointer',
    transition: 'all 0.14s ease',
  } satisfies CSSProperties,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } satisfies CSSProperties,
  cardTitle: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: C.text,
    fontFamily: F,
  } satisfies CSSProperties,
  cardCopy: {
    fontSize: '0.7rem',
    color: C.textMuted,
    fontFamily: F,
    lineHeight: 1.4,
  } satisfies CSSProperties,
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: GRAD,
    boxShadow: '0 0 0 1.5px rgba(88,221,255,0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.68rem',
    fontWeight: 800,
    color: C.bg,
    flexShrink: 0,
  } satisfies CSSProperties,
  userName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: C.text,
    fontFamily: F,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 80,
  } satisfies CSSProperties,
  sectionHeader: {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: C.textMuted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: F,
  } satisfies CSSProperties,
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
  } satisfies CSSProperties,
  drawerPanel: (ar: boolean) =>
    ({
      position: 'absolute',
      top: 0,
      insetInlineEnd: 0,
      width: 300,
      height: '100%',
      background: C.bg,
      borderInlineStart: `1px solid ${C.border}`,
      boxShadow: ar ? '20px 0 60px rgba(0,0,0,0.7)' : '-20px 0 60px rgba(0,0,0,0.7)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }) satisfies CSSProperties,
  drawerHeader: {
    padding: '16px 20px',
    borderBottom: `1px solid ${C.borderFaint}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  } satisfies CSSProperties,
  drawerToolbar: {
    padding: '10px 20px',
    borderBottom: `1px solid ${C.borderFaint}`,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  } satisfies CSSProperties,
  drawerFooter: {
    padding: '16px 20px',
    flexShrink: 0,
    borderTop: `1px solid ${C.borderFaint}`,
  } satisfies CSSProperties,
  actionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  } satisfies CSSProperties,
  appPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 30,
    padding: '0 12px',
    borderRadius: R.full,
    background: C.cyanDim,
    border: `1px solid ${C.border}`,
    color: C.textSub,
    fontSize: '0.72rem',
    fontWeight: 700,
    fontFamily: F,
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,
  badge: (color: string) =>
    ({
      fontSize: '0.52rem',
      fontWeight: 800,
      letterSpacing: '0.08em',
      padding: '2px 6px',
      borderRadius: R.full,
      background: `${color}18`,
      color,
      border: `1px solid ${color}30`,
      flexShrink: 0,
    }) satisfies CSSProperties,
};
