import { type CSSProperties, type ReactNode } from 'react';
import { DesignSystem, backdrop, panel, glassPanel, button } from './designSystem';

interface PageShellProps {
  children: ReactNode;
  maxWidth?: number;
  padding?: string;
}

export function PageShell({ children, maxWidth = 1380, padding = '28px 20px 84px' }: PageShellProps) {
  return (
    <div style={{ ...backdrop }}>
      {/* Aurora gradient layers matching landing */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 14% 10%, rgba(71,183,230,0.18), rgba(4,18,30,0) 24%), radial-gradient(circle at 88% 14%, rgba(168,214,20,0.12), rgba(4,18,30,0) 18%)',
          pointerEvents: 'none',
          opacity: 0.96,
        }}
      />
      <div style={{ maxWidth, margin: '0 auto', padding, position: 'relative', display: 'grid', gap: 18 }}>
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  formulas?: string[];
}

export function PageHeader({ badge, title, description, actions, formulas }: PageHeaderProps) {
  return (
    <section style={{
      ...panel(34),
      padding: 26,
      background: 'radial-gradient(circle at 18% 18%, rgba(71,183,230,0.18), rgba(4,18,30,0) 32%), radial-gradient(circle at 82% 26%, rgba(168,214,20,0.12), rgba(4,18,30,0) 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 840, display: 'grid', gap: 12 }}>
          {badge && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
              padding: '8px 12px',
              borderRadius: 999,
              background: `${DesignSystem.colors.accent.base}18`,
              border: `1px solid ${DesignSystem.colors.accent.border}`,
              color: DesignSystem.colors.accent.base,
              fontSize: DesignSystem.typography.fontSize.xs,
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {badge}
            </div>
          )}
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(2.2rem, 4vw, 4rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.04em',
            fontWeight: DesignSystem.typography.fontWeight.black,
          }}>
            {title}
          </h1>
          <p style={{
            margin: 0,
            color: DesignSystem.colors.text.secondary,
            lineHeight: 1.75,
            fontSize: '1.02rem',
            maxWidth: 760,
          }}>
            {description}
          </p>
          {formulas && formulas.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {formulas.map((formula) => (
                <div key={formula} style={{
                  padding: '10px 14px',
                  borderRadius: 16,
                  border: `1px solid ${DesignSystem.colors.border.base}`,
                  background: 'rgba(255,255,255,0.04)',
                  fontFamily: DesignSystem.typography.fontFamily.mono,
                  fontSize: DesignSystem.typography.fontSize.sm,
                }}>
                  {formula}
                </div>
              ))}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  accent: string;
}

export function StatCard({ label, value, detail, accent }: StatCardProps) {
  return (
    <div style={{
      ...panel(22),
      padding: 18,
      border: `1px solid ${accent}30`,
      boxShadow: `0 18px 42px ${accent}18`,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))',
    }}>
      <div style={{
        fontSize: DesignSystem.typography.fontSize.xs,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: DesignSystem.colors.text.muted,
      }}>
        {label}
      </div>
      <div style={{
        marginTop: 12,
        fontSize: DesignSystem.typography.fontSize['3xl'],
        lineHeight: 1,
        fontWeight: DesignSystem.typography.fontWeight.black,
        color: accent,
      }}>
        {value}
      </div>
      <div style={{
        marginTop: 10,
        color: DesignSystem.colors.text.secondary,
        lineHeight: 1.5,
        fontSize: DesignSystem.typography.fontSize.base,
      }}>
        {detail}
      </div>
    </div>
  );
}

interface DataPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  accent?: string;
}

export function DataPanel({ title, icon, children, accent = DesignSystem.colors.cyan.base }: DataPanelProps) {
  return (
    <div style={{ ...panel(24), padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: DesignSystem.typography.fontSize.lg, fontWeight: DesignSystem.typography.fontWeight.bold }}>
          {title}
        </h3>
      </div>
      <div style={{ marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: number;
  color: string;
}

export function MetricRow({ label, value, color }: MetricRowProps) {
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: DesignSystem.typography.fontSize.xs,
        color: DesignSystem.colors.text.muted,
      }}>
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div style={{
        marginTop: 6,
        height: 6,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: `${value * 100}%`,
          height: '100%',
          borderRadius: 999,
          background: color,
        }} />
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
}

export function ActionButton({ label, onClick, variant = 'primary', icon, disabled }: ActionButtonProps) {
  const styles = variant === 'primary' ? button.primary : variant === 'outline' ? button.outline : button.ghost;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  body: string;
  accent: string;
}

export function InfoCard({ icon, title, value, body, accent }: InfoCardProps) {
  return (
    <article style={{ ...panel(22), padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: `${accent}18`,
          border: `1px solid ${accent}28`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: DesignSystem.typography.fontSize.xl,
          fontWeight: DesignSystem.typography.fontWeight.black,
          color: accent,
        }}>
          {value}
        </div>
      </div>
      <h3 style={{
        margin: '14px 0 8px',
        fontSize: DesignSystem.typography.fontSize.lg,
        fontWeight: DesignSystem.typography.fontWeight.bold,
      }}>
        {title}
      </h3>
      <p style={{
        margin: 0,
        color: DesignSystem.colors.text.secondary,
        lineHeight: 1.62,
        fontSize: DesignSystem.typography.fontSize.base,
      }}>
        {body}
      </p>
    </article>
  );
}

interface GlassCardProps {
  children: ReactNode;
  padding?: number;
  borderRadius?: number;
}

export function GlassCard({ children, padding = 20, borderRadius = 20 }: GlassCardProps) {
  return (
    <div style={{ ...glassPanel(borderRadius), padding }}>
      {children}
    </div>
  );
}
