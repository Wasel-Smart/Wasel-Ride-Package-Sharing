import { ArrowDownRight, ArrowUpRight, MoveRight } from 'lucide-react';
import { C, FM, R, SH } from '../../utils/wasel-ds';
import type { CorridorProjection, PriceDirection } from './model';

function money(value: number): string {
  return `${value.toFixed(2)} JOD`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function directionIcon(direction: PriceDirection) {
  if (direction === 'up') return <ArrowUpRight size={14} />;
  if (direction === 'down') return <ArrowDownRight size={14} />;
  return <MoveRight size={14} />;
}

function directionColor(direction: PriceDirection): string {
  if (direction === 'up') return C.gold;
  if (direction === 'down') return C.green;
  return C.textMuted;
}

export interface CorridorCardProps {
  projection: CorridorProjection;
  selected: boolean;
  onSelect: () => void;
}

export function CorridorCard({ projection, selected, onSelect }: CorridorCardProps) {
  const seatDirection = directionColor(projection.seat_price_direction);
  const cargoDirection = directionColor(projection.cargo_price_direction);

  return (
    <button
      data-testid={`mobility-os-corridor-${projection.corridor.id}`}
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 24,
        border: `1px solid ${selected ? C.cyan : C.border}`,
        background: selected
          ? 'linear-gradient(180deg, rgba(88,221,255,0.1), rgba(8,22,35,0.96))'
          : 'linear-gradient(180deg, rgba(11,29,45,0.94), rgba(6,19,31,0.98))',
        boxShadow: selected ? SH.cyanL : SH.card,
        padding: 18,
        color: C.text,
        cursor: 'pointer',
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.74rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textMuted }}>
            Corridor Instrument
          </div>
          <div style={{ marginTop: 6, fontSize: '1.08rem', fontWeight: 900 }}>
            {projection.corridor.origin} <span style={{ color: C.textMuted }}>{'->'}</span> {projection.corridor.destination}
          </div>
          <div style={{ marginTop: 5, color: C.textMuted, fontSize: '0.8rem' }}>
            {projection.corridor.distance_km} km / {projection.corridor.travel_time_min} min
          </div>
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: R.full,
            border: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.03)',
            fontFamily: FM,
            fontSize: '0.74rem',
            color: C.cyan,
          }}
        >
          {projection.corridor.id}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {[
          ['Seats Available', String(projection.seats_available)],
          ['Cargo Available', `${projection.cargo_available_kg} kg`],
          ['Utilization', percent(projection.utilization)],
          ['Demand Pressure', projection.demand_pressure.toFixed(2)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              borderRadius: 16,
              border: `1px solid ${C.borderFaint}`,
              background: 'rgba(255,255,255,0.03)',
              padding: '12px 12px 10px',
            }}
          >
            <div style={{ color: C.textMuted, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {label}
            </div>
            <div style={{ marginTop: 6, fontSize: '0.98rem', fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${C.goldDim}`,
            background: 'rgba(255,190,92,0.08)',
            padding: '12px 13px',
          }}
        >
          <div style={{ color: C.textMuted, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Dynamic Seat Price
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: C.gold }}>
            {money(projection.dynamic_seat_price)}
            <span style={{ display: 'inline-flex', alignItems: 'center', color: seatDirection }}>
              {directionIcon(projection.seat_price_direction)}
            </span>
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
          <div style={{ color: C.textMuted, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Dynamic Cargo Price
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: C.green }}>
            {money(projection.dynamic_cargo_price)}
            <span style={{ display: 'inline-flex', alignItems: 'center', color: cargoDirection }}>
              {directionIcon(projection.cargo_price_direction)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
