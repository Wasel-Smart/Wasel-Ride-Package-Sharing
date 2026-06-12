/**
 * PWAInstallBanner – Wasel | واصل
 *
 * Arabic-first "Add to Home Screen" banner for mobile browsers.
 * • Android/Chrome: captures `beforeinstallprompt` and shows a native prompt
 * • iOS Safari: shows a manual step-by-step guide with the Share icon
 * • Already installed (standalone): renders nothing
 * • Dismissed: hides for 14 days via localStorage
 *
 * Render once near the root of App.tsx.
 */

import { useEffect, useRef, useState } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

type InstallState = 'hidden' | 'android' | 'ios' | 'installed';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isIOSSafari(): boolean {
  return isIOS() && /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
}

const DISMISSED_KEY = 'wasel-pwa-banner-dismissed';
const DISMISSED_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

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
  } catch {
    // ignore storage quota errors
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PWAInstallBanner() {
  const { language, dir } = useLanguage();
  const [state, setState] = useState<InstallState>('hidden');
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    // Android / Chrome – capture the deferred install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setState('android');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari – show manual add-to-home-screen guidance
    if (isIOSSafari()) {
      // Small delay so it doesn't pop immediately on page load
      const t = setTimeout(() => setState('ios'), 2500);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (state === 'hidden' || state === 'installed') return null;

  const isAr = language === 'ar';

  const androidCopy = {
    title: isAr ? 'ثبّت واصل على شاشتك الرئيسية' : 'Install Wasel on your home screen',
    body: isAr
      ? 'تجربة أسرع وأجمل — مثل تطبيق حقيقي، بدون متجر.'
      : 'Faster & smoother — like a native app, no store needed.',
    cta: isAr ? 'ثبّت الآن' : 'Install now',
  };

  const iosCopy = {
    title: isAr ? 'أضف واصل لشاشتك الرئيسية' : 'Add Wasel to your home screen',
    body: isAr
      ? 'اضغط على أيقونة المشاركة ثم "إضافة إلى الشاشة الرئيسية"'
      : 'Tap the Share icon then "Add to Home Screen"',
    step1: isAr ? 'اضغط' : 'Tap',
    step2: isAr ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Choose "Add to Home Screen"',
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setState(outcome === 'accepted' ? 'installed' : 'hidden');
    if (outcome !== 'accepted') markDismissed();
  };

  const handleDismiss = () => {
    setState('hidden');
    markDismissed();
  };

  return (
    <div
      role="region"
      aria-label={isAr ? 'تثبيت التطبيق' : 'Install app banner'}
      dir={dir}
      className={[
        'fixed bottom-0 inset-x-0 z-[60]',
        'md:bottom-5 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[28rem]',
        'md:rounded-2xl md:shadow-2xl md:border md:border-white/10',
        'border-t border-white/10',
        'bg-slate-900/95 backdrop-blur-xl',
        'animate-in slide-in-from-bottom-3 duration-300',
      ].join(' ')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* App icon */}
        <div className="shrink-0 rounded-xl bg-cyan-500/15 p-2.5 text-cyan-400">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          {state === 'android' ? (
            <>
              <p className="text-sm font-bold text-white leading-snug">{androidCopy.title}</p>
              <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{androidCopy.body}</p>
              <button
                type="button"
                onClick={() => void handleAndroidInstall()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                {androidCopy.cta}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white leading-snug">{iosCopy.title}</p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold shrink-0">1</span>
                  <span>{iosCopy.step1}</span>
                  <Share className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold shrink-0">2</span>
                  <span>{iosCopy.step2}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          aria-label={isAr ? 'إغلاق' : 'Close'}
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-white/10 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
