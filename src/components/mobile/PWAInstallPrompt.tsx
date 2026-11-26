import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, X } from 'lucide-react';
import { C,  R, SH, SPACE, TYPE  } from '../../utils/wasel-ds';
import { WaselButton } from '../wasel-ui/WaselButton';
import { tx } from '../../locales/tx';

type InstallPromptState = 'idle' | 'available' | 'dismissed' | 'installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [isStandalone] = useState(() => typeof window !== 'undefined' && (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  ));
  const [state, setState] = useState<InstallPromptState>(isStandalone ? 'installed' : 'idle');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    const handler = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      event.preventDefault();
      setDeferredPrompt(promptEvent);
      setState('available');
    };
    const onAppInstalled = () => {
      setState('installed');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {return;}

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

  const wasRecentlyDismissed = useMemo(() => {
    try {
      const dismissed = sessionStorage.getItem('wasel-pwa-install-dismissed');
      if (!dismissed) {return false;}
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      // eslint-disable-next-line react-hooks/purity -- Date.now() in memo is acceptable here
      const now = Date.now();
      return now - dismissedTime < sevenDays;
    } catch {
      return false;
    }
  }, []);

  if (isStandalone || wasRecentlyDismissed || state === 'installed') {
    return null;
  }

  return (
    <PWAInstallPromptCard
      visible={ state === 'available' }
      onDismiss={ handleDismiss }
      onInstall={() => { void handleInstall(); }}
    />
  );
}

function PWAInstallPromptCard ( props: { visible: boolean; onDismiss: () => void; onInstall: () => void } ) {
  const { visible, onDismiss, onInstall } = props;
  return (
    <div
      aria-hidden={ !visible }
      style={{
        position: 'fixed',
        bottom: SPACE[5],
        left: SPACE[4],
        right: SPACE[4],
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[2],
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE[3],
          padding: SPACE[4],
          borderRadius: R.xxl,
          background: `linear-gradient(180deg, ${var(--card)}, ${var(--card)})`,
          border: `1px solid ${var(--border)}`,
          boxShadow: `${SH.lg}, 0 0 0 1px ${var(--border)}40`,
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
            border: `1px solid ${var(--border)}`,
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
              color: var(--foreground),
              fontWeight: TYPE.weight.bold,
              fontSize: TYPE.size.base,
              lineHeight: 1.3,
            }}
          >
            {tx('pWAInstallPrompt.install_wasel')}
          </div>
          <div
            style={{
              color: var(--muted-foreground),
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
            onClick={onDismiss}
            aria-label={tx('pWAInstallPrompt.dismiss_install_prompt')}
            style={{
              minWidth: 36,
              minHeight: 36,
              padding: 6,
              borderRadius: R.full,
              color: var(--muted-foreground),
            }}
          >
            <X size={18} />
          </WaselButton>
          <WaselButton
            size="sm"
            onClick={() => { onInstall(); }}
            aria-label={tx('pWAInstallPrompt.install_wasel_app')}
            style={{
              minHeight: 36,
              padding: '8px 16px',
              borderRadius: R.full,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.green})`,
              color: var(--background),
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

