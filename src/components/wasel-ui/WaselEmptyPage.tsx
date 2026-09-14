import type { CSSProperties, ReactNode } from 'react';
import { PageShell, PageHero } from './WaselPagePrimitives';
import { WaselEmptyState } from './WaselEmptyState';
import { C, SPACE, R, TYPE } from '@/utils/wasel-ds';

interface WaselEmptyPageProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  accent?: string;
  maxWidth?: number;
  style?: CSSProperties;
}

export function WaselEmptyPage ({
  icon,
  title,
  description,
  action,
  accent = C.cyan,
  maxWidth = 1120,
  style,
}: WaselEmptyPageProps) {
  return (
    <PageShell maxWidth={maxWidth} style={style}>
      <WaselEmptyState
        icon={icon}
        title={title}
        description={description}
        action={action}
        accent={accent}
      />
    </PageShell>
  );
}
