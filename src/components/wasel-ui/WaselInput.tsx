/**
 * WaselInput — unified design system
 */

import { Eye, EyeOff } from 'lucide-react';
import { type InputHTMLAttributes, useState } from 'react';

interface WaselInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  onChange?: (value: string) => void;
}

export function WaselInput({
  label,
  error,
  icon,
  type = 'text',
  onChange,
  id,
  style,
  ...rest
}: WaselInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 12px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          border: `1px solid ${hasError ? 'var(--error)' : focused ? 'var(--accent)' : 'var(--border)'}`,
          transition: 'border-color 150ms ease',
        }}
      >
        {icon && <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{icon}</span>}
        <input
          {...rest}
          id={id}
          type={resolvedType}
          onChange={e => onChange?.(e.target.value)}
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          aria-invalid={hasError}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: 'var(--text-primary)',
            ...style,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              padding: 0,
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <span role="alert" style={{ fontSize: '12px', color: 'var(--error)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
