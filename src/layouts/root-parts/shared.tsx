import type { CSSProperties } from 'react';
import { Facebook, Instagram, type LucideIcon } from 'lucide-react';
import { C, F, R } from '../../utils/wasel-ds';

interface SocialLink {
  label: string;
  href: string;
  Icon: LucideIcon;
}

export const WASEL_SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/Wasel14',
    Icon: Facebook,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/wasel.ride/',
    Icon: Instagram,
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
