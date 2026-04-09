/**
 * WaselInput — design-system text field.
 *
 * Features:
 *  - Focus ring from design tokens (no hardcoded rgba)
 *  - Optional leading icon, trailing element (button/icon)
 *  - Password show/hide built in when type="password"
 *  - Error state with red border + message
 *  - Label + description in token colours
 *
 * All colours reference C, R, TYPE from wasel-ds — zero hardcoded hex.
 */

import { Eye, EyeOff } from 'lucide-react';
import { type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { C, R, TYPE, F } from '../../utils/wasel-ds';

interface WaselInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?:       string;
  description?: string;
  error?:       string;
  hint?:        ReactNode;
  icon?:        ReactNode;
  trailing?:    ReactNode;
  onChange?:    (value: string) => void;
}

export function WaselInput({
  label,
  description,
  error,
  hint,
  icon,
  trailing,
  type     = 'text',
  onChange,
  id,
  style,
  ...rest
}: WaselInputProps) {
  const [focused,      setFocused]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword   = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;
  const hasError     = Boolean(error);
  const descriptionId = description && id ? `${id}-description` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;
  const hintId = hint && !error && id ? `${id}-hint` : undefined;
  const describedBy = [descriptionId, errorId, hintId].filter(Boolean).join(' ') || undefined;

  const borderColor = hasError
    ? C.error
    : focused
      ? C.borderHov
      : C.border;

  const boxShadow = hasError
    ? `0 0 0 3px ${C.errorDim}`
    : focused
      ? `0 0 0 3px ${C.cyanDim}`
      : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(label || description) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          {label && (
            <label
              htmlFor={id}
              style={{ fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: C.textSub, fontFamily: F, lineHeight: 1.4 }}
            >
              {label}
            </label>
          )}
          {description && (
            <span
              id={descriptionId}
              style={{ fontSize: TYPE.size.xs, color: C.textMuted, fontFamily: F }}
            >
              {description}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '10px',
          padding:      '0 14px',
          minHeight:    '50px',
          borderRadius: R.lg,
          background:   focused ? C.card2 : C.cardSolid,
          border:       `1.5px solid ${borderColor}`,
          boxShadow,
          transition:   'border-color 150ms ease, box-shadow 150ms ease, background 150ms ease',
        }}
      >
        {icon && (
          <span style={{ flexShrink: 0, color: C.textMuted, display: 'inline-flex', fontSize: '16px' }}>
            {icon}
          </span>
        )}

        <input
          {...rest}
          id={id}
          type={resolvedType}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
          aria-invalid={hasError || rest['aria-invalid'] === true}
          aria-describedby={rest['aria-describedby'] ?? describedBy}
          style={{
            flex:       1,
            border:     'none',
            outline:    'none',
            background: 'transparent',
            fontSize:   TYPE.size.base,
            fontFamily: F,
            color:      C.text,
            minWidth:   0,
            ...style,
          }}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'inline-flex', padding: 0, flexShrink: 0 }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}

        {trailing && !isPassword && (
          <span style={{ flexShrink: 0, display: 'inline-flex' }}>{trailing}</span>
        )}
      </div>

      {error && (
        <span
          id={errorId}
          role="alert"
          style={{ fontSize: TYPE.size.xs, color: C.error, fontFamily: F, lineHeight: 1.5 }}
        >
          {error}
        </span>
      )}

      {hint && !error ? <div id={hintId}>{hint}</div> : null}
    </div>
  );
}
