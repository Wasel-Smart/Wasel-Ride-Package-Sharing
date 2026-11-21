/**
 * WaselDialog - token-driven modal surface.
 */

import { X } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useId, useRef } from 'react';
import { ANIM, C, F, R, SH, TYPE, Z } from '../../utils/wasel-ds';
import { lockBodyScroll } from '../../utils/bodyScrollLock';
import { WaselButton } from './WaselButton';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogSize = 'sm' | 'md' | 'lg';

interface WaselDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  onClose: () => void;
  closeLabel?: string;
  style?: CSSProperties;
}

const widthBySize: Record<DialogSize, string> = {
  sm: '420px',
  md: '560px',
  lg: '760px',
};

export function WaselDialog({
  open,
  title,
  description,
  children,
  footer,
  size = 'md',
  onClose,
  closeLabel = 'Close',
  style,
}: WaselDialogProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const panelRef = useRef<HTMLElement>(null);

  // Focus management: move focus into the dialog, trap Tab, lock background
  // scroll, and hand focus back to whatever opened it when it closes.
  useEffect(() => {
    if (!open) {return undefined;}

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const releaseScroll = lockBodyScroll();
    const panel = panelRef.current;
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    // Prefer the first form control over the close button.
    const first = focusables().find(el => el.tagName !== 'BUTTON') ?? focusables()[0] ?? panel;
    first?.focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {return;}
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) {return;}
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      releaseScroll();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {return undefined;}

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {onClose();}
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {return null;}

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {onClose();}
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: widthBySize[size],
          maxHeight: 'min(720px, calc(100dvh - 48px))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: R.xxl,
          background: 'var(--card)',
          border: `1px solid var(--border)`,
          boxShadow: SH.xl,
          color: 'var(--foreground)',
          fontFamily: F,
          animation: `scale-in ${ANIM.dur.slow} ${ANIM.ease.decel}`,
          ...style,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px 20px 14px',
            borderBottom: `1px solid var(--border)`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                color: 'var(--foreground)',
                fontWeight: TYPE.weight.ultra,
                lineHeight: TYPE.lineHeight.snug,
                letterSpacing: TYPE.letterSpacing.normal,
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                style={{
                  margin: 0,
                  color: 'var(--muted-foreground)',
                  fontSize: TYPE.size.sm,
                  lineHeight: TYPE.lineHeight.normal,
                }}
              >
                {description}
              </p>
            )}
          </div>

          <WaselButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={closeLabel}
            onClick={() => { void onClose(); }}
            style={{ width: '36px', padding: 0, flexShrink: 0 }}
          >
            <X size={16} />
          </WaselButton>
        </header>

        <div style={{ padding: '20px', overflow: 'auto' }}>{children}</div>

        {footer && (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px 20px',
              borderTop: `1px solid var(--border)`,
            }}
          >
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}
