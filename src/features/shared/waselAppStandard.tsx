/**
 * Wasel App Design Standard — v3
 *
 * Single source of truth for layout, spacing, focus rings, responsive
 * breakpoints, stat strips, tab switchers, sidebar caps, empty states,
 * and skeleton placeholders.
 *
 * v3 changes:
 *  - Full fluid typography via clamp()
 *  - Container-query-aware grid helpers
 *  - Glass morphism card variants
 *  - Micro-interaction hover/active states
 *  - Improved mobile-first stat strip
 *  - RTL-safe spacing
 *  - Safe-area inset support
 */

import { type CSSProperties, type ReactNode } from 'react';
import { C,  R, SH, GRAD_GREEN, GRAD_GOLD  } from '../../utils/wasel-ds';

// ─── Re-export DS tokens used everywhere ────────────────────────────────────
export { C, R, SH };

// ─── Brand gradient aliases ──────────────────────────────────────────────────
export const GRAD = {
  green: GRAD_GREEN,
  gold: GRAD_GOLD,
  cyan: 'linear-gradient(135deg, #00E5FF 0%, #38BEFF 52%, #32D8A6 100%)',
  navy: 'linear-gradient(145deg, #081D39 0%, #0a1f3a 56%, #050B12 100%)',
};

// ─── Spacing scale (8-base) ──────────────────────────────────────────────────
export const SP = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
} as const;

