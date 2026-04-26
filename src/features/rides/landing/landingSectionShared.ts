import type { CSSProperties } from 'react';
import { GRAD_SIGNAL } from '../../../utils/wasel-ds';

export const PREMIUM_BUTTON = {
  primary: {
    minHeight: 52,
    padding: '0 28px',
    borderRadius: 16,
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: GRAD_SIGNAL,
    color: 'var(--wasel-button-primary-foreground)',
    boxShadow: 'var(--wasel-button-primary-shadow)',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
  } as CSSProperties,
  secondary: {
    minHeight: 52,
    padding: '0 24px',
    borderRadius: 16,
    fontSize: '0.92rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--wasel-button-primary-border)',
    background: 'transparent',
    color: 'var(--wasel-copy-primary)',
    transition: 'border-color 180ms ease, background 180ms ease',
  } as CSSProperties,
} as const;

export const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
