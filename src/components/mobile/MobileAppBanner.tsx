/**
 * MobileAppBanner – Wasel | واصل
 *
 * Smart "Download the app" banner shown on mobile browsers when the user
 * has not installed the PWA yet.  Links to App Store / Play Store while
 * also surfacing the PWA "Add to Home Screen" option.
 *
 * Shows once per session; dismissed state persists 30 days.
 */

import { useEffect, useState } from 'react';
import { X, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const DISMISSED_KEY = 'wasel-app-banner-dismissed';
const DISMISSED_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function wasDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw) as { ts: number };
    return Date.now() - ts < DISMISSED_EXPIRY_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ ts: Date.now() }));
  } catch { /* ignore */ }
}

function isMobile(): boolean {
  return window.matchMedia('(max-width: 640px)').matches;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function getPlatform(): 'ios' | 'android' | 'other' {
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

// ── Component ────────────────────────────────────────────────────────────────

export function MobileAppBanner() {
  const { language, dir } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || wasDismissed()) return;
    // Small delay so it doesn't flash immediately
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const platform = getPlatform();
  const isAr = language === 'ar';

  const storeUrl =
    platform === 'ios'
      ? 'https://apps.apple.com/jo/app/wasel/id0000000000'
      : 'https://play.google.com/store/apps/details?id=jo.wasel.app';

  const storeName =
    platform === 'ios'
      ? isAr ? 'App Store' : 'App Store'
      : isAr ? 'Google Play' : 'Google Play';

  const copy = isAr
    ? {
        title: 'تطبيق واصل',
        subtitle: 'تجربة أسرع وأجمل',
        rating: '4.8 نجوم',
        cta: `تحميل من ${storeName}`,
        dismiss: 'لاحقاً',
      }
    : {
        title: 'Wasel App',
        subtitle: 'Faster, smoother ride experience',
        rating: '4.8 stars',
        cta: `Get on ${storeName}`,
        dismiss: 'Later',
      };

  const handleDismiss = () => {
    setVisible(false);
    markDismissed();
  };

  return (
    <div
      dir={dir}
      role="banner"
      aria-label={isAr ? 'تنزيل تطبيق واصل' : 'Download Wasel app'}
      className="fixed top-0 inset-x-0 z-[55] flex items-center gap-3 bg-slate-900/95 backdrop-blur border-b border-white/10 px-3 py-2.5 animate-in slide-in-from-top-2 duration-300"
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
    >
      {/* Close */}
      <button
        type="button"
        aria-label={isAr ? 'إغلاق' : 'Close'}
        onClick={handleDismiss}
        className="shrink-0 rounded-full p-1 text-slate-400 hover:text-white transition"
      >
        <X className="h-4 w-4" />
      </button>

      {/* App icon */}
      <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
        <span className="text-lg font-black text-white">و</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{copy.title}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-2.5 w-2.5 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'fill-amber-400/40 text-amber-400/40'}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400">{copy.rating}</span>
        </div>
        <p className="text-[10px] text-slate-400 truncate">{copy.subtitle}</p>
      </div>

      {/* CTA */}
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition active:scale-95"
        onClick={() => markDismissed()}
      >
        {copy.cta}
      </a>
    </div>
  );
}