// ─── Global CSS injected once by PageShell ────────────────────────────────────
export const WASEL_GLOBAL_CSS = `
  /* ── Focus rings — all interactive elements ─────────────────────────── */
  .w2-field:focus-visible,
  .w2-btn:focus-visible,
  .pkg-field:focus-visible,
  .pkg-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0,229,255,0.30);
  }
  .w2-btn-gold:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255,190,92,0.30);
  }

  /* ── Fluid page container ────────────────────────────────────────────── */
  .w2-page {
    width: 100%;
    max-width: 1080px;
    margin-inline: auto;
    padding-inline: clamp(14px, 4vw, 32px);
    padding-block: clamp(16px, 3vw, 28px);
    box-sizing: border-box;
  }

  /* ── Responsive grid helpers ─────────────────────────────────────────── */
  .w2-2col {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: clamp(14px, 2vw, 24px);
    align-items: start;
  }
  .w2-3col {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(12px, 2vw, 20px);
  }
  .w2-4col {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(10px, 1.5vw, 16px);
  }
  .w2-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(12px, 2vw, 16px);
    align-content: start;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  .w2-sidebar {
    display: grid;
    gap: clamp(12px, 1.5vw, 16px);
    align-content: start;
    max-height: 720px;
    overflow-y: auto;
    padding-inline-end: 2px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,229,255,0.18) transparent;
  }
  .w2-sidebar::-webkit-scrollbar { width: 3px; }
  .w2-sidebar::-webkit-scrollbar-thumb {
    background: rgba(0,229,255,0.18);
    border-radius: 3px;
  }

  /* ── Breakpoint: tablet (≤ 899px) ───────────────────────────────────── */
  @media (max-width: 899px) {
    .w2-2col  { grid-template-columns: 1fr !important; }
    .w2-3col  { grid-template-columns: 1fr 1fr !important; }
    .w2-4col  { grid-template-columns: 1fr 1fr !important; }
    .w2-sidebar {
      max-height: none !important;
      overflow-y: visible !important;
    }
    .sp-2col  { grid-template-columns: 1fr !important; }
    .sp-3col  { grid-template-columns: 1fr !important; }
  }

  /* ── Breakpoint: mobile (≤ 640px) ───────────────────────────────────── */
  @media (max-width: 640px) {
    .w2-3col      { grid-template-columns: 1fr !important; }
    .w2-4col      { grid-template-columns: 1fr 1fr !important; }
    .w2-form-grid { grid-template-columns: 1fr !important; }
    .pkg-form-grid { grid-template-columns: 1fr !important; }
    .w2-tab-bar   { gap: 4px !important; }
    .w2-tab-btn   { font-size: 0.78rem !important; padding-inline: 8px !important; }
    .sp-4col      { grid-template-columns: 1fr 1fr !important; }
    .sp-search-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
  }

  /* ── Breakpoint: small mobile (≤ 480px) ─────────────────────────────── */
  @media (max-width: 480px) {
    .w2-4col      { grid-template-columns: 1fr 1fr !important; }
    .sp-4col      { grid-template-columns: 1fr 1fr !important; }
    .w2-tab-btn   { font-size: 0.74rem !important; }
  }

  /* ── Skeleton pulse ──────────────────────────────────────────────────── */
  @keyframes w2-pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.28; }
  }
  .w2-skeleton { animation: w2-pulse 1.6s ease-in-out infinite; }

  @keyframes pkg-pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
  .pkg-stat-dash { animation: pkg-pulse 1.6s ease-in-out infinite; }

  /* ── Card hover lift ─────────────────────────────────────────────────── */
  .w2-card-hover {
    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                box-shadow 0.18s ease,
                border-color 0.18s ease;
    will-change: transform;
  }
  .w2-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px rgba(8,29,57,0.42);
  }
  @media (hover: none) {
    .w2-card-hover:hover { transform: none; }
  }

  /* ── Tab active underline dot ────────────────────────────────────────── */
  .w2-tab-active::after {
    content: '';
    display: block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    margin: 3px auto 0;
  }

  /* ── Glass card ──────────────────────────────────────────────────────── */
  .w2-glass {
    background: rgba(14,34,64,0.72);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid rgba(0,229,255,0.12);
  }

  /* ── Gradient border card ────────────────────────────────────────────── */
  .w2-grad-border {
    position: relative;
    border-radius: 20px;
  }
  .w2-grad-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg,
      rgba(0,229,255,0.30),
      rgba(114,199,13,0.14),
      rgba(0,229,255,0.06));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /* ── Section head responsive ─────────────────────────────────────────── */
  @media (max-width: 640px) {
    .sp-head-inner {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }
    .sp-head-btn {
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
    }
  }

  /* ── Misc responsive helpers ─────────────────────────────────────────── */
  @media (max-width: 899px) {
    .sp-inner { padding: 16px !important; }
    .sp-brand-row {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 10px !important;
    }
    .sp-head { padding: 20px 16px !important; border-radius: 16px !important; }
    .sp-sort-bar {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      padding-bottom: 6px !important;
      flex-wrap: nowrap !important;
      scrollbar-width: none !important;
    }
    .sp-sort-bar::-webkit-scrollbar { display: none; }
    .sp-sort-btn { flex-shrink: 0 !important; white-space: nowrap !important; }
    .sp-results-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }
    .sp-book-btn { min-height: 44px !important; }
    .sp-ride-card-body { padding: 16px !important; }
    .sp-summary-grid { grid-template-columns: 1fr !important; }
    .sp-bus-card-grid { grid-template-columns: 1fr !important; }
    .sp-modal-metrics { grid-template-columns: 1fr !important; }
    .sp-modal-price { flex-direction: column !important; align-items: flex-start !important; }
    .sp-empty-actions { grid-template-columns: 1fr !important; }
    .sp-side-column { position: static !important; }
  }
  @media (max-width: 480px) {
    .sp-4col { grid-template-columns: 1fr 1fr !important; }
    .sp-modal-route { flex-direction: column !important; align-items: flex-start !important; }
    .sp-modal-route > div { width: 100%; text-align: left !important; }
    .sp-inner { padding: 12px !important; }
  }

  /* ── Smooth scroll for sidebar ───────────────────────────────────────── */
  .w2-sidebar { scroll-behavior: smooth; }

  /* ── Touch-action for scrollable areas ──────────────────────────────── */
  .w2-sidebar, .sp-sort-bar {
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
  }
`;

// ─── Shared field / label styles ─────────────────────────────────────────────
export const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: R.md,
  border: `1px solid ${'var(--border)'}`,
  background: 'var(--muted)',
  color: 'var(--foreground)',
  fontFamily: "'Plus Jakarta Sans','Cairo','Tajawal','Inter',sans-serif",
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export const labelStyle: CSSProperties = {
  display: 'block',
  color: 'var(--muted-foreground)',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6,
};

// ─── StatStrip ───────────────────────────────────────────────────────────────
export type StatItem = {
  value: string | number | null;
  label: string;
  color?: string;
};

