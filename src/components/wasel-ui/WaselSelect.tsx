/**
 * WaselSelect - token-driven native select field.
 */

import { ChevronDown } from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
  useState,
} from 'react';
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
  dir?: 'ltr' | 'rtl';
  onChange?: (value: string) => void;
  containerStyle?: CSSProperties;
}

function SelectLabel({ label, description, selectId }: {
  label?: string;
  description?: string;
  selectId: string;
}) {
  if (!label && !description) {return null;}
  return (
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
            color: `var(--foreground)`,
            fontFamily: F,
            lineHeight: 1.4,
          }}
        >
          {label}
        </label>
      )}
      {description && (
        <span
          id={`${selectId}-description`}
          style={{ fontSize: TYPE.size.xs, color: `var(--muted-foreground)`, fontFamily: F }}
        >
          {description}
        </span>
      )}
    </div>
  );
}

function SelectField({ focused, disabled, hasError, borderColor, boxShadow, style, selectId, describedBy, value, defaultValue, placeholder, options, onChange, rest, onFocus, onBlur }: {
  focused: boolean;
  disabled: boolean;
  hasError: boolean;
  borderColor: string;
  boxShadow: string;
  style: CSSProperties | undefined;
  selectId: string;
  describedBy?: string;
  value: string | number | readonly string[] | undefined;
  defaultValue: string | number | readonly string[] | undefined;
  placeholder?: string;
  options: WaselSelectOption[];
  onChange?: (value: string) => void;
  rest: SelectHTMLAttributes<HTMLSelectElement>;
  onFocus: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minHeight: '50px',
        borderRadius: R.lg,
        background: focused ? `var(--muted)` : `var(--card)`,
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
        // Passing both value and defaultValue makes React warn and ignore one;
        // only seed the placeholder default for uncontrolled selects.
        defaultValue={value === undefined ? (defaultValue ?? (placeholder ? '' : undefined)) : undefined}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        onChange={e => onChange?.(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          width: '100%',
          minWidth: 0,
          minHeight: '48px',
          padding: '0 14px',
          paddingInlineEnd: '42px',
          appearance: 'none',
          WebkitAppearance: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: `var(--foreground)`,
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
          insetInlineEnd: '14px',
          pointerEvents: 'none',
          color: `var(--muted-foreground)`,
        }}
      />
    </div>
  );
}

export function WaselSelect({
  label,
  description,
  error,
  hint,
  options,
  placeholder,
  dir,
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
  const [focused, setFocused] = useState(false);

  const hasError = Boolean(error);
  const borderColor = hasError ? `var(--destructive)` : focused ? `var(--primary)` : `var(--border)`;
  const boxShadow = hasError
    ? `0 0 0 3px color-mix(in srgb, var(--destructive) 20%, transparent)`
    : focused
      ? `0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)`
      : 'none';
  const describedBy = [
    rest['aria-describedby'],
    description ? `${selectId}-description` : null,
    hasError ? `${selectId}-error` : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div
      dir={dir}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        ...containerStyle,
      }}
    >
      <SelectLabel label={label} description={description} selectId={selectId} />

      <SelectField
        focused={focused}
        disabled={disabled ?? false}
        hasError={hasError}
        borderColor={borderColor}
        boxShadow={boxShadow}
        style={style}
        selectId={selectId}
        describedBy={describedBy}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        options={options}
        onChange={onChange}
        rest={rest}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
      />

      {error && (
        <span id={`${selectId}-error`} role="alert" style={{ fontSize: TYPE.size.xs, color: `var(--destructive)`, fontFamily: F }}>
          {error}
        </span>
      )}
      {hint && !error && hint}
    </div>
  );
}
