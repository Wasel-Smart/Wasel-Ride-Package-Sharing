/**
 * WaselSelect - token-driven native select field.
 */

import { ChevronDown } from 'lucide-react';
import { type CSSProperties, type ReactNode, type SelectHTMLAttributes, useId, useState } from 'react';
import { ANIM, C, F, R, TYPE } from '../../utils/wasel-ds';

export interface WaselSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface WaselSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  hint?: ReactNode;
  options: WaselSelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  containerStyle?: CSSProperties;
}

export function WaselSelect({
  label,
  description,
  error,
  hint,
  options,
  placeholder,
  onChange,
  id,
  value,
  defaultValue,
  disabled,
  style,
  containerStyle,
  ...rest
}: WaselSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const [focused, setFocused] = useState(false);

  const hasError = Boolean(error);
  const borderColor = hasError ? C.error : focused ? C.borderHov : C.border;
  const boxShadow = hasError
    ? `0 0 0 3px ${C.errorDim}`
    : focused
      ? `0 0 0 3px ${C.cyanDim}`
      : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...containerStyle }}>
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
              htmlFor={selectId}
              style={{
                fontSize: TYPE.size.sm,
                fontWeight: TYPE.weight.bold,
                color: C.textSub,
                fontFamily: F,
                lineHeight: 1.4,
              }}
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
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minHeight: '50px',
          borderRadius: R.lg,
          background: focused ? C.card2 : C.cardSolid,
          border: `1.5px solid ${borderColor}`,
          boxShadow,
          transition: `border-color ${ANIM.dur.normal} ${ANIM.ease.default}, box-shadow ${ANIM.dur.normal} ${ANIM.ease.default}, background ${ANIM.dur.normal} ${ANIM.ease.default}`,
          opacity: disabled ? 0.62 : 1,
        }}
      >
        <select
          {...rest}
          id={selectId}
          value={value}
          defaultValue={defaultValue ?? (placeholder ? '' : undefined)}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          onChange={e => onChange?.(e.target.value)}
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={{
            width: '100%',
            minWidth: 0,
            minHeight: '48px',
            padding: '0 42px 0 14px',
            appearance: 'none',
            WebkitAppearance: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: C.text,
            fontSize: TYPE.size.base,
            fontFamily: F,
            cursor: disabled ? 'not-allowed' : 'pointer',
            ...style,
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          size={16}
          style={{
            position: 'absolute',
            right: '14px',
            pointerEvents: 'none',
            color: C.textMuted,
          }}
        />
      </div>

      {error && (
        <span id={errorId} style={{ fontSize: TYPE.size.xs, color: C.error, fontFamily: F }}>
          {error}
        </span>
      )}
      {hint && !error && hint}
    </div>
  );
}
