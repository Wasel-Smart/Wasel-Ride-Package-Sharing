import clsx from 'clsx';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import type { ButtonVariant } from '../tokens';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    fullWidth?: boolean;
    variant?: ButtonVariant;
  }
>;

export function Button({
  children,
  className,
  fullWidth = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx('ds-button', className)}
      data-full-width={fullWidth}
      data-variant={variant}
      type={type}
    >
      {children}
    </button>
  );
}

export default Button;
