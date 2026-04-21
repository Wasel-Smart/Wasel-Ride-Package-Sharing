import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label?: string;
};

export function Input({ className, error, hint, id, label, ...props }: InputProps) {
  return (
    <label className="ds-field" htmlFor={id}>
      {label ? <span className="ds-field__label">{label}</span> : null}
      <input {...props} className={clsx('ds-input', className)} id={id} />
      {error ? <span className="ds-field__error">{error}</span> : null}
      {!error && hint ? <span className="ds-field__hint">{hint}</span> : null}
    </label>
  );
}

export default Input;
