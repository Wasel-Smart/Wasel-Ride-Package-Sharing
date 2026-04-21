import clsx from 'clsx';
import type { OptionHTMLAttributes, SelectHTMLAttributes } from 'react';

type SelectOption = OptionHTMLAttributes<HTMLOptionElement> & {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  hint?: string;
  label?: string;
  options: SelectOption[];
};

export function Select({
  className,
  error,
  hint,
  id,
  label,
  options,
  ...props
}: SelectProps) {
  return (
    <label className="ds-field" htmlFor={id}>
      {label ? <span className="ds-field__label">{label}</span> : null}
      <select {...props} className={clsx('ds-select', className)} id={id}>
        {options.map((option) => (
          <option key={option.value} {...option}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="ds-field__error">{error}</span> : null}
      {!error && hint ? <span className="ds-field__hint">{hint}</span> : null}
    </label>
  );
}

export default Select;
