import clsx from 'clsx';
import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';

type SectionWrapperProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    description?: string;
    eyebrow?: ReactNode;
    title?: string;
  }
>;

export function SectionWrapper({
  children,
  className,
  description,
  eyebrow,
  title,
  ...props
}: SectionWrapperProps) {
  return (
    <section {...props} className={clsx('ds-section-wrapper', className)}>
      {title || description || eyebrow ? (
        <div className="ds-section-wrapper__header">
          {eyebrow ? <div className="ds-eyebrow">{eyebrow}</div> : null}
          {title ? <h2 className="ds-section-title">{title}</h2> : null}
          {description ? <p className="ds-copy ds-copy--tight">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default SectionWrapper;
