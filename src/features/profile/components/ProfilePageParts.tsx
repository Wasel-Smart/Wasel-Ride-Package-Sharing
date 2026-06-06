import type { ReactNode } from 'react';
import {
  ActionTile,
  DataRow,
  MetricCard,
  SectionCard,
  StatusBadge,
} from '../../../components/wasel-ui/WaselPagePrimitives';
import { C, F, R, SH, SPACE, TYPE } from '../../../utils/wasel-ds';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return <MetricCard label={label} value={value} icon={icon} accent={color} />;
}

export interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <SectionCard title={title} contentPadding="0">
      {children}
    </SectionCard>
  );
}

export interface RowProps {
  label: string;
  value?: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  badge?: ReactNode;
}

export function Row({ label, value, icon, onClick, danger, badge }: RowProps) {
  return (
    <DataRow
      label={label}
      value={value}
      icon={icon}
      onClick={onClick}
      danger={danger}
      badge={badge}
    />
  );
}

export function VerificationBadge({
  level,
  ar = false,
  accent = C.cyan,
}: {
  level: string;
  ar?: boolean;
  accent?: string;
}) {
  const map: Record<string, { label: string; color: string }> = {
    level_0: { label: ar ? 'غير موثق' : 'Unverified', color: C.textDim },
    level_1: { label: ar ? 'موثق الهاتف' : 'Phone Verified', color: C.gold },
    level_2: { label: ar ? 'موثق الهوية' : 'ID Verified', color: accent },
    level_3: { label: ar ? 'موثوق' : 'Trusted', color: C.green },
  };
  const value = map[level] ?? map.level_0!;

  return (
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      <StatusBadge label={value.label} accent={value.color} />
    </span>
  );
}

export interface InsightCardProps {
  label: string;
  value: string;
  detail: string;
  color: string;
}

export function InsightCard({ label, value, detail, color }: InsightCardProps) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: `${SPACE[4]} ${SPACE[4]}`,
        borderRadius: R.xxl,
        border: `1px solid ${color}28`,
        background: `radial-gradient(circle at top left, ${color}14, transparent 34%), ${C.card}`,
        boxShadow: SH.card,
      }}
    >
      <div
        style={{
          marginBottom: SPACE[3],
          color: C.textMuted,
          fontFamily: F,
          fontSize: TYPE.size.xs,
          fontWeight: TYPE.weight.bold,
          letterSpacing: TYPE.letterSpacing.wider,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginBottom: 6,
          color,
          fontFamily: F,
          fontSize: TYPE.size['2xl'],
          fontWeight: TYPE.weight.ultra,
          lineHeight: TYPE.lineHeight.tight,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: C.textMuted,
          fontFamily: F,
          fontSize: TYPE.size.sm,
          lineHeight: TYPE.lineHeight.relaxed,
        }}
      >
        {detail}
      </div>
    </div>
  );
}

export interface QuickActionCardProps {
  label: string;
  detail: string;
  icon: ReactNode;
  color: string;
  onClick: () => void;
}

export function QuickActionCard({ label, detail, icon, color, onClick }: QuickActionCardProps) {
  return <ActionTile label={label} detail={detail} icon={icon} accent={color} onClick={onClick} />;
}
