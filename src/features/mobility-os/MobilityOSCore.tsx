import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Gauge,
  Package,
  Radio,
  Sparkles,
  TimerReset,
  type LucideIcon,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { C, F, FM, GRAD_AURORA, R, SH } from '../../utils/wasel-ds';
import { MobilityOSLandingMap } from '../home/MobilityOSLandingMap';
import type { BookingType, CorridorProjection } from './model';
import { useMobilityOSServerState } from './serverState';

const INITIAL_MODE: BookingType = 'seat';

type SystemMetric = {
  label: string;
  value: string;
  accent: string;
  icon: LucideIcon;
};

function panelStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(9,22,37,0.94), rgba(4,11,20,0.98))',
    border: `1px solid ${C.border}`,
    borderRadius: 28,
    boxShadow: SH.lg,
    overflow: 'hidden',
    ...extra,
  };
}

function money(value: number): string {
  return `${value.toFixed(2)} JOD`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function quantityStep(mode: BookingType): number {
  return mode === 'seat' ? 1 : 5;
}

function shortTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function routeLabel(projection: CorridorProjection | null): string {
  return projection
    ? `${projection.corridor.origin} -> ${projection.corridor.destination}`
    : 'No corridor selected';
}

function eyebrow(text: string, color: string = C.cyan) {
  return (
    <div
      style={{
        fontSize: '0.72rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {text}
    </div>
  );
}

function chip(label: string, value: string, accent: string = C.textSub): JSX.Element {
  return (
    <div
      style={{
        minWidth: 120,
        padding: '10px 12px',
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        style={{
          color: C.textMuted,
          fontSize: '0.66rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 5, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

export default function MobilityOSCore() {
  const { snapshot, loading, source, createBooking } = useMobilityOSServerState();
  const [selectedCorridorId, setSelectedCorridorId] = useState('');
  const [bookingMode, setBookingMode] = useState<BookingType>(INITIAL_MODE);
  const [quantity, setQuantity] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    if (!snapshot.corridors.length) return;
    if (snapshot.corridors.some(corridor => corridor.corridor.id === selectedCorridorId)) return;
    const firstCorridor = snapshot.corridors[0];
    if (!firstCorridor) return;
    setSelectedCorridorId(firstCorridor.corridor.id);
  }, [selectedCorridorId, snapshot.corridors]);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const selectedCorridor = useMemo(
    () =>
      snapshot.corridors.find(corridor => corridor.corridor.id === selectedCorridorId) ??
      snapshot.corridors[0] ??
      null,
    [selectedCorridorId, snapshot.corridors],
  );

  const isCompact = viewportWidth < 1080;
  const isMobile = viewportWidth < 720;
  const runtimeModeLabel = source === 'server' ? 'server-backed stream' : 'local fallback runtime';
  const runtimeAccent = source === 'server' ? C.green : C.gold;
  const selectedRoute = routeLabel(selectedCorridor);
  const selectedAvailability = selectedCorridor
    ? bookingMode === 'seat'
      ? selectedCorridor.seats_available
      : selectedCorridor.cargo_available_kg
    : 0;
  const selectedUnitPrice = selectedCorridor
    ? bookingMode === 'seat'
      ? selectedCorridor.dynamic_seat_price
      : selectedCorridor.dynamic_cargo_price
    : 0;

  const systemMetrics: SystemMetric[] = [
    {
      label: 'seats',
      value: String(snapshot.metrics.total_seats_available),
      accent: C.cyan,
      icon: Users,
    },
    {
      label: 'cargo',
      value: `${snapshot.metrics.total_cargo_available_kg} kg`,
      accent: C.gold,
      icon: Package,
    },
    {
      label: 'utilization',
      value: percent(snapshot.metrics.average_utilization),
      accent: C.green,
      icon: Gauge,
    },
    {
      label: 'refresh',
      value: `${snapshot.metrics.event_latency_target_ms} ms`,
      accent: C.purple,
      icon: TimerReset,
    },
  ];

  const submitBooking = async () => {
    if (!selectedCorridor) return;

    try {
      const response = await createBooking({
        corridor_id: selectedCorridor.corridor.id,
        type: bookingMode,
        quantity,
        timestamp: new Date().toISOString(),
      });
      toast.success(
        `${bookingMode === 'seat' ? 'Seat' : 'Cargo'} booking ${response.booking_id} queued on ${selectedRoute}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Booking failed.');
    }
  };

  const controlRail = (
    <div style={{ display: 'grid', gap: 14 }}>
      <section
        style={panelStyle({
          padding: 18,
          borderRadius: 30,
          background: 'linear-gradient(180deg, rgba(88,221,255,0.1), rgba(6,16,28,0.96))',
        })}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {eyebrow('Focus')}
            <div
              data-testid="mobility-os-selected-instrument"
              style={{
                marginTop: 10,
                fontSize: isMobile ? '1.45rem' : '1.82rem',
                lineHeight: 1.02,
                fontWeight: 900,
                letterSpacing: '-0.04em',
              }}
            >
              {selectedRoute}
            </div>
          </div>
          <div
            data-testid="mobility-os-runtime-chip"
            style={{
              height: 'fit-content',
              padding: '8px 10px',
              borderRadius: R.full,
              border: `1px solid ${runtimeAccent}35`,
              background: `${runtimeAccent}14`,
              fontFamily: FM,
              color: runtimeAccent,
              fontSize: '0.76rem',
            }}
          >
            {runtimeModeLabel}
          </div>
        </div>

        <div
          data-testid="mobility-os-selected-availability"
          style={{ marginTop: 14, color: C.textSub, fontSize: '0.92rem' }}
        >
          {selectedCorridor
            ? `${selectedCorridor.seats_available} seats / ${selectedCorridor.cargo_available_kg} kg remain.`
            : 'No corridor inventory available.'}
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {[
            ['pressure', selectedCorridor ? `${selectedCorridor.demand_pressure.toFixed(2)}x` : '--'],
            ['utilization', selectedCorridor ? percent(selectedCorridor.utilization) : '--'],
            ['seat', selectedCorridor ? money(selectedCorridor.dynamic_seat_price) : '--'],
            ['cargo', selectedCorridor ? money(selectedCorridor.dynamic_cargo_price) : '--'],
          ].map(([label, value], index) => (
            <div
              key={label}
              style={{
                borderRadius: 18,
                border: `1px solid ${index < 2 ? `${C.cyan}20` : `${C.gold}20`}`,
                background: 'rgba(255,255,255,0.04)',
                padding: '12px 13px',
              }}
            >
              <div
                style={{
                  color: C.textMuted,
                  fontSize: '0.66rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={panelStyle({ padding: 14, borderRadius: 30 })}>
        {eyebrow('Corridors', C.textMuted)}
        <div
          data-testid="mobility-os-corridor-book"
          style={{
            marginTop: 12,
            display: 'grid',
            gap: 10,
            maxHeight: isCompact ? 'none' : 370,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {snapshot.corridors.map(projection => {
            const selected = projection.corridor.id === selectedCorridor?.corridor.id;
            return (
              <button
                key={projection.corridor.id}
                data-testid={`mobility-os-corridor-${projection.corridor.id}`}
                type="button"
                onClick={() => setSelectedCorridorId(projection.corridor.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: 22,
                  border: `1px solid ${selected ? C.cyan : C.border}`,
                  background: selected
                    ? 'linear-gradient(180deg, rgba(88,221,255,0.14), rgba(7,19,31,0.98))'
                    : 'linear-gradient(180deg, rgba(12,28,43,0.94), rgba(6,17,29,0.98))',
                  boxShadow: selected ? SH.cyanL : SH.card,
                  padding: '14px 15px',
                  color: C.text,
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'baseline',
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {projection.corridor.origin} {'->'} {projection.corridor.destination}
                  </div>
                  <div style={{ color: C.gold, fontFamily: FM, fontSize: '0.78rem' }}>
                    {projection.demand_pressure.toFixed(2)}x
                  </div>
                </div>

                <div style={{ color: C.textMuted, fontSize: '0.78rem' }}>
                  {projection.corridor.distance_km} km / {projection.corridor.travel_time_min} min
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    `${projection.seats_available} s`,
                    `${projection.cargo_available_kg} kg`,
                    percent(projection.utilization),
                  ].map(value => (
                    <span
                      key={value}
                      style={{
                        padding: '5px 8px',
                        borderRadius: R.full,
                        border: `1px solid ${selected ? C.borderHov : C.border}`,
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: '0.72rem',
                        color: C.textSub,
                      }}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            {eyebrow('Execute', C.textMuted)}
            <div style={{ marginTop: 8, fontSize: '1.05rem', fontWeight: 900 }}>Capacity booking</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.green }}>
            <Radio size={15} />
            <span style={{ fontSize: '0.8rem' }}>{loading ? 'syncing' : 'live'}</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {(['seat', 'cargo'] as BookingType[]).map(mode => {
            const active = bookingMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setBookingMode(mode);
                  setQuantity(mode === 'seat' ? 1 : 5);
                }}
                style={{
                  height: 48,
                  borderRadius: 18,
                  border: `1px solid ${active ? C.cyan : C.border}`,
                  background: active ? C.cyanDim : 'rgba(255,255,255,0.03)',
                  color: active ? C.cyan : C.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {mode === 'seat' ? 'Seat flow' : 'Cargo flow'}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <div
            style={{
              color: C.textMuted,
              fontSize: '0.66rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Quantity
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '52px minmax(0, 1fr) 52px',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setQuantity(current => Math.max(1, current - quantityStep(bookingMode)))}
              style={{
                height: 52,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: C.text,
                fontSize: '1.2rem',
                cursor: 'pointer',
              }}
            >
              -
            </button>
            <div
              style={{
                height: 52,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FM,
                fontSize: '0.98rem',
              }}
            >
              {quantity}
              {bookingMode === 'seat' ? ' seats' : ' kg'}
            </div>
            <button
              type="button"
              onClick={() =>
                setQuantity(current => Math.min(selectedAvailability, current + quantityStep(bookingMode)))
              }
              style={{
                height: 52,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: C.text,
                fontSize: '1.2rem',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {[
            ['unit', money(selectedUnitPrice), C.gold, C.goldDim],
            ['total', money(selectedUnitPrice * quantity), C.green, C.greenDim],
          ].map(([label, value, accent, fill]) => (
            <div
              key={label}
              style={{
                borderRadius: 18,
                border: `1px solid ${accent}35`,
                background: fill,
                padding: '12px 13px',
              }}
            >
              <div
                style={{
                  color: C.textMuted,
                  fontSize: '0.66rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </div>
              <div style={{ marginTop: 6, fontWeight: 900, color: accent }}>{value}</div>
            </div>
          ))}
        </div>

        <button
          data-testid="mobility-os-booking-submit"
          type="button"
          onClick={submitBooking}
          disabled={!selectedAvailability}
          style={{
            marginTop: 16,
            width: '100%',
            height: 54,
            borderRadius: 18,
            border: 'none',
            background: !selectedAvailability
              ? 'rgba(255,255,255,0.08)'
              : 'linear-gradient(135deg, #58DDFF 0%, #2DC4FF 52%, #47D69E 100%)',
            color: !selectedAvailability ? C.textMuted : C.bgDeep,
            fontWeight: 900,
            cursor: !selectedAvailability ? 'not-allowed' : 'pointer',
            boxShadow: !selectedAvailability ? 'none' : SH.cyan,
          }}
        >
          Confirm capacity booking
        </button>

        <div
          data-testid="mobility-os-runtime-status"
          style={{
            marginTop: 14,
            borderRadius: 18,
            border: `1px solid ${runtimeAccent}30`,
            background: `${runtimeAccent}12`,
            padding: '12px 13px',
          }}
        >
          <div
            style={{
              color: C.textMuted,
              fontSize: '0.66rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Runtime mode
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, color: runtimeAccent }}>
            {runtimeModeLabel}
            {loading ? ' / synchronizing' : ''}
          </div>
        </div>
      </section>
    </div>
  );

  const mapStage = (
    <div style={{ display: 'grid', gap: 14 }}>
      <section style={panelStyle({ padding: 14, borderRadius: 32 })}>
        <div style={{ position: 'relative' }}>
          <MobilityOSLandingMap
            focusRouteId={selectedCorridor?.corridor.id}
            focusOrigin={selectedCorridor?.corridor.origin}
            focusDestination={selectedCorridor?.corridor.destination}
            focusLabel={selectedCorridor ? selectedRoute : undefined}
            runtimeMode={source}
            demandPressure={selectedCorridor?.demand_pressure}
            utilization={selectedCorridor?.utilization}
            preferredHeight={isMobile ? 520 : isCompact ? 620 : 780}
            minimalText
          />

          <div
            style={{
              position: 'absolute',
              top: 18,
              left: 18,
              zIndex: 3,
              display: 'grid',
              gap: 10,
              pointerEvents: 'none',
              maxWidth: isMobile ? 180 : 220,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                width: 'fit-content',
                padding: '8px 10px',
                borderRadius: R.full,
                border: `1px solid ${C.border}`,
                background: 'rgba(4,12,24,0.74)',
                backdropFilter: 'blur(14px)',
                color: C.cyan,
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={14} />
              Live field
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                background: 'rgba(4,12,24,0.72)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <div
                style={{
                  color: C.textMuted,
                  fontSize: '0.66rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Selected lane
              </div>
              <div
                style={{
                  marginTop: 7,
                  fontSize: isMobile ? '1rem' : '1.16rem',
                  lineHeight: 1.18,
                  fontWeight: 900,
                }}
              >
                {selectedRoute}
              </div>
              {selectedCorridor ? (
                <div style={{ marginTop: 7, color: C.textSub, fontSize: '0.8rem' }}>
                  {selectedCorridor.seats_available} seats / {selectedCorridor.cargo_available_kg} kg
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {systemMetrics.map(item => (
          <article key={item.label} style={panelStyle({ padding: 16, borderRadius: 22 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  border: `1px solid ${item.accent}30`,
                  background: `${item.accent}14`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon size={17} color={item.accent} />
              </div>
              <div style={{ fontSize: '1.12rem', fontWeight: 900, color: item.accent }}>{item.value}</div>
            </div>
            <div
              style={{
                marginTop: 12,
                color: C.textMuted,
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {item.label}
            </div>
          </article>
        ))}
      </section>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `${GRAD_AURORA}, radial-gradient(circle at 16% 14%, rgba(88,221,255,0.12), transparent 20%), radial-gradient(circle at 84% 18%, rgba(255,190,92,0.12), transparent 22%), ${C.bg}`,
        color: C.text,
        fontFamily: F,
        padding: isMobile ? '18px 12px 48px' : '24px 16px 64px',
      }}
    >
      <div style={{ maxWidth: 1460, margin: '0 auto', display: 'grid', gap: 18 }}>
        <section style={panelStyle({ padding: isMobile ? 16 : 20, borderRadius: 36 })}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 18% 12%, rgba(88,221,255,0.12), transparent 18%), radial-gradient(circle at 84% 20%, rgba(255,190,92,0.1), transparent 16%)',
            }}
          />

          <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    width: 'fit-content',
                    padding: '10px 14px',
                    borderRadius: R.full,
                    border: `1px solid ${C.border}`,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <WaselLogo size={38} theme="light" variant="full" />
                </div>
                {eyebrow('Mobility operating system')}
                <h1
                  style={{
                    margin: 0,
                    fontSize: isMobile ? '2rem' : 'clamp(2.4rem, 4vw, 3.6rem)',
                    lineHeight: 0.94,
                    letterSpacing: '-0.05em',
                    maxWidth: 520,
                  }}
                >
                  Corridor capacity exchange for Jordan.
                </h1>
                <div style={{ color: C.textSub, fontSize: '0.96rem', lineHeight: 1.6 }}>
                  Map-first ride and cargo orchestration.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {chip('runtime', runtimeModeLabel, runtimeAccent)}
                {chip('hottest', snapshot.metrics.hottest_corridor || 'quiet')}
                {chip('updated', shortTime(snapshot.updated_at))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 18,
                gridTemplateColumns: isCompact ? '1fr' : 'minmax(300px, 340px) minmax(0, 1fr)',
              }}
            >
              {isCompact ? mapStage : controlRail}
              {isCompact ? controlRail : mapStage}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
                color: C.textMuted,
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: R.full,
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <Zap size={14} color={C.cyan} />
                pressure + pricing + availability
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: R.full,
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <Activity size={14} color={C.green} />
                one surface, live map, live booking
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
