import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Activity,
  ArrowRightLeft,
  Binary,
  Boxes,
  Cable,
  ChartNoAxesCombined,
  Clock3,
  Coins,
  Database,
  Gauge,
  Network,
  Package,
  Radio,
  ServerCog,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { C, F, FM, GRAD_AURORA, R, SH } from '../../utils/wasel-ds';
import { CorridorCard } from './CorridorCard';
import { useMobilityOSServerState } from './serverState';
import type { BookingType, CorridorProjection, MobilityEventEnvelope } from './model';

type CityNode = {
  id: string;
  x: number;
  y: number;
};

const NODES: CityNode[] = [
  { id: 'Amman', x: 46, y: 39 },
  { id: 'Irbid', x: 57, y: 18 },
  { id: 'Zarqa', x: 69, y: 33 },
  { id: 'Madaba', x: 42, y: 50 },
  { id: 'Karak', x: 49, y: 67 },
  { id: 'Aqaba', x: 39, y: 92 },
];

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

function eventTone(event: MobilityEventEnvelope): string {
  if (event.type === 'BookingCreated') return C.gold;
  if (event.type === 'CapacityUpdated') return C.cyan;
  if (event.type === 'DemandUpdated') return C.orange;
  if (event.type === 'PriceRecalculated') return C.green;
  return C.purple;
}

function quantityStep(mode: BookingType): number {
  return mode === 'seat' ? 1 : 5;
}

function networkPath(projection: CorridorProjection): { from: CityNode; to: CityNode } | null {
  const from = NODES.find((node) => node.id === projection.corridor.origin);
  const to = NODES.find((node) => node.id === projection.corridor.destination);
  if (!from || !to) return null;
  return { from, to };
}

