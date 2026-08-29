import { type CSSProperties, type JSX, useEffect, useMemo, useState } from 'react';
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
import { C, F, FM, GRAD, GRAD_AURORA, GRAD_HERO, R, SH } from '../../utils/wasel-ds';
import { MobilityOSLandingMap } from '../home/MobilityOSLandingMap';
import type { BookingType, CorridorProjection } from './model';
import { useMobilityOSServerState } from './serverState';
import { getCurrentLang, tx } from '../../locales/tx';
import { useLanguage } from '../../contexts/LanguageContext';

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
    background: GRAD_HERO,
    border: `1px solid ${C.border}`,
    borderRadius: R['3xl'],
    boxShadow: SH.lg,
    overflow: 'hidden',
    ...extra,
  };
}

function money(value: number): string {
  return `${value.toFixed(2)} ${getCurrentLang() === 'ar' ? 'دينار' : 'JOD'}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function quantityStep(mode: BookingType): number {
  return mode === 'seat' ? 1 : 5;
}

function shortTime(value: string): string {
  return new Date(value).toLocaleTimeString(getCurrentLang() === 'ar' ? 'ar-JO' : undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان', Aqaba: 'العقبة', Irbid: 'إربد', Karak: 'الكرك', Zarqa: 'الزرقاء', Madaba: 'مادبا',
};
function cityLabel(city: string): string {
  return getCurrentLang() === 'ar' ? CITY_LABELS_AR[city] ?? city : city;
}

function localizedCorridorLabel(value: string): string {
  const separator = value.includes('->') ? '->' : value.includes('←') ? '←' : null;
  if (!separator) return cityLabel(value);
  const [origin, destination] = value.split(separator).map(part => part.trim());
  if (!origin || !destination) return cityLabel(value);
  return `${cityLabel(origin)} ${getCurrentLang() === 'ar' ? '←' : '->'} ${cityLabel(destination)}`;
}

function routeLabel(projection: CorridorProjection | null): string {
  return projection
    ? `${cityLabel(projection.corridor.origin)} ← ${cityLabel(projection.corridor.destination)}`
    : tx('mobilityOSCore.no_active_pressure');
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
        background: C.elevated,
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
  const { language } = useLanguage();
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
  const runtimeModeLabel =
    source === 'server'
      ? tx('mobilityOSCore.runtime_server_stream')
      : tx('mobilityOSCore.runtime_local_fallback');
  const runtimeAccent = source === 'server' ? C.green : C.gold;
  const selectedRoute = routeLabel(selectedCorridor);
  const hottestCorridor =
    snapshot.metrics.hottest_corridor
      ? language === 'ar'
        ? selectedRoute
        : snapshot.metrics.hottest_corridor
      : tx('mobilityOSCore.no_active_pressure');
  const networkYield = snapshot.corridors.reduce(
    (sum, corridor) =>
      sum +
      corridor.seats_available * corridor.dynamic_seat_price +
      corridor.cargo_available_kg * corridor.dynamic_cargo_price,
    0,
  );
  const constrainedCorridors = snapshot.corridors.filter(
    corridor => corridor.utilization >= 0.72 || corridor.demand_pressure >= 1.08,
  ).length;
  const reliabilityScore = Math.max(
    0,
    Math.min(100, Math.round((1 - snapshot.metrics.event_latency_target_ms / 1000) * 100)),
  );
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
      label: tx('mobilityOSCore.seats_label'),
      value: String(snapshot.metrics.total_seats_available),
      accent: C.cyan,
      icon: Users,
    },
    {
      label: tx('mobilityOSCore.cargo_label'),
      value: `${snapshot.metrics.total_cargo_available_kg} ${tx('mobilityOSCore.kg_unit')}`,
      accent: C.gold,
      icon: Package,
    },
    {
      label: tx('mobilityOSCore.utilization_label'),
      value: percent(snapshot.metrics.average_utilization),
      accent: C.green,
      icon: Gauge,
    },
    {
      label: tx('mobilityOSCore.refresh_label'),
      value: `${snapshot.metrics.event_latency_target_ms} ${getCurrentLang() === 'ar' ? 'مللي ثانية' : 'ms'}`,
      accent: C.purple,
      icon: TimerReset,
    },
  ];

  const commandSignals = [
    {
      label: tx('mobilityOSCore.network_yield_label'),
      value: money(networkYield),
      detail: tx('mobilityOSCore.network_yield_detail'),
      accent: C.gold,
      icon: Zap,
    },
    {
      label: tx('mobilityOSCore.pressure_lane_label'),
      value: hottestCorridor,
      detail: tx('mobilityOSCore.pressure_lane_detail', {
        count: constrainedCorridors,
      }),
      accent: C.cyan,
      icon: Activity,
    },
    {
      label: tx('mobilityOSCore.reliability_label'),
      value: `${reliabilityScore}%`,
      detail: tx('mobilityOSCore.reliability_detail', {
        ms: snapshot.metrics.event_latency_target_ms,
      }),
      accent: runtimeAccent,
      icon: Radio,
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
      const bookingType = tx(
        bookingMode === 'seat' ? 'mobilityOSCore.seat_booking' : 'mobilityOSCore.cargo_booking',
      );
      toast.success(
        tx('mobilityOSCore.booking_queued_toast', {
          type: bookingType,
          id: response.booking_id,
          route: selectedRoute,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Booking failed.');
      toast.error(error instanceof Error ? error.message : tx('errors.booking_failed'));
    }
  };

  const controlRail = (
    <div style={{ display: 'grid', gap: 14 }}>
      <section
        style={panelStyle({
          padding: 18,
          borderRadius: R['3xl'],
          background: `linear-gradient(180deg, ${C.cyanDim}, ${C.card})`,
        })}
      >
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
        >
          <div>
            {eyebrow(tx('mobilityOSCore.focus_label'))}
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
            ? tx('mobilityOSCore.availability_remain', {
                seats: selectedCorridor.seats_available,
                kg: selectedCorridor.cargo_available_kg,
              })
            : tx('mobilityOSCore.no_inventory')}
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
            [
              tx('mobilityOSCore.pressure_label'),
              selectedCorridor ? `${selectedCorridor.demand_pressure.toFixed(2)}x` : '--',
            ],
            [
              tx('mobilityOSCore.utilization_label'),
              selectedCorridor ? percent(selectedCorridor.utilization) : '--',
            ],
            [
              tx('mobilityOSCore.seat_label'),
              selectedCorridor ? money(selectedCorridor.dynamic_seat_price) : '--',
            ],
            [
              tx('mobilityOSCore.cargo_label'),
              selectedCorridor ? money(selectedCorridor.dynamic_cargo_price) : '--',
            ],
          ].map(([label, value], index) => (
            <div
              key={label}
              style={{
                borderRadius: R.xl,
                border: `1px solid ${index < 2 ? `${C.cyan}20` : `${C.gold}20`}`,
                background: C.elevated,
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

      <section style={panelStyle({ padding: 14, borderRadius: R['3xl'] })}>
        {eyebrow(tx('mobilityOSCore.corridors_label'), C.textMuted)}
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
                  borderRadius: R.xxl,
                  border: `1px solid ${selected ? C.cyan : C.border}`,
                  background: selected
                    ? `linear-gradient(180deg, ${C.cyanDim}, ${C.card})`
                    : C.card,
                  boxShadow: selected ? SH.blueL : SH.card,
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
                    {cityLabel(projection.corridor.origin)} {'←'} {cityLabel(projection.corridor.destination)}
                  </div>
                  <div style={{ color: C.gold, fontFamily: FM, fontSize: '0.78rem' }}>
                    {projection.demand_pressure.toFixed(2)}
                    {tx('mobilityOSCore.x')}
                  </div>
                </div>

                <div style={{ color: C.textMuted, fontSize: '0.78rem' }}>
                  {projection.corridor.distance_km} {tx('mobilityOSCore.km')}
                  {projection.corridor.travel_time_min} {tx('services.publicBus.minutes')}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    `${projection.seats_available} ${tx('mobilityOSCore.seats_unit')}`,
                    `${projection.cargo_available_kg} ${tx('mobilityOSCore.kg_unit')}`,
                    percent(projection.utilization),
                  ].map(value => (
                    <span
                      key={value}
                      style={{
                        padding: '5px 8px',
                        borderRadius: R.full,
                        border: `1px solid ${selected ? C.borderHov : C.border}`,
                        background: C.elevated,
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

      <section style={panelStyle({ padding: 18, borderRadius: R['3xl'] })}>
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
            {eyebrow(tx('mobilityOSCore.execute_label'), C.textMuted)}
            <div style={{ marginTop: 8, fontSize: '1.05rem', fontWeight: 900 }}>
              {tx('mobilityOSCore.capacity_booking')}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.green }}>
            <Radio size={15} />
            <span style={{ fontSize: '0.8rem' }}>
              {loading ? tx('mobilityOSCore.syncing') : tx('pageShared.live')}
            </span>
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
                  background: active ? C.cyanDim : C.elevated,
                  color: active ? C.cyan : C.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {tx(mode === 'seat' ? 'mobilityOSCore.seat_flow' : 'mobilityOSCore.cargo_flow')}
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
            {tx('mobilityOSCore.quantity')}
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
                background: C.elevated,
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
                background: C.elevated,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FM,
                fontSize: '0.98rem',
              }}
            >
              {quantity}
              {tx(bookingMode === 'seat' ? 'mobilityOSCore.seats_unit' : 'mobilityOSCore.kg_unit')}
            </div>
            <button
              type="button"
              onClick={() =>
                setQuantity(current =>
                  Math.min(selectedAvailability, current + quantityStep(bookingMode)),
                )
              }
              style={{
                height: 52,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: C.elevated,
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
            [tx('mobilityOSCore.unit_label'), money(selectedUnitPrice), C.gold, C.goldDim],
            [tx('common.total'), money(selectedUnitPrice * quantity), C.green, C.greenDim],
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
            background: !selectedAvailability ? C.elevated : GRAD,
            color: !selectedAvailability ? C.textMuted : C.bgDeep,
            fontWeight: 900,
            cursor: !selectedAvailability ? 'not-allowed' : 'pointer',
            boxShadow: !selectedAvailability ? 'none' : SH.blue,
          }}
        >
          {tx('mobilityOSCore.confirm_capacity_booking')}
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
            {tx('mobilityOSCore.runtime_mode')}
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, color: runtimeAccent }}>
            {runtimeModeLabel}
            {loading ? ` / ${tx('mobilityOSCore.synchronizing')}` : ''}
          </div>
        </div>
      </section>
    </div>
  );

  const mapStage = (
    <div style={{ display: 'grid', gap: 14 }}>
      <section style={panelStyle({ padding: 14, borderRadius: R['3xl'] })}>
        <div style={{ position: 'relative' }}>
          <MobilityOSLandingMap
            focusRouteId={selectedCorridor?.corridor.id}
            focusOrigin={selectedCorridor?.corridor.origin}
            focusDestination={selectedCorridor?.corridor.destination}
            focusLabel={selectedCorridor ? selectedRoute : undefined}
            runtimeMode={source}
            demandPressure={selectedCorridor?.demand_pressure}
            utilization={selectedCorridor?.utilization}
            preferredHeight={isMobile ? 360 : isCompact ? 420 : 460}
            minimalText
            showOverlay={false}
          />

          <div
            style={{
              position: 'absolute',
              bottom: 18,
              right: 18,
              zIndex: 3,
              display: 'grid',
              gap: 8,
              pointerEvents: 'none',
              maxWidth: isMobile ? 190 : 250,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: 'fit-content',
                padding: '7px 10px',
                borderRadius: R.full,
                border: `1px solid ${runtimeAccent}70`,
                background: C.bgDeep,
                backdropFilter: 'blur(14px)',
                color: runtimeAccent,
                fontSize: '0.66rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={14} />
              {tx('mobilityOSCore.live_field')}
            </div>

            <div
              style={{
                padding: '13px 14px',
                borderRadius: R.xl,
                border: `1px solid ${C.borderHov}`,
                background: 'rgba(5, 22, 34, 0.94)',
                boxShadow: SH.md,
              }}
            >
              <div
                style={{
                  color: runtimeAccent,
                  fontSize: '0.66rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {tx('mobilityOSCore.selected_lane')}
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: isMobile ? '1rem' : '1.16rem',
                  lineHeight: 1.25,
                  fontWeight: 900,
                }}
              >
                {selectedRoute}
              </div>
              {selectedCorridor ? (
                <div style={{ marginTop: 6, color: C.textSub, fontSize: '0.78rem', lineHeight: 1.35 }}>
                  {tx('mobilityOSCore.seats_and_cargo', {
                    seats: selectedCorridor.seats_available,
                    kg: selectedCorridor.cargo_available_kg,
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="mobility-map-guide-title"
        style={panelStyle({
          padding: isMobile ? 16 : 18,
          borderRadius: R['3xl'],
          background: `linear-gradient(135deg, ${C.cyanDim}, ${C.card})`,
        })}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <div
              style={{
                color: C.cyan,
                fontSize: '0.66rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 800,
              }}
            >
              {tx('mobilityOSCore.map_guide_eyebrow')}
            </div>
            <h2
              id="mobility-map-guide-title"
              style={{ margin: '6px 0 0', fontSize: isMobile ? '1.15rem' : '1.3rem', lineHeight: 1.2 }}
            >
              {tx('mobilityOSCore.map_guide_title')}
            </h2>
            <p style={{ margin: '8px 0 0', color: C.textSub, fontSize: '0.9rem', lineHeight: 1.55 }}>
              {tx('mobilityOSCore.map_guide_overview')}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              maxWidth: 440,
            }}
          >
            {[
              tx('mobilityOSCore.map_benefit_read'),
              tx('mobilityOSCore.map_benefit_compare'),
              tx('mobilityOSCore.map_benefit_act'),
            ].map(benefit => (
              <span
                key={benefit}
                style={{
                  borderRadius: R.full,
                  border: `1px solid ${C.borderHov}`,
                  background: C.elevated,
                  color: C.textSub,
                  padding: '6px 9px',
                  fontSize: '0.72rem',
                  lineHeight: 1.25,
                }}
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          {[
            {
              key: 'rider',
              label: tx('mobilityOSCore.map_legend_rider_label'),
              detail: tx('mobilityOSCore.map_legend_rider_detail'),
              sample: (
                <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 30, height: 4, borderRadius: R.full, background: C.cyan, boxShadow: SH.blue }} />
                  <span style={{ width: 7, height: 7, borderRadius: R.full, background: C.text }} />
                </span>
              ),
            },
            {
              key: 'capacity',
              label: tx('mobilityOSCore.map_legend_capacity_label'),
              detail: tx('mobilityOSCore.map_legend_capacity_detail'),
              sample: (
                <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 25, height: 3, borderRadius: R.full, background: C.cyanDark }} />
                  <span style={{ width: 10, height: 10, borderRadius: R.full, background: C.green, boxShadow: SH.green }} />
                </span>
              ),
            },
            {
              key: 'parcel',
              label: tx('mobilityOSCore.map_legend_parcel_label'),
              detail: tx('mobilityOSCore.map_legend_parcel_detail'),
              sample: (
                <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 30, borderTop: `2px dashed ${C.blueLight}` }} />
                  <span style={{ width: 8, height: 8, background: C.blueLight }} />
                </span>
              ),
            },
            {
              key: 'city',
              label: tx('mobilityOSCore.map_legend_city_label'),
              detail: tx('mobilityOSCore.map_legend_city_detail'),
              sample: (
                <span
                  aria-hidden="true"
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: R.full,
                    border: `2px solid ${C.cyan}`,
                    background: C.text,
                    boxShadow: `0 0 0 5px ${C.cyanDim}`,
                  }}
                />
              ),
            },
            {
              key: 'focus',
              label: tx('mobilityOSCore.map_legend_focus_label'),
              detail: tx('mobilityOSCore.map_legend_focus_detail'),
              sample: (
                <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 30, height: 5, borderRadius: R.full, background: C.gold, boxShadow: SH.orange }} />
                  <span style={{ width: 10, height: 10, borderRadius: R.full, background: C.gold, boxShadow: `0 0 0 5px ${C.goldDim}` }} />
                </span>
              ),
            },
            {
              key: 'intensity',
              label: tx('mobilityOSCore.map_legend_intensity_label'),
              detail: tx('mobilityOSCore.map_legend_intensity_detail'),
              sample: (
                <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'end', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: R.full, background: C.cyan }} />
                  <span style={{ width: 7, height: 7, borderRadius: R.full, background: C.cyan }} />
                  <span style={{ width: 10, height: 10, borderRadius: R.full, background: C.cyan }} />
                </span>
              ),
            },
          ].map(item => (
            <article
              key={item.key}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: 10,
                alignItems: 'start',
                minHeight: 76,
                padding: '11px 12px',
                borderRadius: R.xl,
                border: `1px solid ${C.border}`,
                background: C.card,
              }}
            >
              <div style={{ minWidth: 36, paddingTop: 5 }}>{item.sample}</div>
              <div>
                <div style={{ color: C.text, fontSize: '0.78rem', fontWeight: 800 }}>{item.label}</div>
                <div style={{ marginTop: 4, color: C.textMuted, fontSize: '0.72rem', lineHeight: 1.45 }}>
                  {item.detail}
                </div>
              </div>
            </article>
          ))}
        </div>

        <p style={{ margin: '13px 0 0', color: C.textMuted, fontSize: '0.75rem', lineHeight: 1.5 }}>
          {tx('mobilityOSCore.map_guide_note')}
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: 12,
          alignItems: 'start',
        }}
      >
        {systemMetrics.map(item => (
          <article
            key={item.label}
            style={panelStyle({
              padding: 16,
              borderRadius: R.xxl,
              minHeight: 108,
              height: 'auto',
              alignSelf: 'start',
            })}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
              }}
            >
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
              <div style={{ fontSize: '1.12rem', fontWeight: 900, color: item.accent }}>
                {item.value}
              </div>
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
        minHeight: 'var(--app-min-height)',
        background: `${GRAD_AURORA}, radial-gradient(circle at 16% 14%, ${C.cyanDim}, transparent 20%), radial-gradient(circle at 84% 18%, ${C.goldDim}, transparent 22%), ${C.bg}`,
        color: C.text,
        fontFamily: F,
        padding: isMobile ? '18px 12px 48px' : '24px 16px 64px',
      }}
    >
      <div style={{ maxWidth: 1460, margin: '0 auto', display: 'grid', gap: 18 }}>
        <section style={panelStyle({ padding: isMobile ? 16 : 20, borderRadius: R['3xl'] })}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle at 18% 12%, ${C.cyanDim}, transparent 18%), radial-gradient(circle at 84% 20%, ${C.goldDim}, transparent 16%)`,
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
                {eyebrow(tx('mobilityOSCore.eyebrow'))}
                <h1
                  style={{
                    margin: 0,
                    fontSize: isMobile ? '2rem' : 'clamp(2.4rem, 4vw, 3.6rem)',
                    lineHeight: 0.94,
                    letterSpacing: '-0.05em',
                    maxWidth: 520,
                  }}
                >
                  {tx('mobilityOSCore.corridor_capacity_exchange_for_jordan')}
                </h1>
                <div style={{ color: C.textSub, fontSize: '0.96rem', lineHeight: 1.6 }}>
                  {tx('mobilityOSCore.map_first_ride_and_cargo_orchestration')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {chip(tx('mobilityOSCore.runtime_label'), runtimeModeLabel, runtimeAccent)}
                {chip(
                  tx('mobilityOSCore.hottest_label'),
                  snapshot.metrics.hottest_corridor
                    ? localizedCorridorLabel(snapshot.metrics.hottest_corridor)
                    : tx('mobilityOSCore.quiet_label'),
                )}
                {chip(tx('mobilityOSCore.updated_label'), shortTime(snapshot.updated_at))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 14,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                {commandSignals.map(signal => (
                  <article
                    key={signal.label}
                    style={{
                      ...panelStyle({
                        padding: 16,
                        borderRadius: R.xxl,
                        background: `linear-gradient(145deg, ${C.card}, ${C.elevated})`,
                        boxShadow: SH.card,
                      }),
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.66rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {signal.label}
                        </div>
                        <div
                          style={{
                            marginTop: 7,
                            fontWeight: 900,
                            fontSize:
                              signal.label === tx('mobilityOSCore.pressure_lane_label')
                                ? '0.98rem'
                                : '1.18rem',
                            color: signal.accent,
                            lineHeight: 1.15,
                          }}
                        >
                          {signal.value}
                        </div>
                        <div style={{ marginTop: 7, color: C.textMuted, fontSize: '0.76rem' }}>
                          {signal.detail}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: R.lg,
                          border: `1px solid ${signal.accent}30`,
                          background: `${signal.accent}14`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <signal.icon size={16} color={signal.accent} />
                      </div>
                    </div>
                  </article>
                ))}
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
                  background: C.elevated,
                }}
              >
                <Zap size={14} color={C.cyan} />
                {tx('mobilityOSCore.pressure_pricing_availability')}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: R.full,
                  border: `1px solid ${C.border}`,
                  background: C.elevated,
                }}
              >
                <Activity size={14} color={C.green} />
                {tx('mobilityOSCore.one_surface_live_map_live_booking')}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
