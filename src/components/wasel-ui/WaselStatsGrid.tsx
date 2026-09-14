import type { ReactNode } from 'react';
import { WaselStatCard } from './WaselStatCard';
import { C, SPACE } from '@/utils/wasel-ds';

interface WaselStatsGridProps {
  stats: Array<{
    value: string | number;
    label: string;
    accent?: string;
    icon?: ReactNode;
    sublabel?: string;
  }>;
  accent?: string;
  title?: string;
}

export function WaselStatsGrid ({
  stats,
  accent = C.cyan,
  title,
}: WaselStatsGridProps) {
  return (
    <div style={{ width: '100%' }}>
      {title ? (
        <div style={{ marginBottom: SPACE[4], fontSize: '0.875rem', fontWeight: 700, color: C.textSub }}>
          {title}
        </div>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: SPACE[4],
          width: '100%',
        }}
      >
        {stats.map((stat, index) => (
          <WaselStatCard
            key={`${stat.label}-${index}`}
            value={stat.value}
            label={stat.label}
            accent={stat.accent ?? accent}
            icon={stat.icon}
            sublabel={stat.sublabel}
          />
        ))}
      </div>
    </div>
  );
}
