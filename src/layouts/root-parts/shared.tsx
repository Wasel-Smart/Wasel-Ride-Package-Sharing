import type { CSSProperties } from 'react';
import { type LucideIcon } from 'lucide-react';
import { C, F, R } from '../../utils/wasel-ds';

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

interface SocialLink {
  label: string;
  href: string;
  Icon: LucideIcon;
}

export const WASEL_SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/Wasel14',
    Icon: FacebookIcon as unknown as LucideIcon,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/wasel.ride/',
    Icon: InstagramIcon as unknown as LucideIcon,
  },
];

export function getDrawerSectionLabel(groupId: string, ar: boolean) {
  if (groupId === 'profile' || groupId === 'my-trips') {
    return ar ? 'الحساب' : 'Account';
  }

  if (groupId === 'mobility-os') {
    return ar ? 'العمليات' : 'Operations';
  }

  return ar ? 'الخدمات الأساسية' : 'Core services';
}

export function Badge({ label, color = C.cyan }: { label: string; color?: string }) {
  const map: Record<string, string> = {
    LIVE: C.cyan,
    RAJE3: C.gold,
    AI: C.blue,
    VIP: C.gold,
    'Fixed Price': C.green,
    QA: C.purple,
    TRUST: C.green,
  };
  const col = map[label] || color;

  return (
    <span
      style={{
        fontSize: '0.52rem',
        fontWeight: 800,
        letterSpacing: '0.08em',
        padding: '2px 6px',
        borderRadius: R.full,
        background: `${col}18`,
        color: col,
        border: `1px solid ${col}30`,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

export function AppPill({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 30,
        padding: '0 12px',
        borderRadius: R.full,
        background: C.cyanDim,
        border: `1px solid ${C.border}`,
        color: C.textSub,
        fontSize: '0.72rem',
        fontWeight: 700,
        fontFamily: F,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: C.gold,
          boxShadow: `0 0 10px ${C.gold}`,
        }}
      />
      {ar ? 'واصل لتنقل أبسط' : 'Wasel for simpler movement'}
    </div>
  );
}

export function SocialLinks({
  ar,
  variant = 'header',
}: {
  ar: boolean;
  variant?: 'header' | 'drawer';
}) {
  const drawer = variant === 'drawer';
  const size = drawer ? 40 : 34;

  const wrapperStyle: CSSProperties = drawer
    ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
        marginBottom: 12,
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      };

  return (
    <div aria-label={ar ? 'روابط واصل الاجتماعية' : 'Wasel social links'} style={wrapperStyle}>
      {WASEL_SOCIAL_LINKS.map(({ label, href, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label}: Wasel`}
          title={`${label}: Wasel`}
          style={{
            width: drawer ? '100%' : size,
            height: size,
            borderRadius: R.md,
            background: C.card,
            border: `1px solid ${C.border}`,
            color: C.textSub,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.14s ease',
          }}
        >
          <Icon size={drawer ? 18 : 16} strokeWidth={2.1} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
