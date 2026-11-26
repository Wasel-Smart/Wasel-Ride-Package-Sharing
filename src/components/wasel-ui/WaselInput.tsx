/**
 * WaselInput - design-system text field.
 */

import { Eye, EyeOff } from 'lucide-react';
import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react';
import { C,  F, R, TYPE  } from '../../utils/wasel-ds';
import { sanitizeHtml } from '../../utils/sanitization';

// Focus / error styling lives in CSS (:focus-within) instead of React state, so it
// can be themed and doesn't re-render the field on every focus change.
const INPUT_STYLE_ID = 'wasel-input-css';
const INPUT_CSS = `
  .wasel-input-box { border: 1.5px solid var(--ring, ${ C.borderInput }); background: var(--card, ${ 'var(--card)' }); transition: border-color 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 150ms cubic-bezier(0.4,0,0.2,1), background 150ms cubic-bezier(0.4,0,0.2,1); }
  .wasel-input-box:hover { border-color: var(--primary, ${ C.cyan }); opacity: 0.9; }
  .wasel-input-box:focus-within { border-color: var(--primary, ${ C.cyan }); background: var(--muted, ${ 'var(--card)' }); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, ${ C.cyan }) 20%, transparent); }
  .wasel-input-box[data-invalid='true'] { border-color: var(--destructive, ${ 'var(--destructive)' }); box-shadow: 0 0 0 3px color-mix(in srgb, var(--destructive, ${ 'var(--destructive)' }) 14%, transparent); }
`;

if ( typeof document !== 'undefined' && !document.getElementById( INPUT_STYLE_ID ) ) {
  const el = document.createElement( 'style' );
  el.id = INPUT_STYLE_ID;
  el.textContent = INPUT_CSS;
  document.head.appendChild( el );
}

interface WaselInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  dir?: 'ltr' | 'rtl';
  onChange?: (value: string) => void;
}

function PasswordToggle({ showPassword, onToggle }: { showPassword: boolean; onToggle: () => void }) {
  // LanguageProvider isn't guaranteed above every input; /initial-locale.js
  // sets <html lang> before first paint, so read the active language from there.
  const ar = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
  const label = ar
    ? (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')
    : (showPassword ? 'Hide password' : 'Show password');
  return (
    <button
      type="button"
      onClick={() => { void onToggle(); }}
      aria-label={label}
      aria-pressed={showPassword}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--muted-foreground)',
        display: 'inline-flex',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

export function WaselInput({
  label,
  description,
  error,
  hint,
  icon,
  trailing,
  type = 'text',
  dir,
  onChange,
  id,
  style,
  ...rest
}: WaselInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(label || description) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '8px',
          }}
        >
          {label && (
            <label
              htmlFor={inputId}
              style={{
                fontSize: TYPE.size.sm,
                fontWeight: TYPE.weight.bold,
                color: 'var(--foreground)',
                fontFamily: F,
                lineHeight: 1.4,
              }}
            >
              {label}
            </label>
          )}
          {description && (
            <span id={descriptionId} style={{ fontSize: TYPE.size.xs, color: 'var(--muted-foreground)', fontFamily: F }}>
              {description}
            </span>
          )}
        </div>
      )}

      <div
        dir={dir}
        className="wasel-input-box"
        data-invalid={hasError || undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 14px',
          minHeight: '50px',
          borderRadius: R.lg,
        }}
      >
        {icon && (
          <span
            style={{ flexShrink: 0, color: 'var(--muted-foreground)', display: 'inline-flex', fontSize: TYPE.size.base }}
          >
            {icon}
          </span>
        )}

        <input
          {...rest}
          id={inputId}
          type={resolvedType}
          aria-invalid={hasError || undefined}
          aria-describedby={[
            rest['aria-describedby'],
            description ? descriptionId : null,
            hasError ? errorId : null,
          ].filter(Boolean).join(' ') || undefined}
          onChange={e => onChange?.(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: TYPE.size.base,
            fontFamily: F,
            color: 'var(--foreground)',
            textAlign: dir === 'rtl' ? 'right' : dir === 'ltr' ? 'left' : 'start',
            minWidth: 0,
            ...style,
          }}
        />

        {isPassword && (
          <PasswordToggle showPassword={showPassword} onToggle={() => setShowPassword(v => !v)} />
        )}

        {trailing && !isPassword && (
          <span style={{ flexShrink: 0, display: 'inline-flex' }}>{trailing}</span>
        )}
      </div>

      {error && (
        <span id={errorId} role="alert" style={{ fontSize: TYPE.size.xs, color: `var(--destructive)`, fontFamily: F, lineHeight: 1.5 }}>
          {sanitizeHtml(error)}
        </span>
      )}

      {hint && !error && hint}
    </div>
  );
}

