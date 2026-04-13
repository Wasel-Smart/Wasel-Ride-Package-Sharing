import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Navigation,
  Phone,
  Star,
  Users,
  X,
} from 'lucide-react';
import { MapWrapper } from '../../../components/MapWrapper';
import { getCorridorOpportunity } from '../../../config/wasel-movement-network';
import {
  DS,
  midpoint,
  pill,
  r,
  resolveCityCoord,
} from '../../../pages/waselServiceShared';
import { getMovementPriceQuote } from '../../../services/movementPricing';
import type { LiveCorridorSignal } from '../../../services/routeDemandIntelligence';
import {
  createGenderMeta,
  type Ride,
} from '../../../pages/waselCoreRideData';

const GENDER_META = createGenderMeta(DS);

type FindRideTripDetailModalProps = {
  ride: Ride;
  booked: boolean;
  pending: boolean;
  signal?: LiveCorridorSignal | null;
  onClose: () => void;
  onBook: () => void;
};

function getConversationMeta(level: Ride['conversationLevel']) {
  switch (level) {
    case 'quiet':
      return { badge: 'Quiet', label: 'Quiet ride' };
    case 'talkative':
      return { badge: 'Social', label: 'Talkative' };
    default:
      return { badge: 'Balanced', label: 'Normal' };
  }
}

