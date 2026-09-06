import { CheckCircle2, Sparkles } from 'lucide-react';
import { WaselButton } from '../../components/wasel-ui';
import { C } from '../../utils/wasel-ds';
import { DS, pill, r } from '../../pages/waselServiceShared';

export type BookingSuccessState = {
  status: 'pending_driver' | 'confirmed';
  routeLabel: string;
  driverName: string;
  priceJod: number;
  ticketCode?: string;
};

type BookingStatusBannersProps = {
  bookingMessage: string | null;
  bookingSuccess: BookingSuccessState | null;
  retentionMessage: string | null;
  onDismissSuccess: () => void;
  onOpenMyTrips: () => void;
  openMyTripsLabel: string;
  keepBrowsingLabel: string;
};

export function BookingStatusBanners({
  bookingMessage,
  bookingSuccess,
  retentionMessage,
  onDismissSuccess,
  onOpenMyTrips,
  openMyTripsLabel,
  keepBrowsingLabel,
}: BookingStatusBannersProps) {
  return (
    <>
      {bookingMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: C.greenDim,
            border: `1px solid ${C.greenDim}`,
            borderRadius: r(14),
            padding: '12px 14px',
            color: C.text,
            fontSize: '0.84rem',
          }}
        >
          <CheckCircle2 size={16} color={DS.green} />
          <span>{bookingMessage}</span>
        </div>
      )}
      {bookingSuccess && (
        <div
          style={{
            marginTop: 14,
            background: `linear-gradient(135deg, ${C.greenDim}, ${C.cyanDim})`,
            border: `1px solid ${C.greenDim}`,
            borderRadius: r(16),
            padding: '16px 18px',
            display: 'grid',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem' }}>
                {bookingSuccess.status === 'pending_driver'
                  ? 'Request sent'
                  : 'Seat confirmed'}
              </div>
              <div
                style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.6, marginTop: 6 }}
              >
                {bookingSuccess.status === 'pending_driver'
                  ? `${bookingSuccess.routeLabel} is now waiting on ${bookingSuccess.driverName}. Wasel will update My Trips as soon as the driver confirms.`
                  : `${bookingSuccess.routeLabel} is secured at ${bookingSuccess.priceJod} JOD. Boarding details and ticket tracking are now ready in My Trips.`}
              </div>
            </div>
            <span
              style={{
                ...pill(bookingSuccess.status === 'pending_driver' ? DS.gold : DS.green),
                fontSize: '0.72rem',
              }}
            >
              {bookingSuccess.status === 'pending_driver'
                ? `${bookingSuccess.priceJod} JOD pending`
                : `${bookingSuccess.priceJod} JOD confirmed`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <WaselButton onClick={onOpenMyTrips} variant="gold" size="sm">
              {openMyTripsLabel}
            </WaselButton>
            <WaselButton onClick={onDismissSuccess} variant="outline" size="sm">
              {keepBrowsingLabel}
            </WaselButton>
          </div>
          {bookingSuccess.ticketCode ? (
            <div style={{ color: DS.muted, fontSize: '0.74rem' }}>
              Ticket {bookingSuccess.ticketCode}
            </div>
          ) : null}
        </div>
      )}
      {retentionMessage && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: `${DS.cyan}12`,
            border: `1px solid ${DS.cyan}30`,
            borderRadius: r(14),
            padding: '12px 14px',
            color: C.text,
            fontSize: '0.84rem',
          }}
        >
          <Sparkles size={16} color={DS.cyan} />
          <span>{retentionMessage}</span>
        </div>
      )}
    </>
  );
}
