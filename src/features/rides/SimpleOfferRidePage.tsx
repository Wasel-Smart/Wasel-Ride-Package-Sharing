import { useState } from 'react';
import { ArrowRight, MapPin, Clock, DollarSign, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { C, GRAD, GRAD_HERO } from '../../utils/wasel-ds';

const CITIES = ['Amman', 'Aqaba', 'Irbid', 'Zarqa', 'Madaba'];
const TIMES = [
  '6:00 AM',
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
];

export function SimpleOfferRidePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();

  const ar = language === 'ar';

  // Simple form state - no complex objects
  const [from, setFrom] = useState('Amman');
  const [to, setTo] = useState('Aqaba');
  const [time, setTime] = useState('2:00 PM');
  const [price, setPrice] = useState(15);
  const [seats, setSeats] = useState(3);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  // Simple validation
  const canPost = from !== to && price > 0 && seats > 0;

  // Simple post ride
  const handlePost = async () => {
    if (!user) {
      navigate('/app/auth?returnTo=/app/offer-ride');
      return;
    }

    if (!canPost) {
      alert(ar ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setPosting(true);

    // Simulate API call
    setTimeout(() => {
      setPosted(true);
      setPosting(false);
    }, 1000);
  };

  // Success state
  if (posted) {
    return (
      <div
        style={{
          minHeight: 'var(--app-min-height)',
          background: GRAD_HERO,
          color: C.text,
          padding: '20px',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            textAlign: 'center',
            background: C.card,
            borderRadius: '24px',
            padding: '40px',
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: '900',
              margin: '0 0 16px',
              color: C.green,
            }}
          >
            {ar ? 'تم نشر الرحلة!' : 'Ride Posted!'}
          </h2>
          <p
            style={{
              color: C.textMuted,
              fontSize: '1.1rem',
              margin: '0 0 24px',
            }}
          >
            {ar
              ? `رحلتك من ${from} إلى ${to} متاحة الآن للحجز`
              : `Your ride from ${from} to ${to} is now available for booking`}
          </p>

          <div
            style={{
              background: C.greenDim,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${C.greenDim}`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ color: C.textMuted, fontSize: '0.9rem' }}>
                  {ar ? 'المسار' : 'Route'}
                </div>
                <div style={{ color: C.text, fontWeight: '700' }}>
                  {from} → {to}
                </div>
              </div>
              <div>
                <div style={{ color: C.textMuted, fontSize: '0.9rem' }}>
                  {ar ? 'الوقت' : 'Time'}
                </div>
                <div style={{ color: C.text, fontWeight: '700' }}>{time}</div>
              </div>
              <div>
                <div style={{ color: C.textMuted, fontSize: '0.9rem' }}>
                  {ar ? 'السعر' : 'Price'}
                </div>
                <div style={{ color: C.green, fontWeight: '700' }}>{price} JOD</div>
              </div>
              <div>
                <div style={{ color: C.textMuted, fontSize: '0.9rem' }}>
                  {ar ? 'المقاعد' : 'Seats'}
                </div>
                <div style={{ color: C.text, fontWeight: '700' }}>
                  {seats} {ar ? 'مقاعد' : 'available'}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <button
              onClick={() => {
                setPosted(false);
                setFrom('Amman');
                setTo('Aqaba');
                setTime('2:00 PM');
                setPrice(15);
                setSeats(3);
              }}
              style={{
                background: GRAD,
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                color: C.text,
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {ar ? 'رحلة أخرى' : 'Post Another'}
            </button>
            <button
              onClick={() => navigate('/app/my-trips')}
              style={{
                background: C.elevated,
                border: `1px solid ${C.borderHov}`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: C.text,
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {ar ? 'رحلاتي' : 'My Trips'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 'var(--app-min-height)',
        background: GRAD_HERO,
        color: C.text,
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Simple Header */}
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          marginBottom: '30px',
        }}
      >
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'none',
            border: 'none',
            color: C.textMuted,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          ← {ar ? 'العودة' : 'Back'}
        </button>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: '900',
            margin: '0 0 8px',
            color: C.text,
          }}
        >
          {ar ? 'اعرض رحلة' : 'Offer a Ride'}
        </h1>
        <p
          style={{
            color: C.textMuted,
            margin: 0,
            fontSize: '1rem',
          }}
        >
          {ar ? 'شارك رحلتك واكسب المال' : 'Share your trip and earn money'}
        </p>
      </div>

      {/* Simple Form */}
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: C.card,
          borderRadius: '24px',
          padding: '32px',
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '24px',
          }}
        >
          {/* Route Selection */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            {/* From */}
            <div>
              <label
                style={{
                  display: 'block',
                  color: C.textMuted,
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                {ar ? 'من' : 'From'}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: C.elevated,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: `1px solid ${C.borderHov}`,
                }}
              >
                <MapPin size={18} color="#10B981" />
                <select
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: C.text,
                    fontSize: '1rem',
                    flex: 1,
                    outline: 'none',
                  }}
                >
                  {CITIES.map(city => (
                    <option key={city} value={city} style={{ background: C.card2 }}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* To */}
            <div>
              <label
                style={{
                  display: 'block',
                  color: C.textMuted,
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                {ar ? 'إلى' : 'To'}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: C.elevated,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: `1px solid ${C.borderHov}`,
                }}
              >
                <MapPin size={18} color="#00C8E8" />
                <select
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: C.text,
                    fontSize: '1rem',
                    flex: 1,
                    outline: 'none',
                  }}
                >
                  {CITIES.map(city => (
                    <option key={city} value={city} style={{ background: C.card2 }}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Time and Price */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            {/* Time */}
            <div>
              <label
                style={{
                  display: 'block',
                  color: C.textMuted,
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                {ar ? 'الوقت' : 'Time'}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: C.elevated,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: `1px solid ${C.borderHov}`,
                }}
              >
                <Clock size={18} color="#F59E0B" />
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: C.text,
                    fontSize: '1rem',
                    flex: 1,
                    outline: 'none',
                  }}
                >
                  {TIMES.map(t => (
                    <option key={t} value={t} style={{ background: C.card2 }}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label
                style={{
                  display: 'block',
                  color: C.textMuted,
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                {ar ? 'السعر (دينار)' : 'Price (JOD)'}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: C.elevated,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: `1px solid ${C.borderHov}`,
                }}
              >
                <DollarSign size={18} color="#10B981" />
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  min="1"
                  max="100"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: C.text,
                    fontSize: '1rem',
                    flex: 1,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Seats */}
          <div>
            <label
              style={{
                display: 'block',
                color: C.textMuted,
                fontSize: '0.9rem',
                marginBottom: '8px',
                fontWeight: '600',
              }}
            >
              {ar ? 'عدد المقاعد المتاحة' : 'Available Seats'}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: C.elevated,
                borderRadius: '12px',
                padding: '14px 16px',
                border: `1px solid ${C.borderHov}`,
              }}
            >
              <Users size={18} color="#8B5CF6" />
              <input
                type="number"
                value={seats}
                onChange={e => setSeats(Number(e.target.value))}
                min="1"
                max="7"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.text,
                  fontSize: '1rem',
                  flex: 1,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              background: C.cyanDim,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${C.cyanDim}`,
            }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                color: C.cyan,
                fontSize: '1.1rem',
                fontWeight: '800',
              }}
            >
              {ar ? 'معاينة الرحلة' : 'Ride Preview'}
            </h3>
            <div
              style={{
                color: C.text,
                fontSize: '1rem',
                lineHeight: '1.6',
              }}
            >
              <strong>{from}</strong> → <strong>{to}</strong>
              <br />
              {ar ? 'الوقت:' : 'Time:'} {time}
              <br />
              {ar ? 'السعر:' : 'Price:'}{' '}
              <span style={{ color: C.green, fontWeight: '700' }}>{price} JOD</span>
              <br />
              {ar ? 'المقاعد:' : 'Seats:'} {seats} {ar ? 'متاح' : 'available'}
            </div>
          </div>

          {/* Post Button */}
          <button
            onClick={handlePost}
            disabled={!canPost || posting}
            style={{
              width: '100%',
              background: canPost && !posting ? GRAD : C.elevated,
              border: 'none',
              borderRadius: '16px',
              padding: '18px',
              color: C.text,
              fontSize: '1.1rem',
              fontWeight: '800',
              cursor: canPost && !posting ? 'pointer' : 'not-allowed',
              opacity: canPost && !posting ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {posting ? (
              ar ? (
                'جاري النشر...'
              ) : (
                'Posting...'
              )
            ) : (
              <>
                {ar ? 'انشر الرحلة' : 'Post Ride'}
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {/* Help Text */}
          <p
            style={{
              color: C.textMuted,
              fontSize: '0.9rem',
              textAlign: 'center',
              margin: 0,
              lineHeight: '1.5',
            }}
          >
            {ar
              ? 'ستظهر رحلتك للركاب فوراً وستتلقى إشعارات عند الحجز'
              : "Your ride will be visible to passengers immediately and you'll get notifications when booked"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SimpleOfferRidePage;
