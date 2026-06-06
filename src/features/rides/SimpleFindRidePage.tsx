import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { ArrowRight, MapPin, Clock, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { C, GRAD, GRAD_HERO } from '../../utils/wasel-ds';

// Simple ride data - no complex objects
interface SimpleRide {
  id: string;
  from: string;
  to: string;
  time: string;
  price: number;
  driver: string;
  seats: number;
}

// Mock simple rides
const SIMPLE_RIDES: SimpleRide[] = [
  { id: '1', from: 'Amman', to: 'Aqaba', time: '2:30 PM', price: 15, driver: 'Ahmad', seats: 3 },
  { id: '2', from: 'Amman', to: 'Aqaba', time: '4:00 PM', price: 16, driver: 'Sara', seats: 2 },
  { id: '3', from: 'Amman', to: 'Aqaba', time: '6:30 PM', price: 14, driver: 'Omar', seats: 4 },
  { id: '4', from: 'Aqaba', to: 'Amman', time: '8:00 AM', price: 15, driver: 'Layla', seats: 1 },
  { id: '5', from: 'Aqaba', to: 'Amman', time: '6:00 PM', price: 15, driver: 'Khalid', seats: 3 },
  { id: '6', from: 'Amman', to: 'Irbid', time: '9:00 AM', price: 8, driver: 'Nour', seats: 2 },
];

const CITIES = ['Amman', 'Aqaba', 'Irbid', 'Zarqa', 'Madaba'];

export function SimpleFindRidePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const location = useLocation();
  
  const ar = language === 'ar';
  
  // Simple state - no complex objects
  const [from, setFrom] = useState('Amman');
  const [to, setTo] = useState('Aqaba');
  const [rides, setRides] = useState<SimpleRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<string | null>(null);

  // Get URL params for quick booking
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFrom = params.get('from');
    const urlTo = params.get('to');
    const isQuick = params.get('quick') === '1';
    
    if (urlFrom && CITIES.includes(urlFrom)) setFrom(urlFrom);
    if (urlTo && CITIES.includes(urlTo)) setTo(urlTo);
    
    if (isQuick && urlFrom && urlTo) {
      handleSearch();
    }
  }, [location.search]);

  // Simple search - just filter by route
  const handleSearch = () => {
    if (from === to) {
      alert(ar ? 'اختر مدن مختلفة' : 'Choose different cities');
      return;
    }
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const filteredRides = SIMPLE_RIDES.filter(
        ride => ride.from === from && ride.to === to
      );
      setRides(filteredRides);
      setLoading(false);
    }, 500);
  };

  // Simple booking - just navigate to confirmation
  const handleBook = (ride: SimpleRide) => {
    if (!user) {
      navigate(`/app/auth?returnTo=/app/find-ride?from=${from}&to=${to}&book=${ride.id}`);
      return;
    }
    
    // Simple booking confirmation
    const confirmed = confirm(
      ar 
        ? `تأكيد حجز الرحلة من ${ride.from} إلى ${ride.to} مع ${ride.driver} بسعر ${ride.price} دينار؟`
        : `Book ride from ${ride.from} to ${ride.to} with ${ride.driver} for ${ride.price} JOD?`
    );
    
    if (confirmed) {
      alert(ar ? 'تم حجز الرحلة بنجاح!' : 'Ride booked successfully!');
      navigate('/app/my-trips');
    }
  };

  return (
    <div style={{
      minHeight: 'var(--app-min-height)',
      background: GRAD_HERO,
      color: C.text,
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Simple Header */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        marginBottom: '30px'
      }}>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'none',
            border: 'none',
            color: C.textMuted,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← {ar ? 'العودة' : 'Back'}
        </button>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '900',
          margin: '0 0 8px',
          color: C.text
        }}>
          {ar ? 'ابحث عن رحلة' : 'Find a Ride'}
        </h1>
        <p style={{
          color: C.textMuted,
          margin: 0,
          fontSize: '1rem'
        }}>
          {ar ? 'اختر المسار واحجز مقعدك' : 'Choose your route and book your seat'}
        </p>
      </div>

      {/* Simple Search */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        marginBottom: '30px',
        background: C.card,
        borderRadius: '20px',
        padding: '24px',
        border: `1px solid ${C.border}`
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* From */}
          <div>
            <label style={{
              display: 'block',
              color: C.textMuted,
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              {ar ? 'من' : 'From'}
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: C.elevated,
              borderRadius: '12px',
              padding: '12px 16px',
              border: `1px solid ${C.borderHov}`
            }}>
              <MapPin size={18} color="#10B981" />
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.text,
                  fontSize: '1rem',
                  flex: 1,
                  outline: 'none'
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
            <label style={{
              display: 'block',
              color: C.textMuted,
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              {ar ? 'إلى' : 'To'}
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: C.elevated,
              borderRadius: '12px',
              padding: '12px 16px',
              border: `1px solid ${C.borderHov}`
            }}>
              <MapPin size={18} color="#00C8E8" />
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.text,
                  fontSize: '1rem',
                  flex: 1,
                  outline: 'none'
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

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            width: '100%',
            background: GRAD,
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            color: C.text,
            fontSize: '1rem',
            fontWeight: '800',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            ar ? 'جاري البحث...' : 'Searching...'
          ) : (
            <>
              {ar ? 'ابحث عن الرحلات' : 'Search Rides'}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Simple Results */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {rides.length > 0 && (
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            marginBottom: '20px',
            color: C.text
          }}>
            {rides.length} {ar ? 'رحلة متاحة' : 'rides available'}
          </h2>
        )}

        {rides.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: C.card,
            borderRadius: '20px',
            border: `1px solid ${C.border}`
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚗</div>
            <h3 style={{ color: C.text, marginBottom: '8px' }}>
              {ar ? 'لا توجد رحلات' : 'No rides found'}
            </h3>
            <p style={{ color: C.textMuted, margin: 0 }}>
              {ar ? 'جرب مسار آخر أو وقت مختلف' : 'Try a different route or time'}
            </p>
          </div>
        )}

        {/* Ride Cards - Super Simple */}
        <div style={{ display: 'grid', gap: '16px' }}>
          {rides.map((ride) => (
            <div
              key={ride.id}
              onMouseEnter={() => setSelectedRide(ride.id)}
              onMouseLeave={() => setSelectedRide(null)}
              style={{
                background: selectedRide === ride.id 
                  ? C.cyanDim 
                  : C.card,
                border: selectedRide === ride.id
                  ? `1px solid ${C.cyanGlow}`
                  : `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '20px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '800',
                    color: C.text,
                    marginBottom: '4px'
                  }}>
                    {ride.from} → {ride.to}
                  </div>
                  <div style={{
                    color: C.textMuted,
                    fontSize: '0.9rem'
                  }}>
                    {ar ? 'السائق:' : 'Driver:'} {ride.driver}
                  </div>
                </div>
                
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: '900',
                  color: C.green
                }}>
                  {ride.price} JOD
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Clock size={16} color="#94A3B8" />
                    <span style={{ color: C.textMuted, fontSize: '0.9rem' }}>
                      {ride.time}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Users size={16} color="#94A3B8" />
                    <span style={{ color: C.textMuted, fontSize: '0.9rem' }}>
                      {ride.seats} {ar ? 'مقاعد' : 'seats'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleBook(ride)}
                  style={{
                    background: GRAD,
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    color: C.text,
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {ar ? 'احجز' : 'Book'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SimpleFindRidePage;

