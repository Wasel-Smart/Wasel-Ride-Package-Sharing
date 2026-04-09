/**
 * WaselPWAInstallPrompt — Smart progressive web app install banner
 *
 * Behaviour:
 * - Listens for `beforeinstallprompt` event (Chrome/Edge/Android)
 * - Shows iOS manual-install instructions on Safari/iOS
 * - Dismisses permanently after user installs or clicks "Not now"
 * - Respects a 48-hour snooze in localStorage
 * - Slides up from bottom with spring animation
 * - Bilingual: AR / EN, RTL-aware
 * - Wasel design language (navy, cyan, gold)
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const SNOOZE_KEY  = 'wasel_pwa_snoozed_until';
const DISMISS_KEY = 'wasel_pwa_dismissed';
const CYAN        = '#47B7E6';
const GOLD        = '#A8D614';
const F           = "'Plus Jakarta Sans','Cairo','Tajawal',sans-serif";
const SNOOZE_MS   = 48 * 60 * 60 * 1000; // 48 h

/* ─── Detect platform ─────────────────────────────────────────────────────── */
function detectPlatform() {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isStandalone =
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return 'installed';
  if (isIOS && isSafari) return 'ios';
  return 'android'; // covers Chrome on Android + desktop Chrome
}

/* ─── Copy ────────────────────────────────────────────────────────────────── */
const COPY = {
  en: {
    title: 'Install Wasel',
    subtitle: 'Add to your home screen for the best experience',
    install: 'Install',
    notNow: 'Not now',
    iosStep1: 'Tap',
    iosStep2: 'then "Add to Home Screen"',
    benefit1: '⚡ Faster',
    benefit2: '📴 Works offline',
    benefit3: '🔔 Push alerts',
  },
  ar: {
    title: 'ثبّت واصل',
    subtitle: 'أضفه إلى شاشتك الرئيسية للحصول على أفضل تجربة',
    install: 'تثبيت',
    notNow: 'ليس الآن',
    iosStep1: 'اضغط',
    iosStep2: 'ثم "إضافة إلى الشاشة الرئيسية"',
    benefit1: '⚡ أسرع',
    benefit2: '📴 يعمل بدون إنترنت',
    benefit3: '🔔 إشعارات فورية',
  },
};

export function WaselPWAInstallPrompt() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const copy = isAr ? COPY.ar : COPY.en;

  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'installed' | 'other'>('other');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Already dismissed or installed
    if (localStorage.getItem(DISMISS_KEY)) return;
    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Date.now() < snoozedUntil) return;

    const detected = detectPlatform();
    if (detected === 'installed') return;
    setPlatform(detected);

    if (detected === 'ios') {
      // Delay slightly so user has seen the app first
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    // Android / Chrome desktop: wait for browser event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (platform === 'ios') {
      // Instructions already shown; just dismiss
      localStorage.setItem(DISMISS_KEY, '1');
      setShow(false);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
    setDeferredPrompt(null);
    setShow(false);
  }, [deferredPrompt, platform]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setShow(false);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          dir={isAr ? 'rtl' : 'ltr'}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', // above bottom nav
            left: 16,
            right: 16,
            zIndex: 700,
            borderRadius: 22,
            background: 'linear-gradient(160deg, rgba(8,27,43,0.98), rgba(4,14,28,0.98))',
            border: `1px solid ${CYAN}25`,
            boxShadow: `0 16px 56px rgba(0,10,22,0.7), 0 0 0 1px rgba(93,150,210,0.08)`,
            backdropFilter: 'blur(24px)',
            padding: '18px 18px 20px',
            fontFamily: F,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* App icon placeholder */}
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: `linear-gradient(135deg, ${CYAN}, #1597FF)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 22 }}>🚗</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#EAF7FF', lineHeight: 1.2 }}>
                  {copy.title}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(190,220,240,0.6)', marginTop: 2, lineHeight: 1.4 }}>
                  {copy.subtitle}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(190,220,240,0.5)', padding: 4,
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label={isAr ? 'إغلاق' : 'Dismiss'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Benefits row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[copy.benefit1, copy.benefit2, copy.benefit3].map((b) => (
              <span key={b} style={{
                flex: 1, textAlign: 'center',
                padding: '5px 4px',
                borderRadius: 10,
                background: 'rgba(71,183,230,0.08)',
                border: '1px solid rgba(71,183,230,0.14)',
                fontSize: 10, color: 'rgba(190,220,240,0.8)', fontWeight: 500,
              }}>
                {b}
              </span>
            ))}
          </div>

          {/* iOS instructions */}
          {platform === 'ios' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(168,214,20,0.08)', border: '1px solid rgba(168,214,20,0.18)',
              marginBottom: 14,
            }}>
              <Share size={14} color={GOLD} />
              <span style={{ fontSize: 12, color: 'rgba(220,240,130,0.85)', lineHeight: 1.5 }}>
                {copy.iosStep1} <strong style={{ color: GOLD }}>
                  <Share size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </strong> {copy.iosStep2}
              </span>
              <Plus size={14} color={GOLD} />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleInstall}
              style={{
                flex: 1, padding: '12px',
                borderRadius: 14,
                background: `linear-gradient(135deg, ${CYAN}, #1597FF)`,
                border: 'none', cursor: 'pointer',
                fontFamily: F, fontWeight: 800, fontSize: 14, color: '#032033',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Download size={16} />
              {copy.install}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleDismiss}
              style={{
                padding: '12px 18px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(93,150,210,0.18)',
                cursor: 'pointer',
                fontFamily: F, fontWeight: 600, fontSize: 13, color: 'rgba(190,220,240,0.7)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {copy.notNow}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WaselPWAInstallPrompt;
