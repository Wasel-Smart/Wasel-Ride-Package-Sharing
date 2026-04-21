import clsx from 'clsx';
import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div {...props} className={clsx('ds-card', className)}>
      {children}
    </div>
  );
}

export default Card;
