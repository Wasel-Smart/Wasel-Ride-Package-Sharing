import type { ReactNode } from 'react';
import { Button, Card } from '../../design-system/components';

interface AsyncStateProps {
  children?: ReactNode;
  description?: string;
  isEmpty?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
  title?: string;
}

export function AsyncState({
  children,
  description,
  isEmpty = false,
  isError = false,
  isLoading = false,
  onRetry,
  title,
}: AsyncStateProps) {
  if (isLoading) {
    return (
      <Card className="ds-async-state" aria-busy="true">
        <div className="ds-skeleton ds-skeleton--title" />
        <div className="ds-skeleton ds-skeleton--body" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="ds-async-state" role="alert">
        <h2 className="ds-subsection-title">{title ?? 'Unable to load data'}</h2>
        {description ? <p className="ds-copy ds-copy--tight">{description}</p> : null}
        {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="ds-async-state">
        <h2 className="ds-subsection-title">{title ?? 'Nothing here yet'}</h2>
        {description ? <p className="ds-copy ds-copy--tight">{description}</p> : null}
      </Card>
    );
  }

  return <>{children}</>;
}
