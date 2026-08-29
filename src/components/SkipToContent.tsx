/**
 * SkipToContent — Accessible skip navigation link.
 *
 * Visually hidden until focused (keyboard Tab). Allows screen-reader
 * and keyboard users to bypass repetitive navigation and jump straight
 * to the main content landmark (WCAG 2.4.1 — Bypass Blocks).
 *
 * Bilingual: reads language from localStorage to avoid context dependency
 * (this renders above LanguageProvider in the component tree).
 */

function getSkipLabel(): string {
  try {
    const lang = localStorage.getItem('wasel-language');
    return lang === 'ar' ? 'الانتقال إلى المحتوى الرئيسي' : 'Skip to main content';
  } catch {
    return 'Skip to main content';
  }
}

export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:rounded-xl focus:bg-primary focus:text-white focus:font-bold focus:text-sm focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
      aria-label={getSkipLabel()}
    >
      {getSkipLabel()}
    </a>
  );
}
