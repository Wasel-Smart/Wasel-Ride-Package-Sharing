import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { ANIM, C, F, FA, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

interface PageShellProps {
  children: ReactNode;
  maxWidth?: number;
  padded?: boolean;
  style?: CSSProperties;
  dir?: 'ltr' | 'rtl';
}

interface PageHeroProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  accent?: string;
  actions?: ReactNode;
  aside?: ReactNode;
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  contentPadding?: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string;
  icon?: ReactNode;
}

interface ActionTileProps {
  label: string;
  detail?: string;
  icon?: ReactNode;
  accent?: string;
  onClick?: () => void;
}

interface DataRowProps {
  label: string;
  value?: string;
  sub?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export function PageShell({
  children,
  maxWidth = 1120,
  padded = true,
  style,
  dir = 'ltr',
}: PageShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 14% 12%, rgba(88,221,255,0.12), transparent 24%),
          radial-gradient(circle at 76% 20%, rgba(255,190,92,0.08), transparent 18%),
          radial-gradient(circle at 66% 84%, rgba(71,214,158,0.06), transparent 20%),
          ${C.bg}
        `,
        color: C.text,
        fontFamily: dir === 'rtl' ? FA : F,
        direction: dir,
        position: 'relative',
        paddingBottom: 96,
        overflowX: 'hidden',
        ...style,
      }}
    >
      <style>{`
        :root { color-scheme: dark; }
        .wasel-container {
          width: 100%;
          padding-inline: clamp(14px, 4vw, 32px) !important;
        }
        .wasel-page-hero {
          grid-template-columns: var(--wasel-hero-columns, 1fr) !important;
          padding: clamp(20px, 5vw, 32px) clamp(18px, 5vw, 28px) !important;
          border-radius: clamp(22px, 5vw, 32px) !important;
        }
        .wasel-page-hero h1 {
          font-size: clamp(1.85rem, 7vw, 3rem) !important;
          line-height: 1.08 !important;
          letter-spacing: 0 !important;
          text-wrap: balance;
        }
        .wasel-page-hero p {
          font-size: clamp(0.95rem, 2.5vw, 1rem) !important;
          line-height: 1.68 !important;
        }
        .wasel-page-actions {
          gap: 12px !important;
        }
        .wasel-page-actions > button,
        .wasel-page-actions > a {
          min-height: 48px !important;
        }
        .wasel-section-card,
        .wasel-metric-card,
        .wasel-action-tile {
          min-width: 0;
        }
        .wasel-section-card {
          border-radius: 22px !important;
        }
        .wasel-action-tile {
          min-height: 176px;
        }
        .wasel-data-row {
          min-height: 58px;
        }
        @media (min-width: 981px) {
          .wasel-page-hero[data-has-aside='true'] {
            --wasel-hero-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
          }
        }
        @media (max-width: 980px) {
          .wasel-page-hero {
            grid-template-columns: 1fr !important;
          }
          .wasel-page-hero-aside {
            padding: 18px !important;
          }
        }
        @media (max-width: 640px) {
          .wasel-container {
            padding-inline: 14px !important;
          }
          .wasel-page-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }
          .wasel-page-actions > * {
            width: 100% !important;
            justify-content: center !important;
          }
          .wasel-section-heading {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .wasel-section-heading h2,
          .wasel-section-heading span {
            overflow-wrap: anywhere;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(circle at center, black 0%, black 48%, transparent 84%)',
          opacity: 0.08,
        }}
      />
      <div
        className="wasel-container"
        style={{
          position: 'relative',
          maxWidth,
          margin: '0 auto',
          paddingTop: padded ? SPACE[8] : 0,
          paddingBottom: padded ? SPACE[8] : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHero({
  icon,
  eyebrow,
  title,
  description,
  accent = C.cyan,
  actions,
  aside,
}: PageHeroProps) {
  return (
    <div
      className="wasel-page-hero"
      data-has-aside={aside ? 'true' : 'false'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: aside ? 'minmax(0, 1.12fr) minmax(320px, 0.88fr)' : '1fr',
        gap: SPACE[6],
        padding: `${SPACE[8]} ${SPACE[7]}`,
        borderRadius: R['3xl'],
        background: `
          radial-gradient(circle at top left, ${accent}16, transparent 32%),
          linear-gradient(145deg, rgba(16,37,58,0.96) 0%, rgba(11,29,45,0.94) 62%, rgba(4,11,18,0.96) 100%)
        `,
        border: `1px solid ${C.border}`,
        boxShadow: SH.lg,
        marginBottom: SPACE[6],
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(255,255,255,0.04), transparent 30%, transparent 70%, rgba(255,255,255,0.02))',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', minWidth: 0 }}>
        {eyebrow ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: R.full,
              background: `${accent}12`,
              border: `1px solid ${accent}24`,
              color: accent,
              fontSize: TYPE.size.xs,
              fontWeight: TYPE.weight.bold,
              textTransform: 'uppercase',
              letterSpacing: TYPE.letterSpacing.wider,
              marginBottom: SPACE[4],
            }}
          >
            {icon}
            {eyebrow}
          </div>
        ) : null}
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            lineHeight: TYPE.lineHeight.tight,
            letterSpacing: TYPE.letterSpacing.normal,
            fontWeight: TYPE.weight.ultra,
            color: '#FFFFFF',
            maxWidth: 760,
          }}
        >
          {title}
        </h1>
        {description ? (
          <p
            style={{
              margin: `${SPACE[4]} 0 0`,
              maxWidth: 760,
              color: C.textMuted,
              fontSize: TYPE.size.md,
              lineHeight: TYPE.lineHeight.loose,
            }}
          >
            {description}
          </p>
        ) : null}
        {actions ? (
          <div
            className="wasel-page-actions"
            style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE[3], marginTop: SPACE[5] }}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {aside ? (
        <div
          className="wasel-page-hero-aside"
          style={{
            position: 'relative',
            minWidth: 0,
            borderRadius: R.xxl,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
            border: `1px solid ${C.border}`,
            boxShadow: SH.md,
            padding: SPACE[5],
            alignSelf: 'stretch',
          }}
        >
          {aside}
        </div>
      ) : null}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  icon,
  children,
  action,
  contentPadding = SPACE[5],
}: SectionCardProps) {
  return (
    <section className="wasel-section-card-shell" style={{ marginBottom: SPACE[6] }}>
      <div
        className="wasel-section-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACE[4],
          marginBottom: SPACE[3],
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACE[2],
              color: C.text,
              fontSize: TYPE.size.lg,
              fontWeight: TYPE.weight.black,
              letterSpacing: TYPE.letterSpacing.tight,
            }}
          >
            {icon}
            <span>{title}</span>
          </div>
          {subtitle ? (
            <p
              style={{
                margin: '6px 0 0',
                color: C.textMuted,
                fontSize: TYPE.size.sm,
                lineHeight: TYPE.lineHeight.relaxed,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div
        className="wasel-section-card"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(88,221,255,0.05), transparent 28%), linear-gradient(145deg, rgba(16,37,58,0.92) 0%, rgba(11,29,45,0.94) 100%)',
          border: `1px solid ${C.border}`,
          borderRadius: R.xxl,
          boxShadow: SH.md,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: contentPadding }}>{children}</div>
      </div>
    </section>
  );
}

