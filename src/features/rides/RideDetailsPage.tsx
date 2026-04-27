import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import {
  ArrowLeft,
  CarFront,
  Clock3,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { MapWrapper } from '../../components/MapWrapper';
import { RideTrustPanel } from '../../components/rides/RideTrustPanel';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { getWaselPresenceProfile } from '../../domains/trust/waselPresence';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import type { RideResult } from '../../modules/rides/ride.types';
import { rideService } from '../../modules/rides/ride.service';
import {
  ClarityBand,
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  SectionHead,
  midpoint,
  pill,
  r,
  resolveCityCoord,
} from '../../pages/waselServiceShared';
import { trackGrowthEvent } from '../../services/growthEngine';
import { getConnectedPackages } from '../../services/journeyLogistics';
import { getBookingsForRide, type RideBookingRecord } from '../../services/rideLifecycle';
import { buildPreferredWhatsAppUrl, hasWhatsAppContact } from '../../utils/whatsapp';

type RideLocationState = {
  ride?: RideResult;
} | null;

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || 'Flexible date';
  }

  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatUpdatedLabel(value?: string) {
  if (!value) {
    return 'Updated just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Updated just now';
  }

  return `Updated ${parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function isBookingActive(booking: RideBookingRecord) {
  return booking.status === 'pending_driver' || booking.status === 'confirmed';
}

export function RideDetailsPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const presenceProfile = useMemo(() => getWaselPresenceProfile(), []);
  const rideId = decodeURIComponent(params.rideId ?? '');
  const initialRide = useMemo(() => {
    const state = location.state as RideLocationState;
    return state?.ride && state.ride.id === rideId ? state.ride : null;
  }, [location.state, rideId]);

  const [ride, setRide] = useState<RideResult | null>(initialRide);
  const [loading, setLoading] = useState(!initialRide);
  const [pageError, setPageError] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<'idle' | 'booking'>('idle');
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!rideId) {
      setPageError('Ride details are unavailable for this trip.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    if (initialRide) {
      setRide(initialRide);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setPageError(null);

    void rideService
      .getRideById(rideId)
      .then(found => {
        if (!active) {
          return;
        }

        if (!found) {
          setPageError('That ride could not be found.');
          return;
        }

        setRide(found);
      })
      .catch(() => {
        if (active) {
          setPageError('That ride could not be loaded right now.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialRide, rideId]);

  const activeBooking = useMemo(
    () => (ride ? rideService.getActiveRideRequest(ride.id) : null),
    [ride],
  );

  const rideBookings = useMemo(() => (ride ? getBookingsForRide(ride.id) : []), [ride]);
  const activeSeatRequests = useMemo(
    () => rideBookings.filter(isBookingActive).length,
    [rideBookings],
  );
  const matchedPackages = useMemo(() => {
    if (!ride?.postedRideId) {
      return [];
    }

    return getConnectedPackages().filter(
      pkg => pkg.matchedRideId === ride.postedRideId && pkg.status !== 'delivered',
    );
  }, [ride?.postedRideId]);

  const pickupCoord = useMemo(
    () => (ride ? resolveCityCoord(ride.from) : resolveCityCoord('Amman')),
    [ride],
  );
  const dropoffCoord = useMemo(
    () => (ride ? resolveCityCoord(ride.to) : resolveCityCoord('Aqaba')),
    [ride],
  );
  const driverCoord = useMemo(() => midpoint(pickupCoord, dropoffCoord), [dropoffCoord, pickupCoord]);

  const driverWhatsAppUrl = useMemo(() => {
    if (!ride) {
      return '';
    }

    return buildPreferredWhatsAppUrl({
      phone: ride.driver.phone,
      message: `Hi ${ride.driver.name}, I am coordinating the Wasel trip from ${ride.from} to ${ride.to} on ${ride.date} at ${ride.time}.`,
      fallbackMessage: `Hi Wasel, I need WhatsApp coordination for the trip from ${ride.from} to ${ride.to}.`,
    });
  }, [ride]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/app/find-ride');
  }, [navigate]);

  const handleSendPackage = useCallback(() => {
    if (!ride) {
      return;
    }

    const searchParams = new URLSearchParams({
      from: ride.from,
      to: ride.to,
    });

    if (ride.postedRideId) {
      searchParams.set('rideId', ride.postedRideId);
    }

    navigate(`/app/packages?${searchParams.toString()}`);
  }, [navigate, ride]);

  const handleBookSeat = useCallback(async () => {
    if (!ride || !user) {
      navigate('/app/auth');
      return;
    }

    setBookingState('booking');
    setPageError(null);
    setBookingMessage(null);

    try {
      const result = await rideService.createRideRequest({
        ride,
        passengerId: user.id,
        passengerName: user.name,
        passengerPhone: user.phone,
        passengerEmail: user.email,
      });

      setBookingMessage(
        result.lifecycleSynced
          ? 'Seat booked. WhatsApp coordination is now the main trip channel.'
          : 'Seat booked. Driver confirmation will appear here when the backend updates it.',
      );
      setRide({ ...ride });

      void trackGrowthEvent({
        userId: user.id,
        eventName: 'ride_request_submitted',
        funnelStage: 'booked',
        serviceType: 'ride',
        from: ride.from,
        to: ride.to,
        valueJod: ride.pricePerSeat,
        metadata: {
          rideId: ride.id,
          source: 'ride_detail_page',
        },
      });
    } catch {
      setPageError('Unable to book the seat right now.');
    } finally {
      setBookingState('idle');
    }
  }, [navigate, ride, user]);

  if (loading) {
    return (
      <Protected>
        <PageShell>
          <SectionHead
            emoji="🧭"
            title="Trip details"
            titleAr="تفاصيل الرحلة"
            sub="Loading the latest trip map, rider details, and seat status."
            color={DS.cyan}
          />
        </PageShell>
      </Protected>
    );
  }

  if (!ride) {
    return (
      <Protected>
        <PageShell>
          <SectionHead
            emoji="🧭"
            title="Trip details"
            titleAr="تفاصيل الرحلة"
            sub="That ride is no longer available."
            color={DS.cyan}
          />
          <div
            style={{
              background: DS.card2,
              borderRadius: r(18),
              padding: '22px 24px',
              border: `1px solid ${DS.border}`,
              color: DS.text,
            }}
          >
            {pageError ?? 'That ride is no longer available.'}
          </div>
        </PageShell>
      </Protected>
    );
  }

  const bookingReady = activeBooking?.status === 'confirmed';
  const bookingPending = activeBooking?.status === 'pending_driver';
  const directWhatsApp = hasWhatsAppContact(ride.driver.phone);
  const supportLine =
    presenceProfile.supportPhoneDisplay || presenceProfile.supportEmail || 'Wasel support';

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="🧭"
          title="Trip details"
          titleAr="تفاصيل الرحلة"
          sub="Map, car, rider, seats, package lane, and WhatsApp-led coordination in one view."
          color={DS.cyan}
          action={{
            label: ar ? 'العودة' : 'Back to results',
            onClick: handleBack,
          }}
        />

        <CoreExperienceBanner
          title={ar ? 'رحلة واحدة، كل التفاصيل واضحة.' : 'One ride, fully navigable.'}
          detail={
            ar
              ? 'افتح الخريطة، السائق، السيارة، المقاعد، وحالة واتساب قبل الحجز أو إرسال طرد.'
              : 'Open the map, rider, car, seat status, and WhatsApp lane before booking a seat or attaching a package.'
          }
          tone={DS.cyan}
        />

        <ClarityBand
          title={ar ? 'الخطوة التالية واضحة.' : 'The next step is obvious.'}
          detail={
            ar
              ? 'واتساب هو القناة الأساسية للتنسيق، مع الحجز وإرسال الطرود من نفس الصفحة.'
              : 'WhatsApp is the primary coordination pipeline, while booking and package sending stay on the same page flow.'
          }
          tone={DS.cyan}
          items={[
            { label: ar ? '1. الخريطة' : '1. Map', value: ar ? 'راجع المسار ونقطة الانطلاق والوصول.' : 'Review the live route, pickup, and dropoff.' },
            { label: ar ? '2. الرحلة' : '2. Ride', value: ar ? 'افتح السائق والسيارة والمقاعد المتاحة.' : 'Open the rider, car, and live seat status.' },
            { label: ar ? '3. واتساب' : '3. WhatsApp', value: ar ? 'ابدأ التنسيق عبر واتساب أو احجز مقعداً أو أرسل طرداً.' : 'Start WhatsApp coordination, book a seat, or send a package.' },
          ]}
        />

        <div
          className="sp-4col"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}
        >
          {[
            {
              label: ar ? 'المغادرة' : 'Departure',
              value: `${formatDateLabel(ride.date)} · ${ride.time}`,
              detail: ar ? 'موعد الانطلاق الحالي' : 'Current departure timing',
              color: DS.cyan,
            },
            {
              label: ar ? 'المقاعد المتاحة' : 'Seats open',
              value: `${ride.seatsAvailable}${ride.totalSeats ? ` / ${ride.totalSeats}` : ''}`,
              detail: ar ? 'المقاعد الحالية على الرحلة' : 'Current seat inventory on this trip',
              color: DS.green,
            },
            {
              label: ar ? 'الطرود النشطة' : 'Live package load',
              value: String(matchedPackages.length),
              detail: ar ? 'طلبات الطرود على نفس الرحلة' : 'Active package requests on this ride',
              color: DS.gold,
            },
            {
              label: ar ? 'آخر تحديث' : 'Latest update',
              value: formatUpdatedLabel(ride.lastUpdatedAt),
              detail: ar ? 'آخر حالة معروضة للرحلة' : 'Most recent ride update shown here',
              color: DS.blue,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: DS.card2,
                borderRadius: r(18),
                padding: '18px 18px 16px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.08rem' }}>{item.value}</div>
              <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.82rem', marginTop: 4 }}>
                {item.label}
              </div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.45 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
          <div
            style={{
              background: DS.card2,
              borderRadius: r(22),
              border: `1px solid ${DS.border}`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 18px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ color: DS.text, fontWeight: 900, fontSize: '1.1rem' }}>
                  {ride.from} to {ride.to}
                </div>
                <div style={{ color: DS.muted, fontSize: '0.8rem', marginTop: 4 }}>
                  {(ride.fromPoint || ride.toPoint)
                    ? `${ride.fromPoint ?? ride.from} → ${ride.toPoint ?? ride.to}`
                    : `${ride.vehicleType} · ${ride.estimatedArrivalLabel}`}
                </div>
              </div>
              <span style={{ ...pill(directWhatsApp ? '#25d366' : DS.cyan) }}>
                {directWhatsApp ? (ar ? 'واتساب مباشر' : 'Direct WhatsApp') : (ar ? 'واتساب واصل' : 'Wasel WhatsApp')}
              </span>
            </div>
            <div style={{ padding: 18 }}>
              <MapWrapper
                mode="live"
                center={midpoint(pickupCoord, dropoffCoord)}
                pickupLocation={pickupCoord}
                dropoffLocation={dropoffCoord}
                driverLocation={driverCoord}
                height={280}
                showMosques={false}
                showRadars={false}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                background: DS.card2,
                borderRadius: r(18),
                padding: '18px 18px 16px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: DS.text, fontWeight: 900, fontSize: '0.96rem' }}>
                    {ride.driver.name}
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.78rem', marginTop: 4 }}>
                    {ride.driver.verified
                      ? (ar ? 'سائق موثق' : 'Verified driver')
                      : (ar ? 'التحقق قيد المراجعة' : 'Verification in progress')}
                  </div>
                </div>
                <span style={{ ...pill(DS.green) }}>
                  <ShieldCheck size={12} />
                  {ride.driver.rating.toFixed(1)}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {[
                  {
                    icon: CarFront,
                    label: ar ? 'السيارة' : 'Car',
                    value: ride.carModel ?? ride.vehicleType,
                  },
                  {
                    icon: Users,
                    label: ar ? 'طلبات المقاعد' : 'Seat requests',
                    value: String(activeSeatRequests),
                  },
                  {
                    icon: Clock3,
                    label: ar ? 'المدة' : 'Trip time',
                    value: ride.durationLabel ?? ride.estimatedArrivalLabel,
                  },
                  {
                    icon: MapPinned,
                    label: ar ? 'المسافة' : 'Distance',
                    value: ride.distanceKm ? `${ride.distanceKm} km` : ride.estimatedArrivalLabel,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: r(14),
                      border: `1px solid ${DS.border}`,
                      background: DS.card,
                      padding: '12px 13px',
                    }}
                  >
                    <item.icon size={15} color={DS.cyan} />
                    <div style={{ color: DS.muted, fontSize: '0.68rem', marginTop: 8 }}>
                      {item.label}
                    </div>
                    <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.82rem', marginTop: 4 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <RideTrustPanel
              language={ar ? 'ar' : 'en'}
              ride={ride}
              supportLine={supportLine}
              variant="detail"
            />

            <div
              style={{
                background: DS.card2,
                borderRadius: r(18),
                padding: '18px 18px 16px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ color: DS.text, fontWeight: 900, fontSize: '0.96rem' }}>
                {ar ? 'قناة التواصل' : 'Communication lane'}
              </div>
              <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 6, lineHeight: 1.6 }}>
                {directWhatsApp
                  ? (ar
                      ? 'واتساب هو القناة الأساسية بين الراكب وصاحب الرحلة وحامل الطرد.'
                      : 'WhatsApp is the main pipeline between rider, trip owner, and package holder.')
                  : (ar
                      ? 'واتساب واصل هو القناة الأساسية حتى يتم فتح تواصل مباشر.'
                      : 'Wasel WhatsApp coordination stays primary until direct contact is unlocked.')}
              </div>
              <a
                href={driverWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  minHeight: 48,
                  borderRadius: r(14),
                  background: 'linear-gradient(135deg, #25d366 0%, #1faa53 100%)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontFamily: DS.F,
                }}
              >
                <MessageCircle size={17} />
                {directWhatsApp
                  ? (ar ? 'افتح واتساب مع السائق' : 'Open driver WhatsApp')
                  : (ar ? 'افتح واتساب واصل' : 'Open Wasel WhatsApp')}
              </a>
              <div
                style={{
                  marginTop: 10,
                  color: DS.muted,
                  fontSize: '0.74rem',
                  lineHeight: 1.5,
                }}
              >
                {directWhatsApp
                  ? (ar
                      ? `يبقى دعم واصل متاحًا على ${supportLine} إذا احتجت تصعيدًا سريعًا.`
                      : `Wasel support stays available on ${supportLine} if you need fast escalation.`)
                  : (ar
                      ? `واصل يبقى جهة التنسيق الأساسية على ${supportLine} حتى يفتح التواصل المباشر.`
                      : `Wasel remains the primary coordination owner on ${supportLine} until direct contact opens.`)}
              </div>
            </div>
          </div>
        </div>

        <div className="sp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <div
            style={{
              background: DS.card2,
              borderRadius: r(18),
              padding: '18px 18px 16px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ color: DS.text, fontWeight: 900, fontSize: '0.94rem' }}>
              {ar ? 'جاهزية الحجز' : 'Seat booking'}
            </div>
            <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 6, lineHeight: 1.6 }}>
              {bookingReady
                ? (ar ? 'تم تأكيد مقعدك على هذه الرحلة.' : 'Your seat is already confirmed on this ride.')
                : bookingPending
                  ? (ar ? 'الحجز قيد تأكيد السائق.' : 'Your booking is pending driver confirmation.')
                  : (ar ? 'يمكنك حجز المقعد مباشرة من هنا.' : 'You can book the seat directly from here.')}
            </div>
            <button
              type="button"
              disabled={bookingReady || bookingState === 'booking'}
              onClick={handleBookSeat}
              style={{
                width: '100%',
                minHeight: 48,
                marginTop: 14,
                borderRadius: r(14),
                border: 'none',
                background: bookingReady
                  ? 'rgba(16,185,129,0.18)'
                  : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#fff',
                fontWeight: 800,
                fontFamily: DS.F,
                cursor: bookingReady || bookingState === 'booking' ? 'default' : 'pointer',
              }}
            >
              {bookingReady
                ? (ar ? 'المقعد مؤكد' : 'Seat confirmed')
                : bookingState === 'booking'
                  ? (ar ? 'جارٍ الحجز...' : 'Booking seat...')
                  : (ar ? 'احجز مقعداً' : 'Book seat')}
            </button>
          </div>

          <div
            style={{
              background: DS.card2,
              borderRadius: r(18),
              padding: '18px 18px 16px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ color: DS.text, fontWeight: 900, fontSize: '0.94rem' }}>
              {ar ? 'إرسال طرد' : 'Package lane'}
            </div>
            <div style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 6, lineHeight: 1.6 }}>
              {ride.supportsPackages
                ? (ar
                    ? 'هذه الرحلة جاهزة لحمل الطرود ويمكنك الدخول مباشرة إلى الطلب.'
                    : 'This ride is package-ready, so you can jump straight into a package request.')
                : (ar
                    ? 'لا توجد مساحة طرود منشورة على هذه الرحلة، لكن يمكنك الإرسال على نفس المسار.'
                    : 'No package slot is published on this ride, but you can still send on the same corridor.')}
            </div>
            <button
              type="button"
              onClick={handleSendPackage}
              style={{
                width: '100%',
                minHeight: 48,
                marginTop: 14,
                borderRadius: r(14),
                border: 'none',
                background: DS.gradG,
                color: '#fff',
                fontWeight: 800,
                fontFamily: DS.F,
                cursor: 'pointer',
              }}
            >
              {ride.supportsPackages
                ? (ar ? 'أرسل طرداً على هذه الرحلة' : 'Send package on this ride')
                : (ar ? 'أرسل طرداً على هذا المسار' : 'Send package on this corridor')}
            </button>
          </div>

          <div
            style={{
              background: DS.card2,
              borderRadius: r(18),
              padding: '18px 18px 16px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ color: DS.text, fontWeight: 900, fontSize: '0.94rem' }}>
              {ar ? 'تفاصيل إضافية' : 'Ride details'}
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {[
                ride.packageCapacity ? `${ar ? 'سعة الطرد' : 'Package capacity'}: ${ride.packageCapacity}` : null,
                ride.prayerStops ? (ar ? 'توقفات صلاة متاحة' : 'Prayer stops available') : null,
                ride.amenities?.length ? `${ar ? 'المزايا' : 'Amenities'}: ${ride.amenities.slice(0, 3).join(', ')}` : null,
              ]
                .filter(Boolean)
                .map(item => (
                  <div
                    key={item}
                    style={{
                      borderRadius: r(12),
                      border: `1px solid ${DS.border}`,
                      background: DS.card,
                      padding: '10px 12px',
                      color: DS.text,
                      fontSize: '0.8rem',
                    }}
                  >
                    {item}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {bookingMessage ? (
          <div
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: `1px solid ${DS.green}35`,
              borderRadius: r(16),
              padding: '14px 16px',
              color: DS.text,
              fontWeight: 700,
            }}
          >
            {bookingMessage}
          </div>
        ) : null}

        {pageError ? (
          <div
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: `1px solid ${DS.gold}35`,
              borderRadius: r(16),
              padding: '14px 16px',
              color: DS.text,
              fontWeight: 700,
            }}
          >
            {pageError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            border: 'none',
            background: 'transparent',
            color: DS.cyan,
            cursor: 'pointer',
            fontWeight: 800,
            fontFamily: DS.F,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          {ar ? 'العودة إلى الرحلات' : 'Back to rides'}
        </button>
      </PageShell>
    </Protected>
  );
}

export default RideDetailsPage;
