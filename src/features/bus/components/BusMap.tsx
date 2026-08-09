import { ArrowRight, ArrowLeftRight, Clock, MapPin } from 'lucide-react';
import { MapWrapper } from '../../components/MapWrapper';
import { C, DS, r, pill, tx } from '../../shared/pageShared';
import { midpoint } from '../../shared/pageShared';

export function BusMap({
  activeBus,
  routeCenter,
  pickupCoord,
  dropoffCoord,
}: {
  activeBus: {
    from: string;
    to: string;
    pickupPoint: string;
    dropoffPoint: string;
    via: string[];
    dep: string;
    arr: string;
    duration: string;
    color?: string;
  };
  routeCenter: { lat: number; lng: number };
  pickupCoord: { lat: number; lng: number };
  dropoffCoord: { lat: number; lng: number };
}) {
  return (
    <div
      style={{
        background: DS.card,
        border: `1px solid ${DS.border}`,
        borderRadius: r(22),
        padding: '18px 18px 16px',
      }}
    >
      <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
        {tx('busPage.live_route_view')}
      </div>
      <div style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 4, marginBottom: 12 }}>
        {tx('busPage.see_pickup_destination_and_route_direction_before_checkout')}
      </div>
      <MapWrapper
        mode="live"
        center={routeCenter}
        pickupLocation={pickupCoord}
        dropoffLocation={dropoffCoord}
        driverLocation={midpoint(pickupCoord, dropoffCoord)}
        height={230}
        showMosques={false}
        showRadars={false}
      />
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {[
          {
            icon: <MapPin size={14} color={activeBus.color ?? DS.cyan} />,
            label: 'الصعود',
            value: activeBus.pickupPoint,
          },
          {
            icon: <ArrowRight size={14} color={activeBus.color ?? DS.cyan} />,
            label: 'الموقف الرئيسي',
            value: activeBus.via.join(' - '),
          },
          {
            icon: <Clock size={14} color={activeBus.color ?? DS.cyan} />,
            label: 'وقت الوصول',
            value: `${activeBus.arr} وصول - ${activeBus.duration}`,
          },
        ].map(item => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: DS.card2,
              border: `1px solid ${DS.border}`,
              borderRadius: r(14),
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: r(10),
                background: `${activeBus.color ?? DS.cyan}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div>
              <div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 700 }}>
                {item.label}
              </div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
