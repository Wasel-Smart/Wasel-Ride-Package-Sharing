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
          padding: 24,
          display: 'grid',
          gap: 20,
          border: `1px solid ${recommended ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)'}`,
          background: recommended
            ? 'linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0.02) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          borderRadius: 24,
          boxShadow: recommended
            ? '0 12px 40px -12px rgba(6,182,212,0.15)'
            : '0 8px 32px -8px rgba(0,0,0,0.2)',
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
          <div style={{ display: 'grid', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {recommended ? (
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: 99,
                    background: 'rgba(6,182,212,0.15)',
                    border: '1px solid rgba(6,182,212,0.3)',
                    color: '#06b6d4',
                    fontFamily: LANDING_FONT,
                    fontSize: '0.72rem',
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
                    padding: '6px 14px',
                    borderRadius: 99,
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10b981',
                    fontFamily: LANDING_FONT,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
                  color: '#fff',
                  fontFamily: LANDING_FONT,
                  fontSize: '1.2rem',
                  fontWeight: 900,
                }}
              >
                {ride.from}
              </span>
              <ArrowRight size={18} color="#06b6d4" />
              <span
                style={{
                  color: '#fff',
                  fontFamily: LANDING_FONT,
                  fontSize: '1.2rem',
                  fontWeight: 900,
                }}
              >
                {ride.to}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: LANDING_FONT,
                  fontSize: '0.85rem',
                }}
              >
                <Clock3 size={14} />
                {ride.time}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: LANDING_FONT,
                  fontSize: '0.85rem',
                }}
              >
                {ride.estimatedArrivalLabel}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'grid', gap: 6 }}>
            <div
              style={{
                color: '#06b6d4',
                fontFamily: LANDING_FONT,
                fontSize: '2rem',
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {ride.pricePerSeat}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  marginLeft: 2,
                }}
              >
                JOD
              </span>
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontFamily: LANDING_FONT,
                fontSize: '0.72rem',
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
            gridTemplateColumns: 'repeat(4, 1fr)',
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
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                padding: '14px 16px',
                display: 'grid',
                gap: 8,
              }}
            >
              <item.icon size={16} color="#06b6d4" />
              <div
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: LANDING_FONT,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: '#fff',
                  fontFamily: LANDING_FONT,
                  fontSize: '0.9rem',
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
          <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 200 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#fff',
                fontFamily: LANDING_FONT,
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              <ShieldCheck size={18} color="#10b981" />
              {ride.driver.name}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontFamily: LANDING_FONT,
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
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
              minWidth: 160,
              minHeight: 52,
              borderRadius: 16,
              border: 'none',
              background: requesting
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: requesting ? 'rgba(255,255,255,0.5)' : '#fff',
              fontFamily: LANDING_FONT,
              fontSize: '0.95rem',
              fontWeight: 900,
              cursor: requesting ? 'progress' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: requesting ? 'none' : '0 8px 25px -5px rgba(6,182,212,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {requesting ? copy.requestingButton : copy.requestButton}
          </button>
        </div>
      </article>
    </motion.div>
  );
}
