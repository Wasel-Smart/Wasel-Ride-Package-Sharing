/**
 * Wasel RTL Utilities — v2.0
 * Always use these helpers for directional logic.
 * ⚠️ Never inline language conditionals like `language === 'ar' ? 'flex-row-reverse' : 'flex-row'`
 *
 * Usage:
 *   import { rtl, flipX, isRTL } from '@/utils/rtl';
 *   <div className={rtl.flex(language)}>
 *   <div className={rtl.ml(4, language)}>
 */

import type { CSSProperties } from 'react';

export type Language = 'en' | 'ar';
export type Dir = 'ltr' | 'rtl';

/** Returns the document dir or 'ltr' as fallback */
export function getDir(): Dir {
  if (typeof document !== 'undefined') {
    return (document.documentElement.getAttribute('dir') as Dir) || 'ltr';
  }
  return 'ltr';
}

/** Returns true if the current direction is RTL */
export function isRTL(lang?: Language): boolean {
  if (lang) return lang === 'ar';
  return getDir() === 'rtl';
}

/** Returns 'rtl' or 'ltr' */
export function getTextDir(lang?: Language): Dir {
  return isRTL(lang) ? 'rtl' : 'ltr';
}

// ─── Class helpers ─────────────────────────────────────────────────────────

/**
 * rtl namespace — Tailwind class name helpers.
 * All methods accept an optional language override.
 */
export const rtl = {
  /** Flex row — reverses in RTL */
  flex: (arg1?: Language | string, arg2?: Language) => {
    const lang = arg1 === 'ar' || arg1 === 'en' ? arg1 : arg2;
    const classes = typeof arg1 === 'string' && arg1 !== 'ar' && arg1 !== 'en' ? arg1 : 'row';

    if (classes.includes('row')) {
      const directional = isRTL(lang)
        ? classes.replace(/\brow\b/, 'row-reverse')
        : classes;
      return `flex ${directional}`;
    }

    return `flex ${classes}`;
  },

  /** Flex row with gap */
  flexGap: (gap: number, lang?: Language) =>
    `${rtl.flex(lang)} gap-${gap}`,

  /** Text alignment */
  text: (lang?: Language) =>
    isRTL(lang) ? 'text-right' : 'text-left',

  /** Alias for text alignment used in older components */
  textAlign: (lang?: Language) =>
    rtl.text(lang),

  /** Explicit flex row helper kept for backwards compatibility */
  flexRow: (lang?: Language) =>
    rtl.flex(lang),

  /** Margin left → becomes margin-right in RTL */
  ml: (n: number, lang?: Language) =>
    isRTL(lang) ? `mr-${n}` : `ml-${n}`,

  /** Margin right → becomes margin-left in RTL */
  mr: (n: number, lang?: Language) =>
    isRTL(lang) ? `ml-${n}` : `mr-${n}`,

  /** Padding left */
  pl: (n: number, lang?: Language) =>
    isRTL(lang) ? `pr-${n}` : `pl-${n}`,

  /** Padding right */
  pr: (n: number, lang?: Language) =>
    isRTL(lang) ? `pl-${n}` : `pr-${n}`,

  /** Left positioning → becomes right in RTL */
  left: (n: number, lang?: Language) =>
    isRTL(lang) ? `right-${n}` : `left-${n}`,

  /** Right positioning → becomes left in RTL */
  right: (n: number, lang?: Language) =>
    isRTL(lang) ? `left-${n}` : `right-${n}`,

  /** Border radius start */
  roundedStart: (size: string, lang?: Language) =>
    isRTL(lang) ? `rounded-r-${size}` : `rounded-l-${size}`,

  /** Border radius end */
  roundedEnd: (size: string, lang?: Language) =>
    isRTL(lang) ? `rounded-l-${size}` : `rounded-r-${size}`,

  /** Items alignment in flex */
  itemsStart: (lang?: Language) =>
    isRTL(lang) ? 'items-end' : 'items-start',

  /** Justify content */
  justifyStart: (lang?: Language) =>
    isRTL(lang) ? 'justify-end' : 'justify-start',
} as const;

// ─── Icon flip helper ──────────────────────────────────────────────────────

/**
 * flipX — apply to directional icons (chevrons, arrows) that should mirror in RTL.
 * @example <ChevronRight className={flipX(language)} />
 */
export function flipX(lang?: Language): string {
  return isRTL(lang) ? 'scale-x-[-1]' : '';
}

// ─── Conditional class helper ──────────────────────────────────────────────

/**
 * rtlClass — returns one class for LTR, another for RTL.
 * @example className={rtlClass('text-left', 'text-right', language)}
 */
export function rtlClass(ltrClass: string, rtlClassStr: string, lang?: Language): string {
  return isRTL(lang) ? rtlClassStr : ltrClass;
}

// ─── Style object helpers ──────────────────────────────────────────────────

/** Returns an inline style object for text direction */
export function dirStyle(lang?: Language): CSSProperties {
  return { direction: getTextDir(lang) };
}

/** Returns the HTML dir attribute value */
export function dirAttr(lang?: Language): Dir {
  return getTextDir(lang);
}

// ─── Font helper ──────────────────────────────────────────────────────────

/** Returns the Arabic font class when language is 'ar' */
export function fontClass(lang?: Language): string {
  return isRTL(lang) ? 'font-cairo' : '';
}
