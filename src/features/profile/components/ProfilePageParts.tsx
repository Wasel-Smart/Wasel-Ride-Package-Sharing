import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

const CARD = 'rgba(255,255,255,0.04)';
const BORD = 'rgba(255,255,255,0.09)';
const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 14, padding: '16px 18px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color, fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.7)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: FONT }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EFF6FF', fontFamily: FONT, lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  );
}

export interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(148,163,184,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
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
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '14px 18px',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${BORD}`,
        cursor: onClick ? 'pointer' : 'default',
        gap: 12,
        transition: 'background 0.12s',
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (onClick) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {icon && <span style={{ color: danger ? '#EF4444' : 'rgba(148,163,184,0.6)', fontSize: '1rem', flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: danger ? '#EF4444' : '#EFF6FF', fontFamily: FONT }}>
          {label}
        </div>
        {value && <div style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.6)', fontFamily: FONT, marginTop: 2 }}>{value}</div>}
      </div>
      {badge}
      {onClick && <ChevronRight size={14} color="rgba(148,163,184,0.4)" style={{ flexShrink: 0 }} />}
    </button>
  );
}

export function VerificationBadge({ level, ar = false, accent = '#00C8E8' }: { level: string; ar?: boolean; accent?: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    level_0: { label: ar ? 'غير موثق' : 'Unverified', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    level_1: { label: ar ? 'موثق الهاتف' : 'Phone Verified', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    level_2: { label: ar ? 'موثق الهوية' : 'ID Verified', color: accent, bg: 'rgba(0,200,232,0.12)' },
    level_3: { label: ar ? 'موثوق' : 'Trusted', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  };
  const v = map[level] ?? map.level_0;
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999, color: v.color, background: v.bg, fontFamily: FONT, letterSpacing: '0.05em', flexShrink: 0 }}>
      {v.label}
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
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.62)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 900, color, fontFamily: FONT, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.76rem', color: 'rgba(148,163,184,0.75)', lineHeight: 1.5, fontFamily: FONT }}>
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
  return (
    <button
      onClick={onClick}
      style={{
        background: CARD,
        border: `1px solid ${BORD}`,
        borderRadius: 16,
        padding: '16px 18px',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,232,0.28)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = BORD;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <ChevronRight size={14} color="rgba(148,163,184,0.45)" />
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#EFF6FF', fontFamily: FONT, marginTop: 14 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.76rem', color: 'rgba(148,163,184,0.72)', lineHeight: 1.5, fontFamily: FONT, marginTop: 6 }}>
        {detail}
      </div>
    </button>
  );
}