export function StatStrip({ stats, cols = 4 }: { stats: StatItem[]; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 2 ? 'w2-2col' : cols === 3 ? 'w2-3col' : 'w2-4col';
  return (
    <div
      className={colClass}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: SP[3],
        marginBottom: SP[6],
      }}
    >
      {stats.map(s => (
        <div
          key={s.label}
          className="w2-card-hover"
          style={{
            background: 'var(--card)',
            borderRadius: R.xl,
            border: `1px solid ${'var(--border)'}`,
            padding: `${SP[4]}px ${SP[5]}px`,
            boxShadow: SH.sm,
          }}
        >
          <div
            style={{
              color: s.color ?? C.brandBlue,
              fontWeight: 900,
              fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
              marginBottom: SP[1],
            }}
          >
            {s.value === null ? (
              <span
                className="w2-skeleton"
                style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}
              >
                —
              </span>
            ) : (
              s.value
            )}
          </div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem', fontWeight: 600 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TabBar ──────────────────────────────────────────────────────────────────
export type TabItem<T extends string> = { key: T; en: string; ar: string };

export function TabBar<T extends string>({
  tabs,
  active,
  ar,
  onChange,
  accentGrad = GRAD.green,
}: {
  tabs: TabItem<T>[];
  active: T;
  ar: boolean;
  onChange: (key: T) => void;
  accentGrad?: string;
}) {
  return (
    <div
      className="w2-tab-bar"
      style={{
        display: 'flex',
        gap: SP[2] - 2,
        background: 'var(--muted)',
        borderRadius: R.xl,
        padding: 5,
        border: `1px solid ${'var(--border)'}`,
        marginBottom: SP[5],
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`w2-btn w2-tab-btn${isActive ? ' w2-tab-active' : ''}`}
            style={{
              flex: 1,
              height: 42,
              borderRadius: R.lg,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans','Cairo','Tajawal','Inter',sans-serif",
              fontWeight: isActive ? 800 : 600,
              fontSize: '0.85rem',
              background: isActive ? accentGrad : 'transparent',
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
              transition: 'all 0.18s',
              position: 'relative',
            }}
          >
            {ar ? tab.ar : tab.en}
          </button>
        );
      })}
    </div>
  );
}

// ─── PanelCard ───────────────────────────────────────────────────────────────
export function PanelCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: R.xxl,
        padding: `${SP[7]}px ${SP[6]}px`,
        border: `1px solid ${'var(--border)'}`,
        boxShadow: SH.card,
        marginBottom: SP[6],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── SidebarCard ─────────────────────────────────────────────────────────────
export function SidebarCard({
  title,
  children,
  accent,
  icon,
}: {
  title: string;
  children: ReactNode;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--muted)',
        borderRadius: R.xl,
        padding: SP[5] - 2,
        border: `1px solid ${'var(--border)'}`,
      }}
    >
      {(title || icon) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SP[2],
            marginBottom: SP[3],
          }}
        >
          {icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: R.md,
                background: `${accent ?? C.brandBlue}14`,
                border: `1px solid ${accent ?? C.brandBlue}28`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div
            style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: '0.9rem' }}
          >
            {title}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── TwoColLayout ────────────────────────────────────────────────────────────
export function TwoColLayout({
  main,
  sidebar,
  ratio = '1.35fr 1fr',
}: {
  main: ReactNode;
  sidebar: ReactNode;
  ratio?: string;
}) {
  return (
    <div
      className="w2-2col"
      style={{
        display: 'grid',
        gridTemplateColumns: ratio,
        gap: SP[6],
        alignItems: 'start',
      }}
    >
      <div>{main}</div>
      <div className="w2-sidebar">
        {sidebar}
      </div>
    </div>
  );
}

// ─── FormGrid ────────────────────────────────────────────────────────────────
export function FormGrid({ children, gap = SP[4] }: { children: ReactNode; gap?: number }) {
  return (
    <div
      className="w2-form-grid"
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: '1fr 1fr',
        alignContent: 'start',
      }}
    >
      {children}
    </div>
  );
}