export function FindRideTripDetailModal({
  ride,
  booked,
  pending,
  signal = null,
  onClose,
  onBook,
}: FindRideTripDetailModalProps) {
  const soldOut = ride.seatsAvailable <= 0;
  const bookingLocked = booked || pending || soldOut;
  const directContactUnlocked = booked;
  const driverPhoneDigits = ride.driver.phone.replace(/\D/g, '');
  const canContactOnWhatsApp = driverPhoneDigits.length > 0;
  const canCallDriver = ride.driver.phone.trim().length > 0;
  const canEmailDriver = Boolean(ride.driver.email?.trim());
  const riderIntroMessage = `Hi ${ride.driver.name}, I want to ask about your ${ride.from} to ${ride.to} ride on ${ride.date} at ${ride.time}.`;
  const whatsappHref = canContactOnWhatsApp
    ? `https://wa.me/${driverPhoneDigits}?text=${encodeURIComponent(riderIntroMessage)}`
    : '';
  const smsHref = canContactOnWhatsApp
    ? `sms:${ride.driver.phone}?body=${encodeURIComponent(riderIntroMessage)}`
    : '';
  const emailHref = canEmailDriver
    ? `mailto:${ride.driver.email}?subject=${encodeURIComponent(`Ride question: ${ride.from} to ${ride.to}`)}&body=${encodeURIComponent(riderIntroMessage)}`
    : '';
  const conversationMeta = getConversationMeta(ride.conversationLevel);
  const pickupCoord = resolveCityCoord(ride.from);
  const dropoffCoord = resolveCityCoord(ride.to);
  const driverCoord = midpoint(pickupCoord, dropoffCoord);
  const genderMeta = GENDER_META[ride.genderPref];
  const corridorPlan = getCorridorOpportunity(ride.from, ride.to);
  const priceQuote = getMovementPriceQuote({
    basePriceJod: ride.pricePerSeat,
    corridorId: signal?.id,
    forecastDemandScore: signal?.forecastDemandScore,
  });

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'max(16px, env(safe-area-inset-top, 16px)) 16px max(16px, env(safe-area-inset-bottom, 16px))',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(event) => event.stopPropagation()}
          className="sp-ride-modal-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ride-trip-details-title"
          style={{
            background: DS.card,
            border: `1px solid ${DS.border}`,
            borderRadius: r(24),
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <style>{`
            @media (max-width: 640px) {
              .sp-ride-modal-shell {
                max-height: calc(100vh - 24px) !important;
                border-radius: 22px !important;
              }
              .sp-modal-route,
              .sp-modal-price,
              .sp-modal-price-actions {
                flex-direction: column !important;
                align-items: stretch !important;
              }
              .sp-modal-metrics {
                grid-template-columns: 1fr !important;
              }
              .sp-modal-price-copy {
                text-align: left !important;
                max-width: none !important;
              }
            }
          `}</style>
          <div
            style={{
              background: `linear-gradient(135deg, ${DS.navy}, #1a3a6a)`,
              borderRadius: `${r(24)} ${r(24)} 0 0`,
              padding: '24px 28px',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <h2
                id="ride-trip-details-title"
                style={{
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  margin: 0,
                }}
              >
                Trip Details
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="sp-modal-route" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>{ride.from}</div>
                <div style={{ color: DS.cyan, fontSize: '0.75rem' }}>{ride.fromPoint}</div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: `linear-gradient(90deg,${DS.green},${DS.cyan})`,
                    borderRadius: 2,
                  }}
                />
                <span style={{ color: DS.sub, fontSize: '0.72rem' }}>
                  {ride.duration} · {ride.distance} km
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>{ride.to}</div>
                <div style={{ color: DS.cyan, fontSize: '0.75rem' }}>{ride.toPoint}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '24px 28px calc(24px + env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div
              style={{
                background: DS.card2,
                borderRadius: r(16),
                padding: '18px 20px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: r(14),
                    background: DS.gradC,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    color: '#fff',
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  {ride.driver.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>
                      {ride.driver.name}
                    </span>
                    {ride.driver.verified && (
                      <span style={{ ...pill(DS.green), fontSize: '0.6rem' }}>
                        <CheckCircle2 size={9} /> Verified
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Star size={13} fill="#F59E0B" color="#F59E0B" />
                    <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.82rem' }}>
                      {ride.driver.rating}
                    </span>
                    <span style={{ color: DS.muted, fontSize: '0.75rem' }}>
                      · {ride.driver.trips} trips
                    </span>
                  </div>
                </div>
                {directContactUnlocked ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {canCallDriver && (
                      <a
                        href={`tel:${ride.driver.phone}`}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: r(10),
                          background: 'rgba(71,183,230,0.12)',
                          border: '1px solid rgba(71,183,230,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          color: DS.cyan,
                        }}
                      >
                        <Phone size={16} />
                      </a>
                    )}
                    {canContactOnWhatsApp && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: r(10),
                          background: 'rgba(37,211,102,0.12)',
                          border: '1px solid rgba(37,211,102,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          color: '#25D366',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </a>
                    )}
                    {canContactOnWhatsApp && (
                      <a
                        href={smsHref}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: r(10),
                          background: 'rgba(245,158,11,0.12)',
                          border: '1px solid rgba(245,158,11,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          color: '#F59E0B',
                        }}
                      >
                        <MessageSquare size={16} />
                      </a>
                    )}
                    {canEmailDriver && (
                      <a
                        href={emailHref}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: r(10),
                          background: 'rgba(255,255,255,0.08)',
                          border: `1px solid ${DS.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          color: '#fff',
                        }}
                      >
                        <Mail size={16} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      maxWidth: 220,
                      color: DS.sub,
                      fontSize: '0.74rem',
                      lineHeight: 1.55,
                      textAlign: 'right',
                    }}
                  >
                    Direct contact opens after Wasel confirms the booking.
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: r(10),
                }}
              >
                <Car size={14} color={DS.cyan} />
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{ride.car}</span>
              </div>
            </div>

            <div className="sp-modal-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: <Calendar size={14} />, label: 'Date', val: ride.date },
                { icon: <Clock size={14} />, label: 'Departure', val: ride.time },
                { icon: <Users size={14} />, label: 'Seats left', val: `${ride.seatsAvailable} / ${ride.totalSeats}` },
                { icon: <Navigation size={14} />, label: signal ? 'Live demand' : 'Distance', val: signal ? `${signal.forecastDemandScore}/100` : `${ride.distance} km` },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: DS.card2,
                    borderRadius: r(12),
                    padding: '14px 16px',
                    border: `1px solid ${DS.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: DS.cyan }}>{item.icon}</span>
                    <span style={{ color: DS.muted, fontSize: '0.7rem', fontWeight: 600 }}>{item.label}</span>
                  </div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{item.val}</div>
                </div>
                ))}
            </div>

            {signal ? (
              <div
                style={{
                  background: DS.card2,
                  borderRadius: r(16),
                  padding: '16px 18px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>Production route proof</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    `Route ownership score: ${signal.routeOwnershipScore}/100.`,
                    `Next recommended wave: ${signal.nextWaveWindow}. Best pickup point is ${signal.recommendedPickupPoint}.`,
                    signal.productionSources.slice(0, 3).join(' | '),
                  ].map((line) => (
                    <div key={line} style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              style={{
                background: DS.card2,
                borderRadius: r(16),
                padding: '14px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p
                    style={{
                      color: DS.muted,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      margin: '0 0 4px',
                    }}
                  >
                    Route Map
                  </p>
                  <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>
                    A clear preview of pickup, destination, and route direction.
                  </p>
                </div>
                <span style={{ ...pill(DS.cyan), fontSize: '0.72rem' }}>Friendly map preview</span>
              </div>
              <MapWrapper
                mode="live"
                center={midpoint(pickupCoord, dropoffCoord)}
                pickupLocation={pickupCoord}
                dropoffLocation={dropoffCoord}
                driverLocation={driverCoord}
                height={220}
                showMosques={false}
                showRadars={false}
              />
            </div>

            <div>
              <p
                style={{
                  color: DS.muted,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Amenities
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ride.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    style={{ ...pill(DS.cyan), padding: '5px 12px', fontSize: '0.75rem' }}
                  >
                    {amenity}
                  </span>
                ))}
                {ride.prayerStops && (
                  <span style={{ ...pill(DS.gold), padding: '5px 12px', fontSize: '0.75rem' }}>
                    Prayer stops
                  </span>
                )}
                {ride.ramadan && (
                  <span style={{ ...pill('#A78BFA'), padding: '5px 12px', fontSize: '0.75rem' }}>
                    Ramadan-friendly
                  </span>
                )}
                <span style={{ ...pill(genderMeta.color), padding: '5px 12px', fontSize: '0.75rem' }}>
                  {genderMeta.emoji} {genderMeta.label}
                </span>
                <span style={{ ...pill(DS.sub), padding: '5px 12px', fontSize: '0.75rem' }}>
                  {conversationMeta.badge} {conversationMeta.label}
                </span>
              </div>
            </div>

            {ride.intermediateStops && ride.intermediateStops.length > 0 && (
              <div
                style={{
                  background: DS.card2,
                  borderRadius: r(12),
                  padding: '14px 18px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <p
                  style={{
                    color: DS.muted,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Route Stops
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}>{ride.from}</span>
                  {ride.intermediateStops.map((stop) => (
                    <span key={stop} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ChevronRight size={12} color={DS.muted} />
                      <span style={{ color: DS.cyan, fontWeight: 600, fontSize: '0.82rem' }}>{stop}</span>
                    </span>
                  ))}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ChevronRight size={12} color={DS.muted} />
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}>{ride.to}</span>
                  </span>
                </div>
              </div>
            )}

            {ride.reviews && ride.reviews.length > 0 && (
              <div>
                <p
                  style={{
                    color: DS.muted,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  Passenger Reviews
                </p>
                {ride.reviews.map((review, index) => (
                  <div
                    key={`${review.name}-${index}`}
                    style={{
                      background: DS.card2,
                      borderRadius: r(12),
                      padding: '14px 16px',
                      border: `1px solid ${DS.border}`,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                        {review.name}
                      </span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: review.rating }).map((_, starIndex) => (
                          <Star key={starIndex} size={11} fill="#F59E0B" color="#F59E0B" />
                        ))}
                      </div>
                    </div>
                    <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>{review.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div
              className="sp-modal-price"
              style={{
                background: `linear-gradient(135deg, ${DS.navy}, #1a3a6a)`,
                borderRadius: r(16),
                padding: '20px 24px',
                border: `1px solid ${DS.cyan}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div>
                <div style={{ color: DS.sub, fontSize: '0.75rem', marginBottom: 4 }}>Price per seat</div>
                <div style={{ color: DS.cyan, fontWeight: 900, fontSize: '2rem' }}>
                  {priceQuote.finalPriceJod} <span style={{ fontSize: '1rem', fontWeight: 600 }}>JOD</span>
                </div>
                <div style={{ color: DS.muted, fontSize: '0.72rem', marginTop: 2 }}>
                  Base {priceQuote.basePriceJod} JOD | Save {priceQuote.discountJod} JOD
                </div>
                {corridorPlan && (
                  <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                    <div style={{ color: DS.green, fontSize: '0.76rem', fontWeight: 800 }}>
                      {corridorPlan.savingsPercent}% cheaper than solo movement
                    </div>
                    <div style={{ color: DS.sub, fontSize: '0.72rem', lineHeight: 1.55 }}>
                      Solo reference: {corridorPlan.soloReferencePriceJod} JOD | Best pickup: {signal?.recommendedPickupPoint ?? corridorPlan.pickupPoints[0]}
                    </div>
                    <div style={{ color: DS.cyan, fontSize: '0.72rem', lineHeight: 1.55 }}>
                      {priceQuote.explanation}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="sp-modal-price-actions"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  alignItems: 'flex-end',
                  width: '100%',
                }}
              >
                <button
                  onClick={onBook}
                  disabled={bookingLocked}
                  style={{
                    height: 50,
                    padding: '0 32px',
                    borderRadius: '99px',
                    border: 'none',
                    cursor: 'pointer',
                    background: booked
                      ? DS.gradG
                      : pending
                        ? `linear-gradient(135deg, ${DS.gold}, #d97706)`
                      : soldOut
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))'
                        : DS.gradC,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    boxShadow: `0 8px 24px ${booked ? DS.green : pending ? DS.gold : soldOut ? 'rgba(255,255,255,0.14)' : DS.cyan}40`,
                    opacity: bookingLocked ? 0.9 : 1,
                    width: '100%',
                  }}
                >
                  {booked ? 'Seat reserved' : pending ? 'Request pending' : soldOut ? 'Sold out for this departure' : 'Reserve this seat'}
                </button>
                <div
                  className="sp-modal-price-copy"
                  style={{
                    color: DS.sub,
                    fontSize: '0.76rem',
                    lineHeight: 1.55,
                    textAlign: 'right',
                    maxWidth: 320,
                  }}
                >
                  {booked
                    ? 'Your seat is stored in your trips. If the departure shifts, Wasel sends an update before departure.'
                    : pending
                      ? 'Wasel is securing this seat now. Trip details and direct contact unlock as soon as the booking is confirmed.'
                    : soldOut
                      ? 'This departure is full right now. Open bus fallback or try another nearby corridor while this route refreshes.'
                      : 'Your booking saves the seat and boarding details. If the route changes, Wasel updates you and support can help.'}
                </div>
                {directContactUnlocked ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {canContactOnWhatsApp && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...pill('#25D366'),
                          padding: '6px 14px',
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        WhatsApp poster
                      </a>
                    )}
                    {canContactOnWhatsApp && (
                      <a
                        href={smsHref}
                        style={{
                          ...pill(DS.gold),
                          padding: '6px 14px',
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        SMS poster
                      </a>
                    )}
                    {canEmailDriver && (
                      <a
                        href={emailHref}
                        style={{
                          ...pill(DS.sub),
                          padding: '6px 14px',
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Email poster
                      </a>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      color: DS.muted,
                      fontSize: '0.72rem',
                      lineHeight: 1.55,
                      textAlign: 'right',
                    }}
                  >
                    Wasel releases direct driver contact only after the booking is confirmed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
