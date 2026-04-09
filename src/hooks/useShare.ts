/**
 * useShare — Reusable share utility for Wasel
 *
 * Uses the Web Share API when available (mobile), falls back to
 * copying to clipboard (desktop / sandboxed iframes).
 *
 * Works in Figma iframe environment thanks to copyToClipboard fallback.
 */

import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

interface ShareOptions {
  title: string;
  text: string;
  url: string;
  /** Toast message on successful copy (desktop fallback) */
  successMessage?: string;
  successMessageAr?: string;
  isRTL?: boolean;
}

/**
 * Attempt Web Share API first, fall back to clipboard copy.
 * Returns true if successful.
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  const {
    title,
    text,
    url,
    successMessage = 'Link copied to clipboard!',
    successMessageAr = 'تم نسخ الرابط!',
    isRTL = false,
  } = options;

  // 1. Try native Web Share API (mainly mobile browsers)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      // User cancelled the share dialog — not an error
      if (error instanceof Error && error.name === 'AbortError') return false;
      // Fall through to clipboard
    }
  }

  // 2. Fallback: copy URL to clipboard
  const copied = await copyToClipboard(url);
  if (copied) {
    toast.success(isRTL ? successMessageAr : successMessage);
  } else {
    toast.error(isRTL ? 'فشل نسخ الرابط' : 'Failed to copy link');
  }
  return copied;
}

/**
 * React hook that returns a share handler bound to current language.
 */
export function useShareHandler() {
  // Intentionally a lightweight wrapper — no React state needed
  return { shareContent };
}
