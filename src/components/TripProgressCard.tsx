import { useMemo } from 'react';
import { Car, Clock, MapPin, Package } from 'lucide-react';
import { getRideBookings, type RideBookingRecord } from '../services/rideLifecycle';
import { getConnectedPackages, type PackageRequest } from '../services/journeyLogistics';
import { C, F, R, TYPE } from '../utils/wasel-ds';

type ActiveItem = {
  kind: 'ride' | 'package';
  id: string;
  title: string;
  subtitle: string;
  eta: string;
  timeLeftMinutes: number;
  status: string;
  statusColor: string;
  icon: typeof Car;
  path: string;
};

export function ActiveTripsBanner({ onNavigate }: { onNavigate: (path: string) => void }) {
  const rideBookings = useMemo(() => getRideBookings(), []);
  const packages = useMemo(() => getConnectedPackages(), []);

  const activeItems: ActiveItem[] = useMemo(() => {
    const items: ActiveItem[] = [];

    rideBookings.forEach(b => {
      if (b.status === 'pending_driver' || b.status === 'confirmed') {
        items.push({
          kind: 'ride',
          id: b.id,
          title: b.trip?.from_location ? `${b.trip.from_location} → ${b.trip.to_location}` : 'Ride',
          subtitle: `Seats: ${b.seats_requested}`,
          eta: b.trip?.departure_time ?? '--',
          timeLeftMinutes: b.trip?.departure_time
            ? Math.max(1, Math.round((new Date(b.trip.departure_time).getTime() - Date.now()) / 60000))
            : 0,
          status: b.status,
          statusColor: b.status === 'confirmed' ? C.green : C.gold,
          icon: Car,
          path: `/app/live-trip?id=${b.id}`,
        });
      }
    });

    packages.forEach(p => {
      if (p.status === 'searching' || p.status === 'matched' || p.status === 'in_transit') {
        items.push({
          kind: 'package',
          id: p.id,
          title: `Package: ${p.trackingId}`,
          subtitle: `${p.from} → ${p.to}`,
          eta: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          timeLeftMinutes: 15,
          status: p.status,
          statusColor: p.status === 'in_transit' ? C.cyan : p.status === 'matched' ? C.green : C.gold,
          icon: Package,
          path: '/app/packages',
        });
      }
    });

    return items;
  }, [rideBookings, packages]);

  if (activeItems.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        margin: '24px 0',
      }}
    >
      {activeItems.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: R.md,
            background: C.elevated,
            border: `1px solid ${C.borderHov}`,
            boxShadow: `0 10px 24px ${item.statusColor}10`,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: `${item.statusColor}14`,
              border: `1px solid ${item.statusColor}26`,
              display: 'grid',
              placeItems: 'center',
              color: item.statusColor,
              flexShrink: 0,
            }}
          >
            <item.icon size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontWeight: TYPE.weight.ultra,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.base,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: `${item.statusColor}14`,
                  border: `1px solid ${item.statusColor}30`,
                  color: item.statusColor,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.status}
              </span>
            </div>
            <div
              style={{
                color: C.textMuted,
                fontSize: TYPE.size.sm,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.subtitle}
            </div>
            <div
              style={{
                color: C.textDim,
                fontSize: TYPE.size.xs,
                marginTop: 6,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                ETA: {item.eta}
              </span>
              {item.timeLeftMinutes > 0 && (
                <span style={{ fontWeight: TYPE.weight.bold, color: C.textMuted }}>
                  {item.timeLeftMinutes}m left
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.statusColor,
              boxShadow: `0 0 8px ${item.statusColor}`,
              animation: 'pulse 2s infinite',
              flexShrink: 0,
            }}
          />
        </button>
      ))}
    </div>
  );
}
