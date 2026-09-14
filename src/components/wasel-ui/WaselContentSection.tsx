import type { ReactNode } from 'react';
import { PageShell, SectionCard } from './WaselPagePrimitives';
import { C, SPACE } from '@/utils/wasel-ds';

interface WaselContentSectionProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  maxWidth?: number;
}

export function WaselContentSection ({
  icon,
  title,
  subtitle,
  children,
  action,
  maxWidth = 1120,
}: WaselContentSectionProps) {
  return (
    <PageShell maxWidth={maxWidth}>
      <SectionCard
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={action}
      >
        {children}
      </SectionCard>
    </PageShell>
  );
}
