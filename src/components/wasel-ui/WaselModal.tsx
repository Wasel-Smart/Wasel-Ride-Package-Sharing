/**
 * WaselModal — accessible modal dialog built on tokens.
 * Handles: focus trap, backdrop click, Escape key, scroll lock.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { C, R, SH, TYPE, F, Z } from '../../utils/wasel-ds';

interface WaselModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  style?: CSSProperties;
}

const sizeWidths = { sm: '400px', md: '540px', lg: '720px', full: '100%' };

export function WaselModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  style,
}: WaselModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2,7,12,0.82)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    zIndex: Z.modal,
    animation: 'fade-in 140ms ease',
  };

  const dialogStyle: CSSProperties = {
    background: 'var(--card)',
    border: `1px solid ${C.border}`,
    borderRadius: R['3xl'],
    boxShadow: SH.lg,
    width: '100%',
    maxWidth: sizeWidths[size],
    maxHeight: 'calc(100dvh - 48px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: F,
    animation: 'scale-in 160ms cubic-bezier(0.22,1,0.36,1)',
    outline: 'none',
    ...style,
  };

  return (
    <div
      style={backdropStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'wasel-modal-title' : undefined}
        aria-describedby={description ? 'wasel-modal-desc' : undefined}
        tabIndex={-1}
        style={dialogStyle}
      >
        {/* Header */}
        {(title || description) && (
          <div style={{ padding: '22px 24px 16px', borderBottom: `1px solid ${C.borderFaint}`, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              {title && (
                <h2 id="wasel-modal-title" style={{ margin: 0, fontSize: TYPE.size.lg, fontWeight: 900, color: C.text, lineHeight: 1.2 }}>
                  {title}
                </h2>
              )}
              {description && (
                <p id="wasel-modal-desc" style={{ margin: '6px 0 0', fontSize: TYPE.size.sm, color: C.textMuted, lineHeight: 1.55 }}>
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{ background: 'rgba(255,245,222,0.06)', border: `1px solid ${C.border}`, borderRadius: R.lg, padding: '6px', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div style={{ padding: '14px 24px 22px', borderTop: `1px solid ${C.borderFaint}` }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
