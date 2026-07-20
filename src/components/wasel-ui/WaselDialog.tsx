/**
 * WaselDialog - token-driven modal surface.
 */

import { X } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useId } from 'react';
import { ANIM, C, F, R, SH, TYPE, Z } from '../../utils/wasel-ds';
import { WaselButton } from './WaselButton';

type DialogSize = 'sm' | 'md' | 'lg';

interface WaselDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
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

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: C.overlay,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{
          width: '100%',
          maxWidth: widthBySize[size],
          maxHeight: 'min(720px, calc(100vh - 48px))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: R.xxl,
          background: C.glass,
          border: `1px solid ${C.borderHov}`,
          boxShadow: SH.xl,
          color: C.text,
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
            borderBottom: `1px solid ${C.borderFaint}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                color: C.text,
                fontSize: TYPE.size.xl,
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
                  color: C.textMuted,
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
            onClick={onClose}
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
              borderTop: `1px solid ${C.borderFaint}`,
            }}
          >
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}
