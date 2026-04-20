import { ArrowRight, CarFront, Clock3, ShieldCheck, Star, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { LANDING_COLORS, landingPanel } from '../../features/home/landing/landingTypes';
import { LANDING_FONT } from '../../features/home/landingConstants';
import type { RideBookingRecord } from '../../services/rideLifecycle';
import type { RideResult } from '../../modules/rides/ride.types';

export interface RideCardCopy {
  recommendedLabel: string;
  confirmedLabel: string;
  matchingLabel: string;
  priceEstimateLabel: string;
  requestButton: string;
  requestingButton: string;
  defaultReason: string;
  etaLabel: string;
  vehicleLabel: string;
  ratingLabel: string;
  seatsLabel: string;
  seatsOpenSuffix: string;
}

interface RideCardProps {
  ride: RideResult;
  recommended: boolean;
  booking?: RideBookingRecord | null;
  requesting: boolean;
  copy: RideCardCopy;
  onRequest: (ride: RideResult) => void;
}

export function RideCard({
  ride,
  recommended,
  booking,
  requesting,
  copy,
  onRequest,
}: RideCardProps) {
  const statusLabel =
    booking?.status === 'confirmed'
      ? copy.confirmedLabel
      : booking?.status === 'pending_driver'
        ? copy.matchingLabel
        : null;

  return (
    <motion.div layout whileHover={{ y: -4, scale: 1.005 }} whileTap={{ scale: 0.995 }}>
      <article
        className="wasel-lift-card"
        style={{
          ...landingPanel(28),
          padding: 22,
          display: 'grid',
          gap: 18,
          border: `1px solid ${recommended ? 'rgba(32,216,255,0.34)' : LANDING_COLORS.border}`,
          background: recommended ? 'rgba(255,255,255,0.08)' : 'var(--wasel-panel-strong)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {recommended ? (
                <span
                  style={{
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'rgba(32,216,255,0.12)',
                    border: '1px solid rgba(32,216,255,0.22)',
                    color: LANDING_COLORS.cyan,
                    fontFamily: LANDING_FONT,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {copy.recommendedLabel}
                </span>
              ) : null}
              {statusLabel ? (
                <span
                  style={{
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'rgba(114,255,71,0.12)',
                    border: '1px solid rgba(114,255,71,0.18)',
                    color: LANDING_COLORS.green,
                    fontFamily: LANDING_FONT,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  color: LANDING_COLORS.text,
                  fontFamily: LANDING_FONT,
                  fontSize: '1.12rem',
                  fontWeight: 900,
                }}
              >
                {ride.from}
              </span>
              <ArrowRight size={16} color={LANDING_COLORS.cyan} />
              <span
                style={{
                  color: LANDING_COLORS.text,
                  fontFamily: LANDING_FONT,
                  fontSize: '1.12rem',
                  fontWeight: 900,
                }}
              >
                {ride.to}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: LANDING_COLORS.muted,
                  fontFamily: LANDING_FONT,
                  fontSize: '0.82rem',
                }}
              >
                <Clock3 size={14} />
                {ride.time}
              </div>
              <span style={{ color: LANDING_COLORS.soft }}>/</span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: LANDING_COLORS.muted,
                  fontFamily: LANDING_FONT,
                  fontSize: '0.82rem',
                }}
              >
                {ride.estimatedArrivalLabel}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'grid', gap: 6 }}>
            <div
              style={{
                color: LANDING_COLORS.cyan,
                fontFamily: LANDING_FONT,
                fontSize: '1.8rem',
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {ride.pricePerSeat}
            </div>
            <div
              style={{
                color: LANDING_COLORS.soft,
                fontFamily: LANDING_FONT,
                fontSize: '0.76rem',
                fontWeight: 700,
              }}
            >
              {copy.priceEstimateLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
            gap: 12,
          }}
        >
          {[
            { icon: Clock3, label: copy.etaLabel, value: `${ride.etaMinutes} min` },
            { icon: CarFront, label: copy.vehicleLabel, value: ride.vehicleType },
            { icon: Star, label: copy.ratingLabel, value: ride.driver.rating.toFixed(1) },
            {
              icon: Users,
              label: copy.seatsLabel,
              value: `${ride.seatsAvailable} ${copy.seatsOpenSuffix}`,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                borderRadius: 20,
                border: `1px solid ${LANDING_COLORS.border}`,
                background: 'rgba(255,255,255,0.05)',
                padding: '14px 16px',
                display: 'grid',
                gap: 8,
              }}
            >
              <item.icon size={16} color={LANDING_COLORS.cyan} />
              <div
                style={{
                  color: LANDING_COLORS.soft,
                  fontFamily: LANDING_FONT,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: LANDING_COLORS.text,
                  fontFamily: LANDING_FONT,
                  fontSize: '0.92rem',
                  fontWeight: 800,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: LANDING_COLORS.text,
                fontFamily: LANDING_FONT,
                fontWeight: 800,
              }}
            >
              <ShieldCheck size={16} color={LANDING_COLORS.green} />
              {ride.driver.name}
            </div>
            <div
              style={{ color: LANDING_COLORS.muted, fontFamily: LANDING_FONT, fontSize: '0.84rem' }}
            >
              {ride.recommendedReason ?? copy.defaultReason}
            </div>
          </div>

          <button
            type="button"
            data-testid={`ride-request-${ride.id}`}
            aria-label={`Request ${ride.from} to ${ride.to}`}
            disabled={requesting}
            onClick={() => onRequest(ride)}
            style={{
              minWidth: 168,
              minHeight: 48,
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.08)',
              background: requesting
                ? 'rgba(255,255,255,0.12)'
                : 'linear-gradient(135deg, #20D8FF 0%, #1388D9 100%)',
              color: '#041521',
              fontFamily: LANDING_FONT,
              fontSize: '0.92rem',
              fontWeight: 900,
              cursor: requesting ? 'progress' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {requesting ? copy.requestingButton : copy.requestButton}
          </button>
        </div>
      </article>
    </motion.div>
  );
}