export default function MobilityOSCore() {
  const { snapshot, loading, source, createBooking } = useMobilityOSServerState();
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('');
  const [bookingMode, setBookingMode] = useState<BookingType>(INITIAL_MODE);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!snapshot.corridors.length) return;
    if (snapshot.corridors.some((corridor) => corridor.corridor.id === selectedCorridorId)) return;
    setSelectedCorridorId(snapshot.corridors[0].corridor.id);
  }, [selectedCorridorId, snapshot.corridors]);

  useEffect(() => {
    setQuantity((current) => Math.max(1, current));
  }, [bookingMode]);

  const selectedCorridor = useMemo(
    () => snapshot.corridors.find((corridor) => corridor.corridor.id === selectedCorridorId) ?? snapshot.corridors[0] ?? null,
    [selectedCorridorId, snapshot.corridors],
  );

  const marketMetrics = [
    {
      label: 'Seats Unbooked',
      value: String(snapshot.metrics.total_seats_available),
      detail: 'Instantly consumable passenger inventory across the live corridor book.',
      accent: C.cyan,
      icon: Users,
    },
    {
      label: 'Cargo Capacity',
      value: `${snapshot.metrics.total_cargo_available_kg} kg`,
      detail: 'Kilo inventory available to absorb parcels without launching a second marketplace.',
      accent: C.gold,
      icon: Package,
    },
    {
      label: 'Average Utilization',
      value: percent(snapshot.metrics.average_utilization),
      detail: 'Utilization is derived in the engine, never stored in UI state.',
      accent: C.green,
      icon: Gauge,
    },
    {
      label: 'Seat Run Rate',
      value: money(snapshot.metrics.seat_revenue_run_rate),
      detail: 'Projected seat-side GMV flowing through the priced corridor book.',
      accent: C.purple,
      icon: Coins,
    },
  ];

  const selectedMaxQuantity = selectedCorridor
    ? bookingMode === 'seat'
      ? selectedCorridor.seats_available
      : selectedCorridor.cargo_available_kg
    : 0;

  const corridorNodes = selectedCorridor ? networkPath(selectedCorridor) : null;
  const runtimeModeLabel = source === 'server' ? 'server-backed stream' : 'local fallback runtime';
  const runtimeModeBody =
    source === 'server'
      ? 'Corridor state is being projected from the backend snapshot and realtime table updates.'
      : 'Backend auth or stream delivery is unavailable, so the page is using the local event runtime without breaking the booking loop.';

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
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 14% 12%, rgba(88,221,255,0.12), transparent 20%), radial-gradient(circle at 82% 24%, rgba(255,190,92,0.1), transparent 16%)' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.95fr)', gap: 18 }}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'inline-flex', width: 'fit-content', padding: '10px 14px', borderRadius: R.full, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)' }}>
                <WaselLogo size={42} theme="light" variant="full" />
              </div>
              {subheading('Mobility Operating System')}
              <h1 style={{ margin: 0, fontSize: 'clamp(2.4rem, 4vw, 4.25rem)', lineHeight: 0.95, letterSpacing: '-0.05em', maxWidth: 760 }}>
                Corridor capacity exchange for Jordan, priced and updated as a realtime market.
              </h1>
              <p style={{ margin: 0, color: C.textSub, fontSize: '1rem', lineHeight: 1.76, maxWidth: 780 }}>
                This page no longer behaves like a dashboard or a request form. Corridors are the product. Seats and kilos are the inventory.
                Dynamic prices are derived in the engine. The UI only renders streamed corridor state and lets operators consume capacity.
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  'capacity-first marketplace',
                  'event-driven transport exchange',
                  'dual yield: seats + cargo',
                  '< 200ms corridor projection target',
                ].map((item) => (
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {[
                  {
                    title: 'Mobility OS Idea',
                    body: 'Own recurring intercity movement as corridor inventory instead of waiting for fragmented ride requests.',
                    icon: Network,
                    accent: C.cyan,
                  },
                  {
                    title: 'Business Model',
                    body: 'Capture value from every occupied seat and every booked kilo on the same route book, then reinforce it with enterprise lane volume.',
                    icon: Coins,
                    accent: C.gold,
                  },
                  {
                    title: 'Design Language',
                    body: 'Dark command surfaces, signal cyan, monetization gold, healthy throughput green, and precise terminal copy instead of playful labels.',
                    icon: ChartNoAxesCombined,
                    accent: C.green,
                  },
                ].map((item) => (
                  <article key={item.title} style={panelStyle({ padding: 18, borderRadius: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' })}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: `${item.accent}18`, border: `1px solid ${item.accent}2f`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={18} color={item.accent} />
                    </div>
                    <h3 style={{ margin: '14px 0 8px', fontSize: '1rem' }}>{item.title}</h3>
                    <p style={{ margin: 0, color: C.textSub, lineHeight: 1.64, fontSize: '0.9rem' }}>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div style={panelStyle({ padding: 18, borderRadius: 30, minHeight: 420 })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div>
                  {subheading('Realtime Projection')}
                  <div style={{ marginTop: 6, fontSize: '1.2rem', fontWeight: 900 }}>Jordan corridor signal field</div>
                </div>
                <div
                  data-testid="mobility-os-runtime-chip"
                  style={{ padding: '8px 10px', borderRadius: R.full, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', fontFamily: FM, color: source === 'server' ? C.green : C.gold, fontSize: '0.78rem' }}
                >
                  {runtimeModeLabel}
                </div>
              </div>

              <svg viewBox="0 0 100 100" style={{ width: '100%', height: 300, display: 'block' }}>
                {snapshot.corridors.map((projection) => {
                  const path = networkPath(projection);
                  if (!path) return null;
                  const active = projection.corridor.id === selectedCorridorId;
                  const demandTone = projection.demand_pressure > 1 ? C.gold : C.cyan;
                  const cx = (path.from.x + path.to.x) / 2;
                  const cy = (path.from.y + path.to.y) / 2 - 6;
                  return (
                    <g key={projection.corridor.id}>
                      <line
                        x1={path.from.x}
                        y1={path.from.y}
                        x2={path.to.x}
                        y2={path.to.y}
                        stroke={demandTone}
                        strokeOpacity={active ? 0.9 : 0.35}
                        strokeWidth={active ? 2.8 : 1.6 + projection.utilization * 1.2}
                        strokeLinecap="round"
                      />
                      <rect
                        x={cx - 8}
                        y={cy - 3}
                        width={16}
                        height={6}
                        rx={3}
                        fill="rgba(4,11,20,0.84)"
                        stroke={`${demandTone}40`}
                      />
                      <text x={cx} y={cy + 1.8} fill={C.text} textAnchor="middle" fontSize="3">
                        {projection.demand_pressure.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {NODES.map((node) => {
                  const active = node.id === selectedCorridor?.corridor.origin || node.id === selectedCorridor?.corridor.destination;
                  return (
                    <g key={node.id}>
                      <circle cx={node.x} cy={node.y} r={active ? 4.4 : 3.2} fill={active ? C.cyan : C.green} />
                      <circle cx={node.x} cy={node.y} r={active ? 8.2 : 6} fill={`${active ? C.cyan : C.green}18`} />
                      <text x={node.x} y={node.y - 7} fill={C.text} textAnchor="middle" fontSize="3.2">
                        {node.id}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div style={{ borderRadius: 18, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                  <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Selected Corridor
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>
                    {selectedCorridor ? `${selectedCorridor.corridor.origin} -> ${selectedCorridor.corridor.destination}` : 'No corridor selected'}
                  </div>
                </div>
                <div style={{ borderRadius: 18, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                  <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Latency Contract
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800 }}>{snapshot.metrics.event_latency_target_ms}ms projection target</div>
                </div>
              </div>

              <div
                data-testid="mobility-os-runtime-status"
                style={{
                  marginTop: 10,
                  borderRadius: 18,
                  border: `1px solid ${source === 'server' ? `${C.green}30` : `${C.gold}30`}`,
                  background: source === 'server' ? 'rgba(71,214,158,0.08)' : 'rgba(255,190,92,0.08)',
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
                <div style={{ marginTop: 6, color: C.textSub, fontSize: '0.83rem', lineHeight: 1.6 }}>
                  {runtimeModeBody}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {marketMetrics.map((metric) => (
            <article key={metric.label} style={statCardStyle(metric.accent)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${metric.accent}18`, border: `1px solid ${metric.accent}2f`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <metric.icon size={18} color={metric.accent} />
                </div>
                <div style={{ fontSize: '1.58rem', lineHeight: 1, fontWeight: 900, color: metric.accent }}>{metric.value}</div>
              </div>
              <div style={{ marginTop: 14, fontWeight: 800 }}>{metric.label}</div>
              <div style={{ marginTop: 8, color: C.textSub, fontSize: '0.86rem', lineHeight: 1.62 }}>{metric.detail}</div>
            </article>
          ))}
        </section>

        <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.3fr) minmax(330px, 0.9fr)' }}>
          <div style={panelStyle({ padding: 18, borderRadius: 30 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
              <div>
                {subheading('Live Market')}
                <div style={{ marginTop: 8, fontSize: '1.28rem', fontWeight: 900 }}>Corridor order book</div>
                <p style={{ margin: '8px 0 0', color: C.textSub, lineHeight: 1.68, maxWidth: 760 }}>
                  Every card below is a live instrument. Availability, utilization, demand pressure, and dynamic prices are derived in the pricing engine and streamed here.
                </p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: R.full, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', color: C.textSub }}>
                {snapshot.metrics.hottest_corridor || 'No active corridor'} is leading the book
              </div>
            </div>

            <div data-testid="mobility-os-corridor-book" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
              {snapshot.corridors.map((projection) => (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  {subheading('Execution')}
                  <div style={{ marginTop: 8, fontSize: '1.18rem', fontWeight: 900 }}>Consume capacity</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.green, fontSize: '0.82rem' }}>
                  <Radio size={15} />
                  streaming live
                </div>
              </div>

              {selectedCorridor ? (
                <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                  <div style={{ borderRadius: 20, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', padding: '14px 15px' }}>
                    <div style={{ color: C.textMuted, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Selected Instrument
                    </div>
                    <div data-testid="mobility-os-selected-instrument" style={{ marginTop: 8, fontSize: '1.08rem', fontWeight: 900 }}>
                      {selectedCorridor.corridor.origin} {'->'} {selectedCorridor.corridor.destination}
                    </div>
                    <div data-testid="mobility-os-selected-availability" style={{ marginTop: 6, color: C.textSub, fontSize: '0.86rem' }}>
                      {selectedCorridor.seats_available} seats / {selectedCorridor.cargo_available_kg} kg remain.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    {(['seat', 'cargo'] as BookingType[]).map((mode) => {
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
                    <div style={{ color: C.textMuted, fontSize: '0.74rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Quantity
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) 52px', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - quantityStep(bookingMode)))}
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
                      <div style={{ height: 52, borderRadius: 16, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: '1rem' }}>
                        {quantity}{bookingMode === 'seat' ? ' seats' : ' kg'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.min(selectedMaxQuantity, current + quantityStep(bookingMode)))}
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    <div style={{ borderRadius: 18, border: `1px solid ${C.goldDim}`, background: 'rgba(255,190,92,0.08)', padding: '12px 13px' }}>
                      <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Dynamic Unit Price
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 900, color: C.gold }}>
                        {bookingMode === 'seat' ? money(selectedCorridor.dynamic_seat_price) : money(selectedCorridor.dynamic_cargo_price)}
                      </div>
                    </div>
                    <div style={{ borderRadius: 18, border: `1px solid ${C.greenDim}`, background: 'rgba(71,214,158,0.08)', padding: '12px 13px' }}>
                      <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Estimated Order Value
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 900, color: C.green }}>
                        {money((bookingMode === 'seat' ? selectedCorridor.dynamic_seat_price : selectedCorridor.dynamic_cargo_price) * quantity)}
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
                      background: !selectedMaxQuantity ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #58DDFF 0%, #2DC4FF 52%, #47D69E 100%)',
                      color: !selectedMaxQuantity ? C.textMuted : C.bgDeep,
                      fontWeight: 900,
                      cursor: !selectedMaxQuantity ? 'not-allowed' : 'pointer',
                      boxShadow: !selectedMaxQuantity ? 'none' : SH.cyan,
                    }}
                  >
                    POST /booking/create
                  </button>

                  <div style={{ color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.65 }}>
                    Flow enforced: BookingService emits <span style={{ color: C.gold }}>BookingCreated</span>, CorridorService updates capacity, DemandEngine recalculates pressure, PricingEngine emits market prices, RealtimeGateway pushes the new projection.
                  </div>
                </div>
              ) : null}
            </section>

            <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
              {subheading('Business Model')}
              <div style={{ marginTop: 8, fontSize: '1.18rem', fontWeight: 900 }}>How Mobility OS makes money</div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {snapshot.narrative.business_model.map((line) => (
                  <div key={line} style={{ borderRadius: 18, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px', color: C.textSub, lineHeight: 1.6, fontSize: '0.88rem' }}>
                    {line}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' }}>
          <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
            {subheading('Event Flow')}
            <div style={{ marginTop: 8, fontSize: '1.22rem', fontWeight: 900 }}>Server responsibilities rendered as a live chain</div>
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {[
                ['BookingService', 'Accepts POST /booking/create and emits BookingCreated.'],
                ['CorridorService', 'Owns corridor state and updates booked seats or kilos atomically.'],
                ['DemandEngine', 'Transforms new capacity pressure into the next demand index.'],
                ['PricingEngine', 'Applies the mandatory equations and emits recalculated prices.'],
                ['RealtimeGateway', 'Streams CorridorUpdated without polling or manual refresh.'],
              ].map(([title, body]) => (
                <div key={title} style={{ borderRadius: 18, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', padding: '13px 14px' }}>
                  <div style={{ color: C.text, fontWeight: 800 }}>{title}</div>
                  <div style={{ marginTop: 6, color: C.textSub, fontSize: '0.86rem', lineHeight: 1.6 }}>{body}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { label: 'Pricing Equation', value: 'P = P_base * (1 + D_p * U)', icon: Binary, accent: C.cyan },
                { label: 'Demand Pressure', value: 'D_p = demand_index * (1 + U)', icon: TrendingUp, accent: C.gold },
                { label: 'Utilization', value: 'U = (S_booked + K_booked) / (S_total + K_total)', icon: Boxes, accent: C.green },
              ].map((item) => (
                <div key={item.label} style={{ borderRadius: 20, border: `1px solid ${item.accent}28`, background: `${item.accent}10`, padding: '14px 15px' }}>
                  <div style={{ display: 'inline-flex', width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: `${item.accent}18`, border: `1px solid ${item.accent}28` }}>
                    <item.icon size={16} color={item.accent} />
                  </div>
                  <div style={{ marginTop: 10, color: C.textMuted, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: 6, fontFamily: FM, color: item.accent, fontWeight: 800, lineHeight: 1.6 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
            {subheading('Event Tape')}
            <div style={{ marginTop: 8, fontSize: '1.22rem', fontWeight: 900 }}>Recent corridor events</div>
            <div data-testid="mobility-os-event-tape" style={{ marginTop: 14, display: 'grid', gap: 10, maxHeight: 460, overflow: 'auto', paddingRight: 6 }}>
              {snapshot.recent_events.map((event) => (
                <article key={event.id} style={{ borderRadius: 18, border: `1px solid ${eventTone(event)}30`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: eventTone(event) }}>{event.type}</div>
                      <div style={{ marginTop: 4, color: C.textMuted, fontSize: '0.74rem' }}>
                        {event.producer} / {new Date(event.occurred_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ fontFamily: FM, fontSize: '0.72rem', color: C.textMuted }}>{event.trace_id}</div>
                  </div>
                  <pre style={{ margin: '10px 0 0', color: C.textSub, fontFamily: FM, fontSize: '0.73rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
            {subheading('Production Contract')}
            <div style={{ marginTop: 8, fontSize: '1.2rem', fontWeight: 900 }}>API and WebSocket shape</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {[
                {
                  title: 'POST /booking/create',
                  code: `{
  "corridor_id": "${selectedCorridor?.corridor.id ?? 'amman-irbid'}",
  "type": "${bookingMode}",
  "quantity": ${quantity},
  "timestamp": "${new Date(snapshot.updated_at).toISOString()}"
}`,
                },
                {
                  title: 'socket.on("CorridorUpdated")',
                  code: `{
  "corridor_id": "${selectedCorridor?.corridor.id ?? 'amman-irbid'}",
  "projection": {
    "seats_available": ${selectedCorridor?.seats_available ?? 0},
    "cargo_available_kg": ${selectedCorridor?.cargo_available_kg ?? 0},
    "dynamic_seat_price": ${selectedCorridor?.dynamic_seat_price ?? 0},
    "dynamic_cargo_price": ${selectedCorridor?.dynamic_cargo_price ?? 0}
  }
}`,
                },
              ].map((block) => (
                <div key={block.title} style={{ borderRadius: 20, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', padding: '14px 15px' }}>
                  <div style={{ fontWeight: 800 }}>{block.title}</div>
                  <pre style={{ margin: '10px 0 0', fontFamily: FM, color: C.cyanDark, fontSize: '0.76rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {block.code}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle({ padding: 18, borderRadius: 30 })}>
            {subheading('Design Standard')}
            <div style={{ marginTop: 8, fontSize: '1.2rem', fontWeight: 900 }}>Seriousness, pattern, and operating posture</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              {[
                {
                  icon: Database,
                  title: 'Source of truth first',
                  body: 'The UI stops inventing its own analytics. Every primary value comes from corridor state or engine derivation.',
                  accent: C.cyan,
                },
                {
                  icon: ServerCog,
                  title: 'Operational tone, not lifestyle tone',
                  body: 'Replace labels like "good", "low", and "stable" with numeric pressure, utilization, availability, and price movement.',
                  accent: C.gold,
                },
                {
                  icon: ArrowRightLeft,
                  title: 'Exchange pattern',
                  body: 'Interaction begins at the corridor market, not a search form. Operators browse inventory, choose a mode, and consume capacity.',
                  accent: C.green,
                },
                {
                  icon: Cable,
                  title: 'Streamed control surface',
                  body: 'The right metaphor is a terminal receiving pushes from an event bus, not a dashboard re-fetching on load.',
                  accent: C.purple,
                },
                {
                  icon: Clock3,
                  title: 'Latency promise',
                  body: 'This surface is visually calm but architecturally urgent. Every layer is designed around sub-second projection updates.',
                  accent: C.orange,
                },
              ].map((item) => (
                <article key={item.title} style={{ borderRadius: 18, border: `1px solid ${item.accent}28`, background: `${item.accent}10`, padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: `${item.accent}18`, border: `1px solid ${item.accent}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={16} color={item.accent} />
                    </div>
                    <div style={{ fontWeight: 800 }}>{item.title}</div>
                  </div>
                  <div style={{ marginTop: 8, color: C.textSub, lineHeight: 1.62, fontSize: '0.87rem' }}>{item.body}</div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
