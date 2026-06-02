import { useState } from 'react';
import { ArrowRight, MapPin, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';

// Simple popular routes - no complex data
const POPULAR_ROUTES = [
  { from: 'Amman', to: 'Aqaba', price: 15, time: '2:30 PM', available: 3 },
  { from: 'Aqaba', to: 'Amman', price: 15, time: '6:00 PM', available: 2 },
  { from: 'Amman', to: 'Irbid', price: 8, time: '9:00 AM', available: 4 },
];

export function SimpleHomePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  
  const ar = language === 'ar';

  const handleQuickBook = (route: typeof POPULAR_ROUTES[0]) => {
    if (!user) {
      navigate('/app/auth?returnTo=/app/find-ride');
      return;
    }
    
    // Direct booking with pre-filled route
    navigate(`/app/find-ride?from=${route.from}&to=${route.to}&quick=1`);
  };

  const handleOfferRide = () => {
    if (!user) {
      navigate('/app/auth?returnTo=/app/offer-ride');
      return;
    }
    navigate('/app/offer-ride');
  };

  return (
    <div style={{
      minHeight: 'var(--app-min-height)',
      background: 'linear-gradient(135deg, #0B1D2D 0%, #051218 100%)',
      color: '#fff',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Simple Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        paddingTop: '40px'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          margin: '0 0 16px',
          background: 'linear-gradient(90deg, #55E9FF, #60A5FA)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {ar ? 'شارك الرحلات' : 'Share Rides'}
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#94A3B8',
          margin: 0,
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {ar ? 'وفر المال. اوصل بأمان.' : 'Save money. Travel together.'}
        </p>
      </div>

      {/* Popular Routes - Main Focus */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        marginBottom: '40px'
      }}>
        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: '800',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {ar ? 'الرحلات الشائعة' : 'Popular Routes'}
        </h2>
        
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {POPULAR_ROUTES.map((route, index) => (
            <button
              key={index}
              onClick={() => handleQuickBook(route)}
              onMouseEnter={() => setSelectedRoute(`${route.from}-${route.to}`)}
              onMouseLeave={() => setSelectedRoute(null)}
              style={{
                background: selectedRoute === `${route.from}-${route.to}` 
                  ? 'linear-gradient(135deg, rgba(0,200,232,0.15), rgba(8,18,35,0.95))'
                  : 'rgba(255,255,255,0.05)',
                border: selectedRoute === `${route.from}-${route.to}`
                  ? '1px solid rgba(0,200,232,0.3)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <MapPin size={20} color="#00C8E8" />
                  <span style={{
                    fontSize: '1.2rem',
                    fontWeight: '800',
                    color: '#fff'
                  }}>
                    {route.from} → {route.to}
                  </span>
                </div>
                <ArrowRight size={20} color="#94A3B8" />
              </div>
              
              <div style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock size={16} color="#94A3B8" />
                  <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
                    {route.time}
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <DollarSign size={16} color="#10B981" />
                  <span style={{ color: '#10B981', fontSize: '0.9rem', fontWeight: '700' }}>
                    {route.price} JOD
                  </span>
                </div>
                
                <span style={{
                  background: 'rgba(16,185,129,0.2)',
                  color: '#10B981',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {route.available} {ar ? 'متاح' : 'available'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Simple Actions */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '40px'
      }}>
        <button
          onClick={() => navigate('/app/find-ride')}
          style={{
            background: 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)',
            border: 'none',
            borderRadius: '16px',
            padding: '20px',
            color: '#fff',
            fontWeight: '800',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {ar ? 'ابحث عن رحلة' : 'Find Ride'}
          <ArrowRight size={18} />
        </button>
        
        <button
          onClick={handleOfferRide}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '16px',
            padding: '20px',
            color: '#fff',
            fontWeight: '800',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {ar ? 'اعرض رحلة' : 'Offer Ride'}
          <ArrowRight size={18} />
        </button>
      </div>

      {/* User Status */}
      {user && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p style={{
            color: '#94A3B8',
            margin: '0 0 12px',
            fontSize: '0.9rem'
          }}>
            {ar ? 'مرحباً' : 'Welcome back'}, {user.user_metadata?.name || user.email}
          </p>
          <button
            onClick={() => navigate('/app/my-trips')}
            style={{
              background: 'none',
              border: '1px solid rgba(0,200,232,0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: '#00C8E8',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {ar ? 'رحلاتي' : 'My Trips'}
          </button>
        </div>
      )}

      {/* Sign In Prompt for Guests */}
      {!user && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '20px'
        }}>
          <p style={{
            color: '#94A3B8',
            margin: '0 0 16px',
            fontSize: '0.9rem'
          }}>
            {ar ? 'سجل دخول لحجز الرحلات' : 'Sign in to book rides'}
          </p>
          <button
            onClick={() => navigate('/app/auth')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '12px 24px',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {ar ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </div>
      )}
    </div>
  );
}

export default SimpleHomePage;
