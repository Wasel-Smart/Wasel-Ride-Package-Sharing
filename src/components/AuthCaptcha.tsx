import { useEffect, useRef, useState } from 'react';
import { C, F, R, SPACE, TYPE } from '../utils/wasel-ds';

type CaptchaProvider = 'hcaptcha' | 'turnstile';

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string | number;
      reset: (widgetId?: string | number) => void;
      remove?: (widgetId?: string | number) => void;
    };
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string | number;
      reset: (widgetId?: string | number) => void;
      remove: (widgetId?: string | number) => void;
    };
  }
}

const provider = (import.meta.env.VITE_AUTH_CAPTCHA_PROVIDER as string | undefined)
  ?.trim()
  .toLowerCase();
const siteKey = (import.meta.env.VITE_AUTH_CAPTCHA_SITE_KEY as string | undefined)?.trim();

export const authCaptchaProvider: CaptchaProvider | null =
  provider === 'hcaptcha' || provider === 'turnstile' ? provider : null;
export const isAuthCaptchaConfigured = Boolean(authCaptchaProvider && siteKey);

function loadCaptchaScript(providerName: CaptchaProvider): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const globalName = providerName === 'hcaptcha' ? 'hcaptcha' : 'turnstile';
  if (window[globalName]) return Promise.resolve();

  const scriptId = `wasel-${providerName}-captcha`;
  const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (existingScript?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script =
      existingScript ??
      Object.assign(document.createElement('script'), {
        id: scriptId,
        async: true,
        defer: true,
        src:
          providerName === 'hcaptcha'
            ? 'https://js.hcaptcha.com/1/api.js?render=explicit'
            : 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      });

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => reject(new Error('CAPTCHA failed to load.')));

    if (!existingScript) document.head.appendChild(script);
  });
}

interface AuthCaptchaProps {
  onTokenChange: (token: string | null) => void;
  resetSignal: number;
}

export function AuthCaptcha({ onTokenChange, resetSignal }: AuthCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!authCaptchaProvider || !siteKey || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    loadCaptchaScript(authCaptchaProvider)
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const callbacks = {
          sitekey: siteKey,
          theme: 'dark',
          callback: (token: string) => onTokenChange(token),
          'expired-callback': () => onTokenChange(null),
          'error-callback': () => onTokenChange(null),
        };

        if (authCaptchaProvider === 'hcaptcha' && window.hcaptcha) {
          widgetIdRef.current = window.hcaptcha.render(container, callbacks);
        }

        if (authCaptchaProvider === 'turnstile' && window.turnstile) {
          widgetIdRef.current = window.turnstile.render(container, callbacks);
        }
      })
      .catch(error => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'CAPTCHA failed.');
      });

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (authCaptchaProvider === 'hcaptcha') {
        window.hcaptcha?.remove?.(widgetId ?? undefined);
      }
      if (authCaptchaProvider === 'turnstile') {
        window.turnstile?.remove(widgetId ?? undefined);
      }
      onTokenChange(null);
    };
  }, [onTokenChange]);

  useEffect(() => {
    const widgetId = widgetIdRef.current ?? undefined;
    if (authCaptchaProvider === 'hcaptcha') window.hcaptcha?.reset(widgetId);
    if (authCaptchaProvider === 'turnstile') window.turnstile?.reset(widgetId);
    onTokenChange(null);
  }, [onTokenChange, resetSignal]);

  if (!isAuthCaptchaConfigured) return null;

  return (
    <div
      style={{
        borderRadius: R.lg,
        border: `1px solid ${C.border}`,
        background: `${C.text}05`,
        padding: SPACE[3],
        minHeight: 84,
      }}
    >
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
      {loadError && (
        <p
          style={{
            margin: `${SPACE[2]} 0 0`,
            color: C.error,
            fontFamily: F,
            fontSize: TYPE.size.xs,
            textAlign: 'center',
          }}
        >
          {loadError}
        </p>
      )}
    </div>
  );
}
