import { MapPin } from 'lucide-react';
import { C, DS, TYPE, r } from '../../../utils/wasel-ds';
import { WaselButton } from '../../../components/wasel-ui';

interface PackageTrackingProps {
  trackingCode?: string;
}

export function PackageTrackPanel({ trackingCode }: PackageTrackingProps) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <label style={{ fontSize: '0.7rem', color: DS.muted, fontWeight: 700 }}>Tracking Code</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            type="text"
            defaultValue={trackingCode || ''}
            placeholder="PKG-XXXXX"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: r.lg,
              border: `1px solid ${DS.border}`,
              background: DS.card,
              color: C.text,
              fontSize: TYPE.size.base,
            }}
          />
          <WaselButton>Track</WaselButton>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {[
          { status: 'Delivered', time: '2026-09-14 14:30', location: 'Amman → Aqaba' },
          { status: 'In Transit', time: '2026-09-14 09:15', location: 'Karak' },
          { status: 'Picked Up', time: '2026-09-13 16:00', location: 'Amman' },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: r.lg,
              border: `1px solid ${DS.border}`,
              background: DS.card2,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: r.full,
                background: `${DS.green}20`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <MapPin size={14} color={DS.green} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: TYPE.size.sm, color: C.text }}>{item.status}</div>
              <div style={{ fontSize: TYPE.size.xs, color: DS.muted }}>{item.time}</div>
            </div>
            <div style={{ fontSize: TYPE.size.xs, color: DS.sub }}>{item.location}</div>
          </div>
        ))}
      </div>
    </div>
  );
}