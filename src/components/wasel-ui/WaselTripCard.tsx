/**
 * WaselTripCard — unified trip/ride display card.
 * Covers: active trips, upcoming bookings, completed history, package carries.
 */

import type { CSSProperties, ReactNode } from 'react';
import { MapPin, Clock, Package, Users, ChevronRight } from 'lucide-react';
import { C, R, TYPE, F, SH } from '../../utils/wasel-ds';
import { WaselBadge } from './WaselBadge';
import { WaselRating } from './WaselRating';

type TripStatus = 'active' | 'upcoming' | 'completed' | 'cancelled' | 'pending';

interface WaselTripCardProps {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  price: number;
  currency?: string;
  status: TripStatus;
  seats?: number;
  seatsAvailable?: number;
  hasPackage?: boolean;
  driverName?: string;
  driverRating?: number;
  isDriver?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  action?: ReactNode;
}

const statusConfig: Record<TripStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#4CAF82', bg: 'rgba(76,175,130,0.14)' },
  upcoming:  { label: 'Upcoming',  color: C.cyan,    bg: 'rgba(244,198,81,0.12)' },
  completed: { label: 'Completed', color: C.textMuted, bg: 'rgba(216,198,160,0.1)' },
  cancelled: { label: 'Cancelled', color: C.error,   bg: 'rgba(255,100,106,0.12)' },
  pending:   { label: 'Pending',   color: C.warning, bg: 'rgba(255,224,138,0.12)' },
};

export function WaselTripCard({
  from,
  to,
  departureTime,
  price,
  currency = 'JOD',
  status,
  seats,
  seatsAvailable,
  hasPackage,
  driverName,
  driverRating,
  isDriver = false,
  onClick,
  style,
  action,
}: WaselTripCardProps) {
  const s = statusConfig[status];

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${from} to ${to}` : undefined}
      style={{
        background: 'var(--wasel-panel-soft)',
        border: `1px solid ${C.border}`,
        borderRadius: R.xxl,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'transform 160ms cubic-bezier(0.2,0.9,0.2,1), box-shadow 160ms ease, border-color 160ms ease' : undefined,
        boxShadow: SH.card,
        fontFamily: F,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = SH.md;
        (e.currentTarget as HTMLDivElement).style.borderColor = C.borderHov;
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = SH.card;
        (e.currentTarget as HTMLDivElement).style.borderColor = '';
      }}
    >
      {/* Header: status + price */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px', borderRadius: R.full,
          background: s.bg, color: s.color,
          fontSize: TYPE.size.xs, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {status === 'active' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, animation: 'wasel-pulse-dot 1.4s ease-in-out infinite' }} />}
          {s.label}
        </span>
        <span style={{ color: C.cyan, fontWeight: 900, fontSize: TYPE.size.lg }}>
          {price} <span style={{ fontSize: TYPE.size.sm, fontWeight: 600 }}>{currency}</span>
        </span>
      </div>

      {/* Route */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={14} color={C.cyan} style={{ flexShrink: 0 }} />
          <span style={{ color: C.textSub, fontSize: TYPE.size.base, fontWeight: 700 }}>{from}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '2px' }}>
          <div style={{ width: 2, height: 14, background: `linear-gradient(180deg, ${C.cyan}, ${C.gold})`, borderRadius: 1, marginLeft: 6 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={14} color={C.gold} style={{ flexShrink: 0 }} />
          <span style={{ color: C.text, fontSize: TYPE.size.base, fontWeight: 800 }}>{to}</span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.textMuted, fontSize: TYPE.size.sm }}>
          <Clock size={13} />
          <span>{departureTime}</span>
        </div>
        {seats !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.textMuted, fontSize: TYPE.size.sm }}>
            <Users size={13} />
            <span>{seatsAvailable ?? seats}/{seats} seats</span>
          </div>
        )}
        {hasPackage && (
          <WaselBadge variant="custom" label="Package" icon={<Package size={10} />} />
        )}
        {isDriver && (
          <WaselBadge variant="custom" label="You drive" />
        )}
      </div>

      {/* Driver info */}
      {driverName && !isDriver && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: `1px solid ${C.borderFaint}` }}>
          <div style={{ width: 28, height: 28, borderRadius: R.full, background: C.cyanDim, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: TYPE.size.sm, fontWeight: 800, color: C.cyan, flexShrink: 0 }}>
            {driverName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.textSub, fontSize: TYPE.size.sm, fontWeight: 700 }}>{driverName}</div>
            {driverRating !== undefined && <WaselRating value={driverRating} size={12} showValue />}
          </div>
          {onClick && <ChevronRight size={16} color={C.textMuted} />}
        </div>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}
