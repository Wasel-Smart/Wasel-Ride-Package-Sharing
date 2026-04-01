import { motion } from 'motion/react';
import {
  Brain,
  CheckCircle2,
  Clock,
  Package,
  Star,
  Users,
} from 'lucide-react';
import { DS, pill, r } from '../../../pages/waselServiceShared';
import { getCorridorOpportunity } from '../../../config/wasel-movement-network';
import {
  createGenderMeta,
  type Ride,
} from '../../../pages/waselCoreRideData';

const GENDER_META = createGenderMeta(DS);

type FindRideCardProps = {
  ride: Ride;
  idx: number;
  booked?: boolean;
  onOpen: () => void;
};

export function FindRideCard({
  ride,
  idx,
  booked = false,
  onOpen,
}: FindRideCardProps) {
  const genderMeta = GENDER_META[ride.genderPref];
  const soldOut = ride.seatsAvailable <= 0;
  const corridorPlan = getCorridorOpportunity(ride.from, ride.to);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 380, damping: 28 }}
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,200,232,0.12)' }}
      onClick={onOpen}
      style={{
        background: DS.card,
        borderRadius: r(20),
        border: `1px solid ${DS.border}`,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = DS.borderH;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = DS.border;
      }}
    >
      <div style={{ height: 2, background: DS.gradC }} />
      <div className="sp-ride-card-body" style={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: r(12),
                  background: DS.gradC,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              >
                {ride.driver.avatar}
              </div>
              {ride.driver.verified && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: DS.cyan,
                    border: `2px solid ${DS.card}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={9} color="#fff" />
                </div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>
                  {ride.driver.name}
                </span>
                {ride.driver.verified && (
                  <span style={{ ...pill(DS.green), fontSize: '0.58rem' }}>Verified</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Star size={11} fill="#F59E0B" color="#F59E0B" />
                <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.75rem' }}>
                  {ride.driver.rating}
                </span>
                <span style={{ color: DS.muted, fontSize: '0.72rem' }}>
                  | {ride.driver.trips} trips
                </span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: DS.cyan, fontWeight: 900, fontSize: '1.7rem', lineHeight: 1 }}>
              {ride.pricePerSeat}
            </div>
            <div style={{ color: DS.muted, fontSize: '0.62rem', fontWeight: 600, marginTop: 2 }}>
              JOD/seat
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            borderRadius: r(14),
            padding: '14px 18px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>{ride.from}</div>
            <div style={{ color: DS.muted, fontSize: '0.7rem', marginTop: 1 }}>
              <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
              {ride.time}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: DS.green,
                boxShadow: `0 0 8px ${DS.green}60`,
              }}
            />
            <div style={{ width: 1, height: 22, background: `linear-gradient(180deg,${DS.green},${DS.cyan})` }} />
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: DS.cyan,
                boxShadow: `0 0 8px ${DS.cyan}60`,
              }}
            />
            <span style={{ color: DS.muted, fontSize: '0.62rem', fontWeight: 600, marginTop: 2 }}>
              {ride.duration}
            </span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>{ride.to}</div>
            <div style={{ color: DS.muted, fontSize: '0.7rem', marginTop: 1 }}>{ride.distance} km</div>
          </div>
        </div>

        {corridorPlan && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: r(14),
              padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(0,200,232,0.08), rgba(255,255,255,0.03))',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Brain size={14} color={DS.cyan} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>Wasel Brain</span>
            </div>
            <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.6 }}>
              {corridorPlan.savingsPercent}% cheaper than solo movement on {corridorPlan.label}. Best pickup: {corridorPlan.pickupPoints[0]}.
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={pill(soldOut ? DS.gold : DS.cyan)}>
              <Users size={9} /> {soldOut ? 'Sold out' : `${ride.seatsAvailable} seats`}
            </span>
            <span style={pill(genderMeta.color)}>
              {genderMeta.emoji} {genderMeta.label}
            </span>
            {ride.prayerStops && <span style={pill(DS.gold)}>Prayer</span>}
            {ride.pkgCapacity !== 'none' && (
              <span style={pill(DS.gold)}>
                <Package size={9} /> {ride.pkgCapacity}
              </span>
            )}
            {corridorPlan && <span style={pill(DS.green)}>Demand {corridorPlan.predictedDemandScore}</span>}
            {booked && (
              <span style={pill(DS.green)}>
                <CheckCircle2 size={9} /> Booked
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ color: booked ? DS.green : soldOut ? DS.gold : DS.muted, fontSize: '0.75rem' }}>
              {booked ? 'Reserved' : soldOut ? 'Bus fallback available' : 'View details'}
            </span>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              className="sp-book-btn"
              disabled={booked || soldOut}
              style={{
                height: 44,
                padding: '0 18px',
                borderRadius: '99px',
                border: 'none',
                background: booked
                  ? DS.gradG
                  : soldOut
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))'
                    : DS.gradC,
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.82rem',
                boxShadow: `0 4px 16px ${booked ? DS.green : soldOut ? 'rgba(255,255,255,0.14)' : DS.cyan}30`,
                cursor: booked || soldOut ? 'not-allowed' : 'pointer',
                opacity: booked || soldOut ? 0.88 : 1,
              }}
            >
              {booked ? 'Booked' : soldOut ? 'Sold out' : 'Book seat'}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
