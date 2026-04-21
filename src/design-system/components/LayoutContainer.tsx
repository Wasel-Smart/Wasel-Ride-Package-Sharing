import clsx from 'clsx';
import type { HTMLAttributes, PropsWithChildren } from 'react';

type LayoutContainerProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    width?: 'default' | 'wide';
  }
>;

export function LayoutContainer({
  children,
  className,
  width = 'default',
  ...props
}: LayoutContainerProps) {
  return (
    <div
      {...props}
      className={clsx('ds-layout-container ds-container', className)}
      data-width={width === 'wide' ? 'wide' : undefined}
    >
      {children}
    </div>
  );
}

export default LayoutContainer;
