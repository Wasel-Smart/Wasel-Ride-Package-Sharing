/**
 * Safe Clipboard Utility
 *
 * navigator.clipboard.writeText requires the `clipboard-write` permission
 * which is blocked in sandboxed iframes and some deployment environments.
 *
 * This util tries the modern Clipboard API first, then falls back to the
 * legacy document.execCommand('copy') approach which works everywhere.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern Clipboard API (requires permission)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied → fall through to execCommand
    }
  }

  // Legacy fallback — works in sandboxed iframes & all browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Move off-screen so it's invisible
    textArea.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}
