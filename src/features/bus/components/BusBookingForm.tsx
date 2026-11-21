import { useMemo } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { BusRoute } from '../../../services/bus';
import { SH  } from '../../../utils/wasel-ds';
import { DS, r } from '../../shared/pageShared';
import { tx } from '../../../locales/tx';

export function BusBookingForm({
  activeBus,
  scheduleMode,
  setScheduleMode,
  selectedDeparture,
  setSelectedDeparture,
  departureTimes,
  passengers,
  setPassengers,
  seatPreference,
  setSeatPreference,
  tripDate,
  setTripDate,
  today,
  totalPrice,
  bookingDisabled,
  bookingBusy,
  bookingComplete,
  bookingTicketCode,
  bookingSource,
  handleBusBooking,
  openBusSupport,
  ar,
}: {
  activeBus: BusRoute & {
    from: string;
    to: string;
    company: string;
    serviceLevel?: string;
    price: number;
    scheduleDays?: string;
    frequency?: string;
    seats: number;
    color?: string;
    pickupPoint: string;
    dropoffPoint: string;
    dep: string;
    arr: string;
  };
  scheduleMode: 'depart-now' | 'schedule-later';
  setScheduleMode: (mode: 'depart-now' | 'schedule-later') => void;
  selectedDeparture: string;
  setSelectedDeparture: (time: string) => void;
  departureTimes: string[];
  passengers: number;
  setPassengers: (updater: (value: number) => number) => void;
  seatPreference: 'window' | 'aisle' | 'front-zone';
  setSeatPreference: (v: 'window' | 'aisle' | 'front-zone') => void;
  tripDate: string;
  setTripDate: (date: string) => void;
  today: string;
  totalPrice: number;
  bookingDisabled: boolean;
  bookingBusy: boolean;
  bookingComplete: boolean;
  bookingTicketCode: string | null;
  bookingSource: 'server' | 'local' | null;
  handleBusBooking: () => void;
  openBusSupport: () => void;
  ar: boolean;
}) {
  const seatOptions = useMemo(() => [
    { value: 'window', label: tx('busPage.window') },
    { value: 'aisle', label: tx('busPage.aisle') },
    { value: 'front-zone', label: tx('busPage.front_zone') },
  ], [ar]);

  return (
    <div
      style={{
        background: DS.card,
        border: `1px solid ${activeBus.color ?? DS.cyan}30`,
        borderRadius: r(22),
        overflow: 'hidden',
        boxShadow: `0 16px 42px ${activeBus.color ?? DS.cyan}10`,
      }}
    >
      <div
        style={{
          padding: '22px 22px 18px',
          background: `linear-gradient(135deg, ${DS.navy}, ${activeBus.color ?? DS.cyan}22)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ color: 'var(--foreground)', fontWeight: 900, fontSize: '1.15rem' }}>
              {tx('busPage.reserve_your_seat')}
            </div>
            <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 4 }}>
              {activeBus.from} {tx('busPage.to_5')}
              {activeBus.to} - {activeBus.company} - {activeBus.serviceLevel ?? 'Standard'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['depart-now', 'schedule-later'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setScheduleMode(mode);
              }}
              type="button"
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: '99px',
                border: 'none',
                cursor: 'pointer',
                background:
                  scheduleMode === mode
                    ? mode === 'depart-now'
                      ? DS.gradC
                      : DS.gradG
                    : 'var(--secondary)',
                color: 'var(--foreground)',
                fontWeight: 700,
              }}
            >
              {mode === 'depart-now' ? tx('busPage.depart_now') : tx('busPage.book_later')}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: DS.card2,
            border: `1px solid ${DS.border}`,
            borderRadius: r(16),
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              color: DS.muted,
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: 0,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {tx('busPage.departure_plan_2')}
          </div>
          <div style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: '0.95rem' }}>
            {selectedDeparture}
          </div>
          <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 4 }}>
            {tx('busPage.board_at')}
            {activeBus.pickupPoint} {tx('busPage.arrive_at')}
            {activeBus.dropoffPoint}.
          </div>
        </div>
        <div>
          <label
            id="bus-departure-time-label"
            style={{
              display: 'block',
              color: DS.sub,
              fontSize: '0.76rem',
              marginBottom: 8,
            }}
          >
            {tx('busPage.departure_time')}
          </label>
          <div role="group" aria-labelledby="bus-departure-time-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {departureTimes.map(time => (
              <button
                key={time}
                type="button"
                aria-pressed={selectedDeparture === time}
                onClick={() => { void setSelectedDeparture(time); }}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: '99px',
                  border: `1px solid ${selectedDeparture === time ? (activeBus.color ?? DS.cyan) : DS.border}`,
                  background:
                    selectedDeparture === time
                      ? `${activeBus.color ?? DS.cyan}18`
                      : DS.card2,
                  color: 'var(--foreground)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
        {activeBus.seats === 0 && (
          <div
            style={{
              background: C.goldDim,
              border: `1px solid ${C.goldDim}`,
              borderRadius: r(16),
              padding: '14px 16px',
              color: 'var(--foreground)',
              fontSize: '0.84rem',
              lineHeight: 1.5,
            }}
          >
            {tx(
              'busPage.this_coach_is_full_right_now_switch_routes_and_keep_the_same_corridor_filters',
            )}
          </div>
        )}
        {scheduleMode === 'schedule-later' && (
          <div>
            <label
              htmlFor="bus-booking-date"
              style={{
                display: 'block',
                color: DS.sub,
                fontSize: '0.76rem',
                marginBottom: 8,
              }}
            >
              {tx('busPage.booking_date')}
            </label>
            <input
              id="bus-booking-date"
              type="date"
              min={today}
              value={tripDate}
              onChange={event => setTripDate(event.target.value)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: r(14),
                border: `1px ${DS.border}`,
                background: DS.card2,
                color: 'var(--foreground)',
                padding: '0 14px',
                fontFamily: DS.F,
              }}
            />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label
              style={{
                display: 'block',
                color: DS.sub,
                fontSize: '0.76rem',
                marginBottom: 8,
              }}
            >
              {tx('trips.passengers')}
            </label>
            <div
              role="group"
              aria-label={tx('trips.passengers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: DS.card2,
                border: `1px solid ${DS.border}`,
                borderRadius: r(14),
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setPassengers(value => Math.max(1, value - 1))}
                type="button"
                aria-label={ar ? 'تقليل عدد الركاب' : 'Decrease passenger count'}
                disabled={passengers <= 1}
                style={{
                  width: 42,
                  height: 46,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                }}
              >
                -
              </button>
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--foreground)', fontWeight: 800 }}>
                <output aria-live="polite">{passengers}</output>
              </div>
              <button
                onClick={() => {
                  if (activeBus.seats > 0) {
                    setPassengers(value => Math.min(activeBus.seats, value + 1));
                  }
                }}
                type="button"
                aria-label={ar ? 'زيادة عدد الركاب' : 'Increase passenger count'}
                disabled={activeBus.seats === 0 || passengers >= activeBus.seats}
                style={{
                  width: 42,
                  height: 46,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  fontSize: '1.1rem',
                  cursor:
                    activeBus.seats === 0 || passengers >= activeBus.seats
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    activeBus.seats === 0 || passengers >= activeBus.seats ? 0.45 : 1,
                }}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="bus-seat-preference"
              style={{
                display: 'block',
                color: DS.sub,
                fontSize: '0.76rem',
                marginBottom: 8,
              }}
            >
              {tx('busPage.seat_preference')}
            </label>
            <select
              id="bus-seat-preference"
              value={seatPreference}
              onChange={event => {
                setSeatPreference(event.target.value as typeof seatPreference);
              }}
              style={{
                width: '100%',
                height: 46,
                borderRadius: r(14),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: 'var(--foreground)',
                padding: '0 14px',
                fontFamily: DS.F,
              }}
            >
              {seatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          style={{
            background: `linear-gradient(135deg, ${C.cyanDim}, ${C.goldDim})`,
            border: `1px solid ${DS.border}`,
            borderRadius: r(16),
            padding: '16px 16px 14px',
            boxShadow: SH.card,
          }}
        >
          {[
            { label: tx('busPage.seat_fare'), value: `${activeBus.price} JOD × ${passengers}` },
            {
              label: tx('busPage.schedule_days'),
              value: activeBus.scheduleDays ?? activeBus.frequency ?? '—',
            },
            {
              label: tx('busPage.available_on_this_coach'),
              value: tx('busPage.seats_count', { count: activeBus.seats }),
            },
          ].map(row => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span style={{ color: DS.sub, fontSize: '0.78rem' }}>{row.label}</span>
              <span style={{ color: 'var(--foreground)', fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              paddingTop: 10,
              borderTop: `1px solid ${DS.border}`,
            }}
          >
            <span style={{ color: 'var(--foreground)', fontWeight: 800 }}>{tx('common.total')}</span>
            <span
              style={{
                color: activeBus.color ?? DS.cyan,
                fontWeight: 900,
                fontSize: '1.2rem',
              }}
            >
              {totalPrice} JOD
            </span>
          </div>
        </div>
        <button
          data-testid="bus-confirm-booking"
          onClick={() => { void handleBusBooking(); }}
          disabled={bookingDisabled}
          type="button"
          style={{
            width: '100%',
            height: 52,
            borderRadius: r(16),
            border: 'none',
            background: bookingDisabled
              ? 'var(--secondary)'
              : `linear-gradient(135deg,${activeBus.color ?? DS.cyan},${DS.blue})`,
            color: 'var(--foreground)',
            fontWeight: 900,
            fontFamily: DS.F,
            cursor: bookingDisabled ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            opacity: bookingDisabled ? 0.72 : 1,
            boxShadow: SH.card,
          }}
        >
          {bookingBusy
            ? tx('busPage.reserving_seat')
            : activeBus.seats === 0
              ? tx('busPage.try_another_departure')
              : tx('busPage.reserve_seat')}
        </button>
        <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.55 }}>
          {activeBus.seats === 0
            ? tx('busPage.pick_another_departure_same_corridor')
            : tx('busPage.seat_boarding_stop_and_alerts_stay_linked')}
        </div>
        {activeBus.sourceUrl && (
          <a
            href={activeBus.sourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: DS.cyan,
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} />
            {tx('busPage.official_schedule_verified')}
            {activeBus.lastVerifiedAt}
          </a>
        )}
        {bookingComplete && (
          <div
            style={{
              background: C.greenDim,
              border: `1px solid ${C.greenDim}`,
              borderRadius: r(16),
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: DS.green,
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              <CheckCircle2 size={16} />
              {tx('busPage.seat_confirmed')}
            </div>
            <div style={{ color: 'var(--foreground)', fontSize: '0.86rem', lineHeight: 1.5 }}>
              {passengers} {tx('busPage.seat')}
              {tx('busPage.reserved_for')}
              {selectedDeparture}
              {tx('busPage.ticket_code')}
              {bookingTicketCode ?? tx('busPage.pending')} {tx('busPage.was_saved_for_the')}
              {activeBus.from} {tx('busPage.to_6')}
              {activeBus.to}{' '}
              {tx('busPage.corridor_saved_in_your_account_with_departure_reminders')}
              {bookingSource === 'local' ? tx('busPage.secure_confirmation_pending') : ''}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => { void openBusSupport(); }}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: '99px',
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: 'var(--foreground)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tx('busPage.open_support')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

