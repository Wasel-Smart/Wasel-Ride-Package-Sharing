import type { CSSProperties, ReactNode } from 'react';
import { PageShell, PageHero, MetricCard, type MetricCardProps } from './WaselPagePrimitives';
import { C, SPACE, R, TYPE } from '@/utils/wasel-ds';

interface WaselDashboardPageProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  accent?: string;
  actions?: ReactNode;
  metrics: Array<Omit<MetricCardProps, 'icon'>>;
  children: ReactNode;
  maxWidth?: number;
}

export function WaselDashboardPage ({
  icon,
  eyebrow,
  title,
  description,
  accent = C.cyan,
  actions,
  metrics,
  children,
  maxWidth = 1120,
}: WaselDashboardPageProps) {
  return (
    <PageShell maxWidth={maxWidth}>
      <PageHero
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        accent={accent}
        actions={actions}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: SPACE[4],
          marginBottom: SPACE[6],
        }}
      >
        {metrics.map(m => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            detail={m.detail}
            accent={m.accent}
          />
        ))}
      </div>
      {children}
    </PageShell>
  );
}
