import { CheckCircle2 } from 'lucide-react';
import { C, SH } from '../../../utils/wasel-ds';
import { DS, r } from '../../shared/pageShared';
import { tx } from '../../../locales/tx';

export function BookingCompleteBanner({
  bookingSource,
  bookingTicketCode,
  passengers,
  departureLabel,
  activeBus,
  ar,
  onOpenSupport,
}: {
  bookingSource: 'server' | 'local' | null;
  bookingTicketCode: string | null;
  passengers: number;
  departureLabel: string;
  activeBus: { from: string; to: string };
  ar: boolean;
  onOpenSupport: () => void;
}) {
  return (
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
      <div style={{ color: C.text, fontSize: '0.86rem', lineHeight: 1.5 }}>
        {passengers} {tx('busPage.seat')}
        {ar ? ' محجوزة لـ ' : passengers > 1 ? 's are reserved for ' : ' is reserved for '}
        {departureLabel}
        {tx('busPage.ticket_code')}
        {bookingTicketCode ?? 'pending'} {tx('busPage.was_saved_for_the')}
        {activeBus.from} {tx('busPage.to_6')}
        {activeBus.to}{' '}
        {tx('busPage.corridor_saved_in_your_account_with_departure_reminders')}
        {bookingSource === 'local'
          ? ' Secure confirmation will sync when the booking backend reconnects.'
          : ''}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <button
          type="button"
          onClick={onOpenSupport}
          style={{
            height: 38,
            padding: '0 14px',
            borderRadius: '99px',
            border: `1px solid ${DS.border}`,
            background: DS.card2,
            color: C.text,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {tx('busPage.open_support')}
        </button>
      </div>
    </div>
  );
}

export function BookingSummary({
  activeBus,
  passengers,
  totalPrice,
  scheduleMode,
  tripDate,
  today,
  seatPreference,
  setSeatPreference,
  departureTimes,
  selectedDeparture,
  setSelectedDeparture,
  bookingDisabled,
  onBookingComplete,
}: {
  activeBus: {
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
  passengers: number;
  totalPrice: number;
  scheduleMode: 'depart-now' | 'schedule-later';
  tripDate: string;
  today: string;
  seatPreference: 'window' | 'aisle' | 'front-zone';
  setSeatPreference: (v: 'window' | 'aisle' | 'front-zone') => void;
  departureTimes: string[];
  selectedDeparture: string;
  setSelectedDeparture: (v: string) => void;
  bookingDisabled: boolean;
  onBookingComplete: () => void;
}) {

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
            <div style={{ color: C.text, fontWeight: 900, fontSize: '1.15rem' }}>
              Reserve your seat
            </div>
            <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 4 }}>
              {activeBus.from} to {activeBus.to} - {activeBus.company} - {activeBus.serviceLevel ?? 'Standard'}
            </div>
          </div>
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
            Departure plan
          </div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem' }}>
            {selectedDeparture}
          </div>
          <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 4 }}>
            Board at {activeBus.pickupPoint} and arrive at {activeBus.dropoffPoint}.
          </div>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              color: DS.sub,
              fontSize: '0.76rem',
              marginBottom: 8,
            }}
          >
            Departure time
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {departureTimes.map(time => (
              <button
                key={time}
                type="button"
                onClick={() => {
                  setSelectedDeparture(time);
                  onBookingComplete();
                }}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: '99px',
                  border: `1px solid ${selectedDeparture === time ? (activeBus.color ?? DS.cyan) : DS.border}`,
                  background:
                    selectedDeparture === time
                      ? `${activeBus.color ?? DS.cyan}18`
                      : DS.card2,
                  color: C.text,
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
              color: C.text,
              fontSize: '0.84rem',
              lineHeight: 1.5,
            }}
          >
            This coach is full right now. Pick another departure below.
          </div>
        )}
        {scheduleMode === 'schedule-later' && (
          <input
            type="date"
            min={today}
            defaultValue={tripDate}
            style={{
              width: '100%',
              height: 46,
              borderRadius: r(14),
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: C.text,
              padding: '0 14px',
              fontFamily: DS.F,
            }}
          />
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
              Passengers
            </label>
            <div
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
                type="button"
                style={{
                  width: 42,
                  height: 46,
                  border: 'none',
                  background: 'transparent',
                  color: C.text,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                }}
              >
                -
              </button>
              <div style={{ flex: 1, textAlign: 'center', color: C.text, fontWeight: 800 }}>
                {passengers}
              </div>
              <button
                type="button"
                style={{
                  width: 42,
                  height: 46,
                  border: 'none',
                  background: 'transparent',
                  color: C.text,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                color: DS.sub,
                fontSize: '0.76rem',
                marginBottom: 8,
              }}
            >
              Seat preference
            </label>
            <select
              value={seatPreference}
              onChange={event => setSeatPreference(event.target.value as typeof seatPreference)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: r(14),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                padding: '0 14px',
                fontFamily: DS.F,
              }}
            >
              <option value="window">Window</option>
              <option value="aisle">Aisle</option>
              <option value="front-zone">Front zone</option>
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
            { label: 'Seat fare', value: `${activeBus.price} JOD × ${passengers}` },
            {
              label: 'Schedule days',
              value: activeBus.scheduleDays ?? activeBus.frequency,
            },
            { label: 'Available', value: `${activeBus.seats} seats` },
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
              <span style={{ color: C.text, fontWeight: 700 }}>{row.value}</span>
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
            <span style={{ color: C.text, fontWeight: 800 }}>Total</span>
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
          disabled={bookingDisabled}
          type="button"
          style={{
            width: '100%',
            height: 52,
            borderRadius: r(16),
            border: 'none',
            background: bookingDisabled
              ? C.elevated
              : `linear-gradient(135deg,${activeBus.color ?? DS.cyan},${DS.blue})`,
            color: C.text,
            fontWeight: 900,
            fontFamily: DS.F,
            cursor: bookingDisabled ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            opacity: bookingDisabled ? 0.72 : 1,
            boxShadow: SH.card,
          }}
        >
          Reserve seat
        </button>
      </div>
    </div>
  );
}