// ─── FullWidth (span both form columns) ──────────────────────────────────────
export function FullWidth({ children }: { children: ReactNode }) {
  return <div style={{ gridColumn: '1/-1' }}>{children}</div>;
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  body,
  accent = C.brandBlue,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: `${SP[8]}px ${SP[6]}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: SP[3],
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: R.xl,
          background: `${accent}10`,
          border: `1px solid ${accent}20`,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: '1rem' }}>{title}</div>
      <div
        style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.82rem',
          lineHeight: 1.6,
          maxWidth: 300,
        }}
      >
        {body}
      </div>
    </div>
  );
}

// ─── SkeletonDash ─────────────────────────────────────────────────────────────
export function SkeletonDash() {
  return (
    <span
      className="w2-skeleton"
      style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}
    >
      —
    </span>
  );
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────────
export function ErrorBanner({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: SP[2],
        alignItems: 'center',
        background: `${C.gold}12`,
        border: `1px solid ${C.gold}30`,
        borderRadius: R.lg,
        padding: `${SP[3]}px ${SP[4] - 2}px`,
        color: 'var(--foreground)',
        fontSize: '0.84rem',
        marginBottom: SP[4],
      }}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}

// ─── StepList ────────────────────────────────────────────────────────────────
export function StepList({
  steps,
  accent = C.gold,
}: {
  steps: { title: string; desc: string }[];
  accent?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: SP[2] + 2 }}>
      {steps.map((step, i) => (
        <div key={step.title} style={{ display: 'flex', gap: SP[3], alignItems: 'flex-start' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: `${accent}18`,
              border: `1px solid ${accent}30`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: accent,
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            {i + 1}
          </div>
          <div>
            <div style={{ color: 'var(--foreground)', fontSize: '0.82rem', fontWeight: 700 }}>
              {step.title}
            </div>
            <div
              style={{ color: 'var(--muted-foreground)', fontSize: '0.74rem', marginTop: 2, lineHeight: 1.5 }}
            >
              {step.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({
  steps,
  current,
  accent = C.brandBlue,
}: {
  steps: number;
  current: number;
  accent?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: SP[2] - 2, marginBottom: SP[5] }}>
      {Array.from({ length: steps }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 999,
            background: i < current ? accent : 'var(--secondary)',
            border: `1px solid ${i < current ? accent : 'var(--border)'}`,
            transition: 'background 0.25s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Pill ────────────────────────────────────────────────────────────────────
export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: R.full,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        fontSize: '0.66rem',
        fontWeight: 700,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// ─── CTAButton ───────────────────────────────────────────────────────────────
export function CTAButton({
  children,
  onClick,
  disabled,
  busy,
  grad = GRAD.green,
  fullWidth = true,
  testId,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  grad?: string;
  fullWidth?: boolean;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      disabled={disabled || busy}
      onClick={onClick}
      className="w2-btn"
      style={{
        width: fullWidth ? '100%' : undefined,
        height: 52,
        borderRadius: R.lg,
        border: 'none',
        background: disabled ? 'var(--muted)' : grad,
        color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
        fontWeight: 800,
        fontFamily: "'Plus Jakarta Sans','Cairo','Tajawal','Inter',sans-serif",
        fontSize: '0.95rem',
        cursor: busy ? 'wait' : disabled ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.75 : 1,
        boxShadow: disabled ? 'none' : `0 4px 20px rgba(255,190,92,0.25)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SP[2],
        transition: 'opacity 0.15s, transform 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── GhostButton ─────────────────────────────────────────────────────────────
export function GhostButton({
  children,
  onClick,
  color = 'var(--muted-foreground)',
}: {
  children: ReactNode;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w2-btn"
      style={{
        padding: '9px 18px',
        borderRadius: R.full,
        border: `1px solid ${'var(--border)'}`,
        background: 'transparent',
        color,
        cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans','Cairo','Tajawal','Inter',sans-serif",
        fontWeight: 600,
        fontSize: '0.82rem',
      }}
    >
      {children}
    </button>
  );
}

// ─── injectWaselStandard — imperative injection for non-PageShell pages ──────
export function injectWaselStandard() {
  if (typeof document === 'undefined') { return; }
  const id = 'wasel-standard-v3';
  if (document.getElementById(id)) { return; }
  const el = document.createElement('style');
  el.id = id;
  el.textContent = WASEL_GLOBAL_CSS;
  document.head.appendChild(el);
}