export function MetricCard({ label, value, detail, accent = C.cyan, icon }: MetricCardProps) {
  return (
    <div
      className="wasel-card wasel-metric-card"
      style={{
        minWidth: 0,
        padding: `${SPACE[5]} ${SPACE[4]}`,
        borderColor: `${accent}24`,
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: R.xxl,
        background: `radial-gradient(circle at top left, ${accent}10, transparent 30%), linear-gradient(145deg, rgba(16,37,58,0.92) 0%, rgba(11,29,45,0.94) 100%)`,
        boxShadow: SH.md,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACE[3],
          marginBottom: SPACE[3],
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: R.lg,
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}28`,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: TYPE.size.xs,
            fontWeight: TYPE.weight.bold,
            letterSpacing: TYPE.letterSpacing.wide,
            textTransform: 'uppercase',
            color: C.textMuted,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          color: '#FFFFFF',
          fontSize: TYPE.size['3xl'],
          fontWeight: TYPE.weight.ultra,
          lineHeight: TYPE.lineHeight.tight,
        }}
      >
        {value}
      </div>
      {detail ? (
        <div
          style={{
            marginTop: SPACE[2],
            color: C.textMuted,
            fontSize: TYPE.size.sm,
            lineHeight: TYPE.lineHeight.relaxed,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function ActionTile({ label, detail, icon, accent = C.cyan, onClick }: ActionTileProps) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      className="wasel-action-tile"
      onClick={onClick}
      disabled={!clickable}
      style={{
        width: '100%',
        padding: `${SPACE[5]} ${SPACE[4]}`,
        borderRadius: R.xxl,
        border: `1px solid ${accent}1f`,
        background: `linear-gradient(145deg, rgba(16,37,58,0.9) 0%, rgba(11,29,45,0.94) 100%)`,
        color: C.text,
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'left',
        transition: `transform ${ANIM.dur.normal} ${ANIM.ease.default}, border-color ${ANIM.dur.normal} ${ANIM.ease.default}, box-shadow ${ANIM.dur.normal} ${ANIM.ease.default}`,
        boxShadow: SH.md,
      }}
      onMouseEnter={event => {
        if (!clickable) return;
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.borderColor = `${accent}36`;
        event.currentTarget.style.boxShadow = SH.lg;
      }}
      onMouseLeave={event => {
        event.currentTarget.style.transform = '';
        event.currentTarget.style.borderColor = `${accent}1f`;
        event.currentTarget.style.boxShadow = SH.md;
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACE[3],
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: R.lg,
            color: accent,
            background: `${accent}14`,
            border: `1px solid ${accent}24`,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <ChevronRight size={16} color={C.textDim} />
      </div>
      <div
        style={{
          marginTop: SPACE[4],
          fontSize: TYPE.size.base,
          fontWeight: TYPE.weight.bold,
          color: '#FFFFFF',
        }}
      >
        {label}
      </div>
      {detail ? (
        <div
          style={{
            marginTop: SPACE[2],
            fontSize: TYPE.size.sm,
            lineHeight: TYPE.lineHeight.relaxed,
            color: C.textMuted,
          }}
        >
          {detail}
        </div>
      ) : null}
    </button>
  );
}

export function DataRow({ label, value, sub, icon, badge, onClick, danger = false }: DataRowProps) {
  const accent = danger ? C.error : C.cyan;
  return (
    <button
      type="button"
      className="wasel-data-row"
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: SPACE[3],
        padding: `${SPACE[4]} ${SPACE[4]}`,
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${C.borderFaint}`,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        transition: `background ${ANIM.dur.normal} ${ANIM.ease.default}`,
      }}
      onMouseEnter={event => {
        if (onClick) event.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={event => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      {icon ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: R.md,
            background: `${accent}14`,
            border: `1px solid ${accent}22`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: danger ? C.error : '#FFFFFF',
            fontSize: TYPE.size.base,
            fontWeight: TYPE.weight.semibold,
          }}
        >
          {label}
        </div>
        {value ? (
          <div style={{ marginTop: 3, color: C.textMuted, fontSize: TYPE.size.sm }}>{value}</div>
        ) : null}
        {sub ? (
          <div
            style={{
              marginTop: 4,
              color: C.textDim,
              fontSize: TYPE.size.xs,
              lineHeight: TYPE.lineHeight.relaxed,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
      {badge}
      {onClick ? <ChevronRight size={16} color={C.textDim} style={{ flexShrink: 0 }} /> : null}
    </button>
  );
}

export function StatusBadge({ label, accent = C.cyan }: { label: string; accent?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: R.full,
        background: `${accent}12`,
        border: `1px solid ${accent}24`,
        color: accent,
        fontSize: TYPE.size.xs,
        fontWeight: TYPE.weight.bold,
        letterSpacing: TYPE.letterSpacing.normal,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export function iconNode(Icon: LucideIcon, color: string) {
  return <Icon size={18} color={color} />;
}
