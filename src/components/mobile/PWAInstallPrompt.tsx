import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';
import { WaselButton } from '../wasel-ui/WaselButton';
import { tx } from '../../locales/tx';

type InstallPromptState = 'idle' | 'available' | 'dismissed' | 'installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>('idle');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) {
      setState('installed');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      event.preventDefault();
      setDeferredPrompt(promptEvent);
      setState('available');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setState('installed');
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        setState('installed');
      } else {
        setState('dismissed');
      }
    } catch {
      setState('dismissed');
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setState('dismissed');
    setDeferredPrompt(null);

    try {
      sessionStorage.setItem('wasel-pwa-install-dismissed', Date.now().toString());
    } catch {
      // Storage not available
    }
  }, []);

  if (state !== 'available' || isStandalone) {
    return null;
  }

  const wasRecentlyDismissed = (() => {
    try {
      const dismissed = sessionStorage.getItem('wasel-pwa-install-dismissed');
      if (!dismissed) return false;
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - dismissedTime < sevenDays;
    } catch {
      return false;
    }
  })();

  if (wasRecentlyDismissed || state !== 'available') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: SPACE[5],
        left: SPACE[4],
        right: SPACE[4],
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[2],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE[3],
          padding: SPACE[4],
          borderRadius: R.xxl,
          background: `linear-gradient(180deg, ${C.cardSolid}, ${C.card})`,
          border: `1px solid ${C.border}`,
          boxShadow: `${SH.lg}, 0 0 0 1px ${C.border}40`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: R.xl,
            background: `linear-gradient(135deg, ${C.cyan}30, ${C.green}30)`,
            border: `1px solid ${C.border}`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Download size={22} color={C.cyan} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: C.text,
              fontWeight: TYPE.weight.bold,
              fontSize: TYPE.size.base,
              lineHeight: 1.3,
            }}
          >
            {tx('pWAInstallPrompt.install_wasel')}
          </div>
          <div
            style={{
              color: C.textMuted,
              fontSize: TYPE.size.sm,
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            {tx('pWAInstallPrompt.add_to_home_screen_for_faster_access_and_offline_use')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <WaselButton
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            aria-label={tx('pWAInstallPrompt.dismiss_install_prompt')}
            style={{
              minWidth: 36,
              minHeight: 36,
              padding: 6,
              borderRadius: R.full,
              color: C.textMuted,
            }}
          >
            <X size={18} />
          </WaselButton>
          <WaselButton
            size="sm"
            onClick={handleInstall}
            aria-label={tx('pWAInstallPrompt.install_wasel_app')}
            style={{
              minHeight: 36,
              padding: '8px 16px',
              borderRadius: R.full,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.green})`,
              color: C.bg,
              fontWeight: TYPE.weight.bold,
              fontSize: TYPE.size.sm,
            }}
          >
            {tx('pWAInstallPrompt.install')}
          </WaselButton>
        </div>
      </div>
    </div>
  );
}
