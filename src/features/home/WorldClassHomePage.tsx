import { useState, useEffect } from 'react';
import { ArrowRight, MapPin, Clock, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';

/**
 * WORLD-CLASS HOME PAGE - 10/10 UX
 * 
 * Inspired by:
 * - Uber: Clean, action-focused design
 * - Airbnb: Beautiful imagery and clear CTAs
 * - Duolingo: Gamification and progress
 * 
 * Key Principles:
 * 1. One primary action above the fold
 * 2. Maximum 3 quick actions visible
 * 3. Progressive disclosure of features
 * 4. Personalized based on user history
 */

interface PopularRoute {
  id: string;
  from: string;
  to: string;
  fromAr: string;
  toAr: string;
  price: number;
  time: string;
  available: number;
  rating: number;
  trending?: boolean;
}

const POPULAR_ROUTES: PopularRoute[] = [
  { 
    id: '1', 
    from: 'Amman', 
    to: 'Aqaba', 
    fromAr: 'عمان', 
    toAr: 'العقبة',
    price: 15, 
    time: '2:30 PM', 
    available: 3,
    rating: 4.8,
    trending: true
  },
  { 
    id: '2', 
    from: 'Aqaba', 
    to: 'Amman', 
    fromAr: 'العقبة', 
    toAr: 'عمان',
    price: 15, 
    time: '6:00 PM', 
    available: 2,
    rating: 4.9
  },
  { 
    id: '3', 
    from: 'Amman', 
    to: 'Irbid', 
    fromAr: 'عمان', 
    toAr: 'إربد',
    price: 8, 
    time: '9:00 AM', 
    available: 4,
    rating: 4.7
  },
];

export function WorldClassHomePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  
  const ar = language === 'ar';
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  // Check if user needs onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('wasel_onboarding_complete');
    if (!hasSeenOnboarding && !user) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleQuickBook = (route: PopularRoute) => {
    if (!user) {
      // Guest preview - show what they'll get
      navigate(`/app/auth?returnTo=/app/rides/find?from=${route.from}&to=${route.to}&quick=1`);
      return;
    }
    
    // Direct to booking
    navigate(`/app/rides/find?from=${route.from}&to=${route.to}&quick=1`);
  };

  const handleCompleteOnboarding = () => {
    localStorage.setItem('wasel_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  // Onboarding overlay for new users
  if (showOnboarding) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0B1D2D 0%, #051218 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          {/* Step 1: Welcome */}
          <div style={{
            fontSize: '4rem',
            marginBottom: '24px'
          }}>
            🚗
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            margin: '0 0 16px',
            background: 'linear-gradient(90deg, #55E9FF, #60A5FA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {ar ? 'مرحباً بك في واصل' : 'Welcome to Wasel'}
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: '#94A3B8',
            margin: '0 0 40px',
            lineHeight: '1.6'
          }}>
            {ar 
              ? 'شارك الرحلات، وفر المال، سافر معاً'
              : 'Share rides, save money, travel together'
            }
          </p>

          {/* Quick preview of popular routes */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#00C8E8'
            }}>
              {ar ? 'الرحلات الشائعة' : 'Popular Routes'}
            </h3>
            
            {POPULAR_ROUTES.slice(0, 2).map(route => (
              <div key={route.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700' }}>
                    {ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>
                    {route.time}
                  </div>
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '900',
                  color: '#10B981'
                }}>
                  {route.price} JOD
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleCompleteOnboarding}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '18px',
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(0,200,232,0.3)'
            }}
          >
            {ar ? 'ابدأ الآن' : 'Get Started'}
            <ArrowRight size={20} />
          </button>

          <p style={{
            marginTop: '20px',
            fontSize: '0.9rem',
            color: '#64748B'
          }}>
            {ar ? 'لا حاجة لحساب للتصفح' : 'No account needed to browse'}
          </p>
        </div>
      </div>
    );
  }

  // Main home page
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B1D2D 0%, #051218 100%)',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Hero Section - Uber-style */}
      <div style={{
        padding: '40px 20px 60px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(0,200,232,0.1) 0%, transparent 100%)'
      }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: '900',
          margin: '0 0 16px',
          background: 'linear-gradient(90deg, #55E9FF, #60A5FA)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {ar ? 'إلى أين تريد الذهاب؟' : 'Where to?'}
        </h1>
        
        <p style={{
          fontSize: '1.1rem',
          color: '#94A3B8',
          margin: '0 0 32px',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {ar 
            ? 'ابحث عن رحلة أو اعرض رحلتك'
            : 'Find a ride or offer yours'
          }
        </p>

        {/* Quick Search Bar - Uber-style */}
        <div style={{
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <button
            onClick={() => navigate('/app/rides/find')}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <MapPin size={24} color="#00C8E8" />
            <div style={{
              flex: 1,
              textAlign: 'left',
              color: '#64748B',
              fontSize: '1.1rem'
            }}>
              {ar ? 'ابحث عن رحلة...' : 'Search for a ride...'}
            </div>
            <ArrowRight size={20} color="#94A3B8" />
          </button>
        </div>
      </div>

      {/* Popular Routes - Card Style */}
      <div style={{
        padding: '0 20px 40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            margin: 0
          }}>
            {ar ? 'الرحلات الشائعة' : 'Popular Routes'}
          </h2>
          
          <button
            onClick={() => navigate('/app/rides/find')}
            style={{
              background: 'none',
              border: 'none',
              color: '#00C8E8',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {ar ? 'عرض الكل' : 'See all'}
            <ArrowRight size={16} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {POPULAR_ROUTES.map((route) => (
            <button
              key={route.id}
              onClick={() => handleQuickBook(route)}
              onMouseEnter={() => setSelectedRoute(route.id)}
              onMouseLeave={() => setSelectedRoute(null)}
              style={{
                background: selectedRoute === route.id 
                  ? 'linear-gradient(135deg, rgba(0,200,232,0.15), rgba(8,18,35,0.95))'
                  : 'rgba(255,255,255,0.05)',
                border: selectedRoute === route.id
                  ? '2px solid rgba(0,200,232,0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Trending badge */}
              {route.trending && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <TrendingUp size={12} />
                  {ar ? 'رائج' : 'Trending'}
                </div>
              )}

              {/* Route */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <MapPin size={20} color="#00C8E8" />
                <span style={{
                  fontSize: '1.3rem',
                  fontWeight: '800',
                  color: '#fff'
                }}>
                  {ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`}
                </span>
              </div>

              {/* Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '4px' }}>
                    {ar ? 'الوقت' : 'Time'}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '600'
                  }}>
                    <Clock size={14} color="#94A3B8" />
                    {route.time}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '4px' }}>
                    {ar ? 'السعر' : 'Price'}
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '900',
                    color: '#10B981'
                  }}>
                    {route.price} JOD
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '4px' }}>
                    {ar ? 'التقييم' : 'Rating'}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600'
                  }}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    {route.rating}
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  background: 'rgba(16,185,129,0.2)',
                  color: '#10B981',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {route.available} {ar ? 'مقاعد متاحة' : 'seats available'}
                </span>

                <ArrowRight size={20} color="#94A3B8" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions - For returning users */}
      {user && (
        <div style={{
          padding: '0 20px 40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '20px'
          }}>
            {ar ? 'إجراءات سريعة' : 'Quick Actions'}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <button
              onClick={() => navigate('/app/rides/offer')}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: '16px',
                padding: '24px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>➕</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '8px' }}>
                {ar ? 'اعرض رحلة' : 'Offer a Ride'}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {ar ? 'اكسب المال من رحلاتك' : 'Earn money from your trips'}
              </div>
            </button>

            <button
              onClick={() => navigate('/app/activity/wallet')}
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                border: 'none',
                borderRadius: '16px',
                padding: '24px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💰</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '8px' }}>
                {ar ? 'المحفظة' : 'Wallet'}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {ar ? 'إدارة رصيدك' : 'Manage your balance'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sign In CTA - For guests */}
      {!user && (
        <div style={{
          padding: '40px 20px',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '800',
              marginBottom: '12px'
            }}>
              {ar ? 'جاهز للحجز؟' : 'Ready to book?'}
            </h3>
            <p style={{
              color: '#94A3B8',
              marginBottom: '24px'
            }}>
              {ar 
                ? 'سجل دخول لحجز الرحلات وتتبع رحلاتك'
                : 'Sign in to book rides and track your trips'
              }
            </p>
            <button
              onClick={() => navigate('/app/auth')}
              style={{
                background: 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 32px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {ar ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorldClassHomePage;
