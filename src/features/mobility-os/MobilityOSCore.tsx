import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Activity, Gauge, Network, Package, Radio, TimerReset, Users } from 'lucide-react';
import { toast } from 'sonner';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { C, F, FM, GRAD_AURORA, R, SH } from '../../utils/wasel-ds';
import { MobilityOSLandingMap } from '../home/MobilityOSLandingMap';
import { CorridorCard } from './CorridorCard';
import { useMobilityOSServerState } from './serverState';
import type { BookingType } from './model';

const INITIAL_MODE: BookingType = 'seat';

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

function statCardStyle(accent: string): CSSProperties {
  return {
    ...panelStyle({
      borderRadius: 22,
      padding: 18,
      border: `1px solid ${accent}30`,
      boxShadow: `0 18px 48px ${accent}12`,
      background: 'linear-gradient(180deg, rgba(9,22,37,0.96), rgba(4,11,20,0.99))',
    }),
  };
}

function money(value: number): string {
  return `${value.toFixed(2)} JOD`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function subheading(text: string): JSX.Element {
  return (
    <div
      style={{
        fontSize: '0.74rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: C.cyan,
      }}
    >
      {text}
    </div>
  );
}

function quantityStep(mode: BookingType): number {
  return mode === 'seat' ? 1 : 5;
}

export default function MobilityOSCore() {
  const { snapshot, loading, source, createBooking } = useMobilityOSServerState();
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('');
  const [bookingMode, setBookingMode] = useState<BookingType>(INITIAL_MODE);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!snapshot.corridors.length) return;
    if (snapshot.corridors.some(corridor => corridor.corridor.id === selectedCorridorId)) return;
    const firstCorridor = snapshot.corridors[0];
    if (!firstCorridor) return;
    setSelectedCorridorId(firstCorridor.corridor.id);
  }, [selectedCorridorId, snapshot.corridors]);

  useEffect(() => {
    setQuantity(current => Math.max(1, current));
  }, [bookingMode]);

  const selectedCorridor = useMemo(
    () =>
      snapshot.corridors.find(corridor => corridor.corridor.id === selectedCorridorId) ??
      snapshot.corridors[0] ??
      null,
    [selectedCorridorId, snapshot.corridors],
  );

  const marketMetrics = [
    {
      label: 'Seats Available',
      value: String(snapshot.metrics.total_seats_available),
      detail: 'Passenger inventory currently open across the corridor network.',
      accent: C.cyan,
      icon: Users,
    },
    {
      label: 'Cargo Capacity',
      value: `${snapshot.metrics.total_cargo_available_kg} kg`,
      detail: 'Parcel headroom that can still be absorbed into active movement.',
      accent: C.gold,
      icon: Package,
    },
    {
      label: 'Average Utilization',
      value: percent(snapshot.metrics.average_utilization),
      detail: 'Utilization stays engine-derived and stream-driven.',
      accent: C.green,
      icon: Gauge,
    },
    {
      label: 'Projection Target',
      value: `${snapshot.metrics.event_latency_target_ms} ms`,
      detail: 'Current target for refreshed corridor projections.',
      accent: C.purple,
      icon: TimerReset,
    },
  ];

  const selectedMaxQuantity = selectedCorridor
    ? bookingMode === 'seat'
      ? selectedCorridor.seats_available
      : selectedCorridor.cargo_available_kg
    : 0;

  const runtimeModeLabel = source === 'server' ? 'server-backed stream' : 'local fallback runtime';
  const runtimeModeBody =
    source === 'server'
      ? 'Corridor state is projected from backend snapshots and live corridor updates.'
      : 'Backend auth or delivery is unavailable, so the page is reading from the local simulation runtime.';

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
        `${bookingMode === 'seat' ? 'Seat' : 'Cargo'} booking ${response.booking_id} accepted on ${selectedCorridor.corridor.origin} -> ${selectedCorridor.corridor.destination}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Booking failed.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `${GRAD_AURORA}, radial-gradient(circle at 84% 16%, rgba(255,190,92,0.14), transparent 18%), ${C.bg}`,
        color: C.text,
        fontFamily: F,
        padding: '28px 16px 72px',
      }}
    >
      <div style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gap: 18 }}>
        <section style={panelStyle({ padding: 26, borderRadius: 34 })}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 14% 12%, rgba(88,221,255,0.12), transparent 20%), radial-gradient(circle at 82% 24%, rgba(255,190,92,0.1), transparent 16%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.95fr)',
              gap: 18,
            }}
          >
            <div style={{ display: 'grid', gap: 14 }}>
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
                <WaselLogo size={42} theme="light" variant="full" />
              </div>
              {subheading('Mobility Operating System')}
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(2.4rem, 4vw, 4.25rem)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.05em',
                  maxWidth: 760,
                }}
              >
                Corridor capacity exchange for Jordan, projected from live demand and availability.
              </h1>
              <p
                style={{
                  margin: 0,
                  color: C.textSub,
                  fontSize: '1rem',
                  lineHeight: 1.76,
                  maxWidth: 780,
                }}
              >
                The page stays focused on corridor state, capacity pressure, and active
                availability. The interface only renders projection data that the simulation runtime
                has already resolved.
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  'live corridor projection',
                  'continuous capacity updates',
                  'seat and cargo visibility',
                  'Jordan network coverage',
                ].map(item => (
                  <div
                    key={item}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 16,
                      border: `1px solid ${C.border}`,
                      background: 'rgba(255,255,255,0.04)',
                      color: C.textSub,
                      fontSize: '0.82rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {[
                  {
                    title: 'Signal Field',
                    body: 'The map focus stays anchored to pressure, utilization, and remaining capacity on the selected corridor.',
                    icon: Activity,
                    accent: C.cyan,
                  },
                  {
                    title: 'Capacity Book',
                    body: 'Operators act on live corridor inventory instead of manually assembling movement from separate screens.',
                    icon: Network,
                    accent: C.gold,
                  },
                  {
                    title: 'Runtime Sync',
                    body: 'Corridor state reconciles automatically as the backend or local simulation advances the network.',
                    icon: TimerReset,
                    accent: C.green,
                  },
                ].map(item => (
                  <article
                    key={item.title}
                    style={panelStyle({
                      padding: 18,
                      borderRadius: 22,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                    })}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: `${item.accent}18`,
                        border: `1px solid ${item.accent}2f`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <item.icon size={18} color={item.accent} />
                    </div>
                    <h3 style={{ margin: '14px 0 8px', fontSize: '1rem' }}>{item.title}</h3>
                    <p
                      style={{ margin: 0, color: C.textSub, lineHeight: 1.64, fontSize: '0.9rem' }}
                    >
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div style={panelStyle({ padding: 18, borderRadius: 30, minHeight: 420 })}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div>
                  {subheading('Realtime Projection')}
                  <div style={{ marginTop: 6, fontSize: '1.2rem', fontWeight: 900 }}>
                    Jordan corridor signal field
                  </div>
                </div>
                <div
                  data-testid="mobility-os-runtime-chip"
                  style={{
                    padding: '8px 10px',
                    borderRadius: R.full,
                    border: `1px solid ${C.border}`,
                    background: 'rgba(255,255,255,0.03)',
                    fontFamily: FM,
                    color: source === 'server' ? C.green : C.gold,
                    fontSize: '0.78rem',
                  }}
                >
                  {runtimeModeLabel}
                </div>
              </div>

              <MobilityOSLandingMap
                focusRouteId={selectedCorridor?.corridor.id}
                focusOrigin={selectedCorridor?.corridor.origin}
                focusDestination={selectedCorridor?.corridor.destination}
                focusLabel={
                  selectedCorridor
                    ? `${selectedCorridor.corridor.origin} -> ${selectedCorridor.corridor.destination}`
                    : undefined
                }
                runtimeMode={source}
                demandPressure={selectedCorridor?.demand_pressure}
                utilization={selectedCorridor?.utilization}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${C.borderFaint}`,
                    background: 'rgba(255,255,255,0.03)',
                    padding: '12px 13px',
                  }}
                >
                  <div
                    style={{
                      color: C.textMuted,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    Selected Corridor
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>
                    {selectedCorridor
                      ? `${selectedCorridor.corridor.origin} -> ${selectedCorridor.corridor.destination}`
                      : 'No corridor selected'}
                  </div>
                </div>
                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${C.borderFaint}`,
                    background: 'rgba(255,255,255,0.03)',
                    padding: '12px 13px',
                  }}
                >
                  <div
                    style={{
                      color: C.textMuted,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    Projection Target
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>
                    {snapshot.metrics.event_latency_target_ms}ms refresh target
                  </div>
                </div>
              </div>

              <div
                data-testid="mobility-os-runtime-status"
                style={{
                  marginTop: 10,
                  borderRadius: 18,
                  border: `1px solid ${source === 'server' ? `${C.green}30` : `${C.gold}30`}`,
                  background:
                    source === 'server' ? 'rgba(71,214,158,0.08)' : 'rgba(255,190,92,0.08)',
                  padding: '12px 13px',
                }}
              >
                <div
                  style={{
                    color: C.textMuted,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Runtime Mode
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontWeight: 900,
                    color: source === 'server' ? C.green : C.gold,
                  }}
                >
                  {runtimeModeLabel}
                  {loading ? ' / synchronizing' : ''}
                </div>
                <div
                  style={{ marginTop: 6, color: C.textSub, fontSize: '0.83rem', lineHeight: 1.6 }}
                >
                  {runtimeModeBody}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          }}
        >
          {marketMetrics.map(metric => (
            <article key={metric.label} style={statCardStyle(metric.accent)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: `${metric.accent}18`,
                    border: `1px solid ${metric.accent}2f`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <metric.icon size={18} color={metric.accent} />
                </div>
                <div
                  style={{
                    fontSize: '1.58rem',
                    lineHeight: 1,
                    fontWeight: 900,
                    color: metric.accent,
                  }}
                >
                  {metric.value}
                </div>
              </div>
              <div style={{ marginTop: 14, fontWeight: 800 }}>{metric.label}</div>
              <div
                style={{ marginTop: 8, color: C.textSub, fontSize: '0.86rem', lineHeight: 1.62 }}
              >
                {metric.detail}
              </div>
            </article>
          ))}
        </section>

        <section
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(330px, 0.9fr)',
          }}
        >
          <div style={panelStyle({ padding: 18, borderRadius: 30 })}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: 14,
              }}
            >
              <div>
                {subheading('Live Market')}
                <div style={{ marginTop: 8, fontSize: '1.28rem', fontWeight: 900 }}>
                  Corridor order book
                </div>
                <p style={{ margin: '8px 0 0', color: C.textSub, lineHeight: 1.68, maxWidth: 760 }}>
                  Each corridor card renders live availability, utilization, pressure, and dynamic
                  prices from the active simulation state.
                </p>
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: R.full,
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  fontSize: '0.78rem',
                  color: C.textSub,
                }}
              >
                {snapshot.metrics.hottest_corridor || 'No active corridor'} is the highest-pressure
                lane
              </div>
            </div>

            <div
              data-testid="mobility-os-corridor-book"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: 14,
              }}
            >
              {snapshot.corridors.map(projection => (
                <CorridorCard
                  key={projection.corridor.id}
                  projection={projection}
                  selected={projection.corridor.id === selectedCorridorId}
                  onSelect={() => setSelectedCorridorId(projection.corridor.id)}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  {subheading('Execution')}
                  <div style={{ marginTop: 8, fontSize: '1.18rem', fontWeight: 900 }}>
                    Consume capacity
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: C.green,
                    fontSize: '0.82rem',
                  }}
                >
                  <Radio size={15} />
                  streaming live
                </div>
              </div>

              {selectedCorridor ? (
                <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                  <div
                    style={{
                      borderRadius: 20,
                      border: `1px solid ${C.border}`,
                      background: 'rgba(255,255,255,0.03)',
                      padding: '14px 15px',
                    }}
                  >
                    <div
                      style={{
                        color: C.textMuted,
                        fontSize: '0.72rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Selected Instrument
                    </div>
                    <div
                      data-testid="mobility-os-selected-instrument"
                      style={{ marginTop: 8, fontSize: '1.08rem', fontWeight: 900 }}
                    >
                      {selectedCorridor.corridor.origin} {'->'}{' '}
                      {selectedCorridor.corridor.destination}
                    </div>
                    <div
                      data-testid="mobility-os-selected-availability"
                      style={{ marginTop: 6, color: C.textSub, fontSize: '0.86rem' }}
                    >
                      {selectedCorridor.seats_available} seats /{' '}
                      {selectedCorridor.cargo_available_kg} kg remain.
                    </div>
                  </div>

                  <div
                    style={{
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
                            height: 52,
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

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div
                      style={{
                        color: C.textMuted,
                        fontSize: '0.74rem',
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
                        onClick={() =>
                          setQuantity(current => Math.max(1, current - quantityStep(bookingMode)))
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
                          fontSize: '1rem',
                        }}
                      >
                        {quantity}
                        {bookingMode === 'seat' ? ' seats' : ' kg'}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(current =>
                            Math.min(selectedMaxQuantity, current + quantityStep(bookingMode)),
                          )
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
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 18,
                        border: `1px solid ${C.goldDim}`,
                        background: 'rgba(255,190,92,0.08)',
                        padding: '12px 13px',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        Dynamic Unit Price
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 900, color: C.gold }}>
                        {bookingMode === 'seat'
                          ? money(selectedCorridor.dynamic_seat_price)
                          : money(selectedCorridor.dynamic_cargo_price)}
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 18,
                        border: `1px solid ${C.greenDim}`,
                        background: 'rgba(71,214,158,0.08)',
                        padding: '12px 13px',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        Estimated Order Value
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 900, color: C.green }}>
                        {money(
                          (bookingMode === 'seat'
                            ? selectedCorridor.dynamic_seat_price
                            : selectedCorridor.dynamic_cargo_price) * quantity,
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    data-testid="mobility-os-booking-submit"
                    type="button"
                    onClick={submitBooking}
                    disabled={!selectedMaxQuantity}
                    style={{
                      height: 54,
                      borderRadius: 18,
                      border: 'none',
                      background: !selectedMaxQuantity
                        ? 'rgba(255,255,255,0.08)'
                        : 'linear-gradient(135deg, #58DDFF 0%, #2DC4FF 52%, #47D69E 100%)',
                      color: !selectedMaxQuantity ? C.textMuted : C.bgDeep,
                      fontWeight: 900,
                      cursor: !selectedMaxQuantity ? 'not-allowed' : 'pointer',
                      boxShadow: !selectedMaxQuantity ? 'none' : SH.cyan,
                    }}
                  >
                    Confirm Capacity Booking
                  </button>

                  <div style={{ color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.65 }}>
                    Bookings feed back into corridor availability, pressure, and price before the
                    next projection arrives.
                  </div>
                </div>
              ) : null}
            </section>

            {selectedCorridor ? (
              <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
                {subheading('Corridor Readout')}
                <div style={{ marginTop: 8, fontSize: '1.18rem', fontWeight: 900 }}>
                  Selected corridor signal
                </div>
                <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                  {[
                    ['Pressure', `${selectedCorridor.demand_pressure.toFixed(2)}x`],
                    ['Utilization', percent(selectedCorridor.utilization)],
                    ['Seat price', money(selectedCorridor.dynamic_seat_price)],
                    ['Cargo price', money(selectedCorridor.dynamic_cargo_price)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        borderRadius: 18,
                        border: `1px solid ${C.borderFaint}`,
                        background: 'rgba(255,255,255,0.03)',
                        padding: '12px 13px',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 900 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {[
            {
              title: 'Hottest corridor',
              value: snapshot.metrics.hottest_corridor || 'No active corridor',
              body: 'The lead corridor is recalculated from live demand pressure across the active book.',
              accent: C.cyan,
            },
            {
              title: 'Runtime source',
              value: runtimeModeLabel,
              body: 'The map and corridor book stay bound to the same projection source.',
              accent: source === 'server' ? C.green : C.gold,
            },
            {
              title: 'Snapshot updated',
              value: new Date(snapshot.updated_at).toLocaleTimeString(),
              body: 'Visible state is refreshed from the current corridor snapshot only.',
              accent: C.purple,
            },
          ].map(item => (
            <article key={item.title} style={panelStyle({ padding: 18, borderRadius: 22 })}>
              <div
                style={{
                  color: C.textMuted,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {item.title}
              </div>
              <div
                style={{ marginTop: 10, fontSize: '1.12rem', fontWeight: 900, color: item.accent }}
              >
                {item.value}
              </div>
              <p
                style={{
                  margin: '10px 0 0',
                  color: C.textSub,
                  lineHeight: 1.62,
                  fontSize: '0.9rem',
                }}
              >
                {item.body}
              </p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
