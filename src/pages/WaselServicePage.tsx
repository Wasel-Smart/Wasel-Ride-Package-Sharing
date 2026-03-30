/**
 * Wasel All Service Pages
 * Unified dark design system across all pages
 * Fixed: working search, trip detail modal, consistent identity
 */
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, MapPin, Calendar, Users, Star, CheckCircle2, Clock,
  Package, Phone, MessageCircle, X, ChevronRight, Shield,
  Zap, Car, Bus, User, CreditCard, ArrowRight, Moon, Filter,
  TrendingUp, Award, Navigation, Wifi, Wind, Volume2, VolumeX,
} from 'lucide-react';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { MapWrapper } from '../components/MapWrapper';
import { createBusBooking, fetchBusRoutes, type BusRoute } from '../services/bus';
import { notificationsAPI } from '../services/notifications';
import { createConnectedPackage, createConnectedRide, getConnectedPackages, getConnectedRides, getConnectedStats, getPackageByTrackingId, type PackageRequest, type PostedRide } from '../services/journeyLogistics';
import { PAGE_DS } from '../styles/wasel-page-theme';
import {
  CoreExperienceBanner as SharedCoreExperienceBanner,
  PageShell as SharedPageShell,
  Protected as SharedProtected,
  SectionHead as SharedSectionHead,
  midpoint as sharedMidpoint,
  resolveCityCoord as sharedResolveCityCoord,
} from '../features/shared/pageShared';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';

// ── Unified Dark Design System ────────────────────────────────────────────────
const DS = PAGE_DS;

const r = (px = 12) => `${px}px`;
const pill = (color: string) => ({
  display:'inline-flex', alignItems:'center', gap:4,
  padding:'3px 10px', borderRadius:'99px',
  background:`${color}15`, border:`1px solid ${color}30`,
  fontSize:'0.66rem', fontWeight:700, color,
});

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Amman: { lat: 31.9539, lng: 35.9106 },
  Aqaba: { lat: 29.5321, lng: 35.0060 },
  Irbid: { lat: 32.5568, lng: 35.8479 },
  Zarqa: { lat: 32.0728, lng: 36.0880 },
  'Dead Sea': { lat: 31.5590, lng: 35.4732 },
  Karak: { lat: 31.1854, lng: 35.7048 },
  Madaba: { lat: 31.7196, lng: 35.7939 },
  Petra: { lat: 30.3285, lng: 35.4444 },
  Jerash: { lat: 32.2744, lng: 35.8961 },
  Mafraq: { lat: 32.3429, lng: 36.2080 },
};

function resolveCityCoord(city: string) {
  return CITY_COORDS[city] ?? CITY_COORDS.Amman;
}

function midpoint(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

// ── Protected wrapper ─────────────────────────────────────────────────────────
export function Protected({ children }: { children: ReactNode }) {
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { if (!user && mountedRef.current) nav(`/app/auth?returnTo=${encodeURIComponent(location.pathname)}`); }, [user]);
  if (!user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', background:DS.bg, padding:'24px 16px' }}>
      <div style={{ width:'100%', maxWidth:480, padding:'28px 24px', borderRadius:r(24), background:`linear-gradient(180deg, ${DS.card} 0%, ${DS.bg} 100%)`, border:`1px solid ${DS.border}`, boxShadow:'0 20px 60px rgba(0,0,0,0.35)', textAlign:'center' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          <WaselLogo size={42} theme="light" variant="full" />
        </div>
        <div style={{ width:58, height:58, borderRadius:r(18), margin:'0 auto 14px', background:`${DS.cyan}12`, border:`1px solid ${DS.cyan}24`, display:'flex', alignItems:'center', justifyContent:'center', color:DS.cyan }}>
          <Shield size={24} />
        </div>
        <div style={{ color:'#fff', fontSize:'1rem', fontWeight:800, marginBottom:8 }}>Protected Wasel experience</div>
        <div style={{ color:DS.sub, fontFamily:DS.F, fontSize:'0.85rem', lineHeight:1.7 }}>
          Redirecting you to sign in so your rides, packages, and bookings stay inside your trusted account.
        </div>
      </div>
    </div>
  );
  return <>{children}</>;
}

// ── Page shell ────────────────────────────────────────────────────────────────
function PageShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  return (
    <div style={{ minHeight:'100vh', background:DS.bg, fontFamily:DS.F, direction: ar ? 'rtl' : 'ltr' }}>
      <style>{`
        :root { color-scheme: dark; }
        .w-focus:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,200,232,0.28); }
        .w-focus-gold:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(240,168,48,0.28); }
        @media(max-width:899px){
          .sp-inner{ padding:16px !important; }
          .sp-2col { grid-template-columns:1fr !important; }
          .sp-3col { grid-template-columns:1fr !important; }
          .sp-4col { grid-template-columns:1fr 1fr !important; }
          .sp-brand-row { flex-direction:column !important; align-items:flex-start !important; gap:10px !important; }
          .sp-head  { padding:20px 16px !important; border-radius:16px !important; }
          .sp-search-grid { grid-template-columns:1fr !important; gap:10px !important; }
          .sp-sort-bar { overflow-x:auto !important; -webkit-overflow-scrolling:touch !important; padding-bottom:6px !important; flex-wrap:nowrap !important; scrollbar-width:none !important; }
          .sp-sort-bar::-webkit-scrollbar { display:none; }
          .sp-sort-btn { flex-shrink:0 !important; white-space:nowrap !important; }
          .sp-results-header { flex-direction:column !important; align-items:flex-start !important; gap:12px !important; }
          .sp-book-btn { min-height:44px !important; }
          .sp-ride-card-body { padding:16px !important; }
        }
        @media(max-width:480px){
          .sp-4col { grid-template-columns:1fr !important; }
          .sp-head-inner { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
          .sp-head-btn { width:100% !important; display:flex !important; justify-content:center !important; }
          .sp-inner { padding:12px !important; }
        }
      `}</style>
      <div className="sp-inner" style={{ maxWidth:1040, margin:'0 auto', padding:'24px 16px' }}>
        <div className="sp-brand-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom:18 }}>
          <WaselLogo size={34} theme="light" variant="full" />
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:'999px', background:'rgba(0,200,232,0.08)', border:'1px solid rgba(0,200,232,0.16)', color:'rgba(239,246,255,0.78)', fontSize:'0.72rem', fontWeight:700 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:DS.green, boxShadow:`0 0 10px ${DS.green}` }} />
            {ar ? 'شبكة واصل للحركة والطرود' : 'Wasel mobility + package network'}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ emoji, title, titleAr, sub, color = DS.cyan, action }: {
  emoji:string; title:string; titleAr?:string; sub?:string; color?:string;
  action?:{ label:string; onClick:()=>void };
}) {
  return (
    <div className="sp-head" style={{
      background:DS.gradNav, borderRadius:r(20), padding:'24px 24px',
      marginBottom:20, position:'relative', overflow:'hidden',
      border:`1px solid ${color}18`, boxShadow:`0 8px 32px rgba(0,0,0,0.4)`,
    }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 55% 80% at 12% 50%,${color}12,transparent)`, pointerEvents:'none' }} />
      <div className="sp-head-inner" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:r(16), background:`${color}18`, border:`1.5px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.9rem', flexShrink:0 }}>
            {emoji}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ fontSize:'1.55rem', fontWeight:900, color:'#fff', margin:0 }}>{title}</h1>
            </div>
            {titleAr && <p dir="rtl" style={{ fontSize:'0.9rem', fontWeight:700, color, margin:'0 0 2px', fontFamily:"'Cairo',sans-serif" }}>{titleAr}</p>}
            {sub && <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)', margin:0 }}>{sub}</p>}
          </div>
        </div>
        {action && (
          <button onClick={action.onClick} className="sp-head-btn" style={{ height:44, padding:'0 22px', borderRadius:'99px', border:'none', background:DS.gradC, color:'#fff', fontWeight:700, fontSize:'0.875rem', boxShadow:`0 4px 16px ${DS.cyan}30`, cursor:'pointer', flexShrink:0 }}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function CoreExperienceBanner({
  title,
  detail,
  tone = DS.cyan,
}: {
  title: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.8fr)',
        background: `linear-gradient(135deg, ${tone}10, rgba(255,255,255,0.02))`,
        border: `1px solid ${tone}28`,
        borderRadius: r(18),
        padding: '18px 20px',
        marginBottom: 18,
      }}
    >
      <div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.98rem', marginBottom: 6 }}>{title}</div>
        <div style={{ color: DS.sub, fontSize: '0.84rem', lineHeight: 1.6 }}>{detail}</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', alignContent:'flex-start', gap: 8 }}>
        {[
          { label: 'Verified identity layer', color: DS.green },
          { label: 'Live route network', color: DS.cyan },
          { label: 'Cross-service corridor logic', color: DS.gold },
        ].map((item) => (
          <span key={item.label} style={pill(item.color)}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIND RIDE PAGE — with working search + trip detail modal
// ═══════════════════════════════════════════════════════════════════════════════

interface Ride {
  id: string;
  driver: { name: string; nameAr: string; rating: number; verified: boolean; trips: number; phone: string; avatar: string; };
  from: string; fromAr: string; fromPoint?: string;
  to:   string; toAr:   string; toPoint?:   string;
  date: string; time: string;
  seatsAvailable: number; totalSeats: number;
  pricePerSeat: number; distance: number; duration: string;
  genderPref: 'mixed'|'women_only'|'family_only';
  amenities: string[];
  prayerStops: boolean; ramadan?: boolean;
  car: string; carColor?: string;
  pkgCapacity: 'none'|'small'|'medium'|'large';
  conversationLevel: 'quiet'|'normal'|'talkative';
  intermediateStops?: string[];
  reviews?: { name:string; rating:number; text:string }[];
}

const ALL_RIDES: Ride[] = [
  {
    id:'r1', driver:{ name:'Ahmad Hassan', nameAr:'أحمد حسن', rating:4.9, verified:true, trips:1240, phone:'+962790000001', avatar:'AH' },
    from:'Amman', fromAr:'عمّان', fromPoint:'8th Circle', to:'Aqaba', toAr:'العقبة', toPoint:'City Center',
    date:'2026-03-25', time:'07:00', seatsAvailable:2, totalSeats:4, pricePerSeat:8, distance:330, duration:'4h',
    genderPref:'mixed', amenities:['A/C','Wi-Fi','Charger'], prayerStops:true, ramadan:true,
    car:'Toyota Camry 2024', carColor:'#C0C0C0', pkgCapacity:'medium', conversationLevel:'normal',
    intermediateStops:['Karak (brief stop)'],
    reviews:[{ name:'Khalid N.', rating:5, text:'Very professional driver, on time and clean car.' }],
  },
  {
    id:'r2', driver:{ name:'Sara Al-Khalidi', nameAr:'سارة الخالدي', rating:4.8, verified:true, trips:876, phone:'+962790000002', avatar:'SK' },
    from:'Amman', fromAr:'عمّان', fromPoint:'Abdali Terminal', to:'Irbid', toAr:'إربد', toPoint:'University District',
    date:'2026-03-25', time:'08:30', seatsAvailable:3, totalSeats:3, pricePerSeat:4, distance:85, duration:'1.5h',
    genderPref:'women_only', amenities:['A/C','Quiet ride'], prayerStops:false,
    car:'Honda Civic 2023', carColor:'#FFFFFF', pkgCapacity:'small', conversationLevel:'quiet',
    reviews:[{ name:'Hana M.', rating:5, text:'Great driver, felt very safe. Will use again!' }],
  },
  {
    id:'r3', driver:{ name:'Khalid Nabulsi', nameAr:'خالد النابلسي', rating:4.7, verified:true, trips:543, phone:'+962790000003', avatar:'KN' },
    from:'Amman', fromAr:'عمّان', fromPoint:'Sweifieh', to:'Dead Sea', toAr:'البحر الميت', toPoint:'Zara Resort',
    date:'2026-03-25', time:'09:00', seatsAvailable:1, totalSeats:4, pricePerSeat:7, distance:60, duration:'1h',
    genderPref:'mixed', amenities:['A/C','Music','Large trunk'], prayerStops:false,
    car:'Kia Sportage 2022', carColor:'#1a3a6a', pkgCapacity:'large', conversationLevel:'talkative',
  },
  {
    id:'r4', driver:{ name:'Lina Al-Masri', nameAr:'لينا المصري', rating:5.0, verified:true, trips:320, phone:'+962790000004', avatar:'LM' },
    from:'Amman', fromAr:'عمّان', fromPoint:'Gardens', to:'Petra', toAr:'البتراء', toPoint:'Visitor Center',
    date:'2026-03-26', time:'06:30', seatsAvailable:2, totalSeats:4, pricePerSeat:12, distance:215, duration:'3h',
    genderPref:'family_only', amenities:['A/C','Family friendly','Booster seat'], prayerStops:true,
    car:'Hyundai Tucson 2024', carColor:'#1a1a1a', pkgCapacity:'medium', conversationLevel:'normal',
  },
  {
    id:'r5', driver:{ name:'Omar Zaid', nameAr:'عمر زيد', rating:4.6, verified:true, trips:189, phone:'+962790000005', avatar:'OZ' },
    from:'Irbid', fromAr:'إربد', fromPoint:'University Gate', to:'Amman', toAr:'عمّان', toPoint:'7th Circle',
    date:'2026-03-25', time:'14:00', seatsAvailable:3, totalSeats:4, pricePerSeat:4, distance:85, duration:'1.5h',
    genderPref:'mixed', amenities:['A/C'], prayerStops:false,
    car:'Hyundai Elantra 2021', carColor:'#333', pkgCapacity:'small', conversationLevel:'normal',
  },
  {
    id:'r6', driver:{ name:'Nour Awamleh', nameAr:'نور العوامله', rating:4.9, verified:true, trips:710, phone:'+962790000006', avatar:'NA' },
    from:'Amman', fromAr:'عمّان', fromPoint:'Mecca Mall', to:'Aqaba', toAr:'العقبة', toPoint:'South Beach',
    date:'2026-03-25', time:'06:00', seatsAvailable:1, totalSeats:3, pricePerSeat:9, distance:330, duration:'4h',
    genderPref:'women_only', amenities:['A/C','Prayer stop','Charger'], prayerStops:true, ramadan:true,
    car:'Toyota Corolla 2023', carColor:'#FFFFFF', pkgCapacity:'medium', conversationLevel:'quiet',
  },
];

const CITIES = ['Amman','Aqaba','Irbid','Zarqa','Dead Sea','Karak','Madaba','Petra','Jerash','Mafraq','Salt'];

const GENDER_META: Record<string, { label:string; labelAr:string; emoji:string; color:string }> = {
  mixed:       { label:'Mixed',       labelAr:'مختلط',    emoji:'👥', color:DS.cyan  },
  women_only:  { label:'Women Only',  labelAr:'نساء فقط', emoji:'🚺', color:'#FF69B4'},
  family_only: { label:'Family Only', labelAr:'عائلة',    emoji:'👨‍👩‍👧', color:DS.gold  },
};

const RIDE_BOOKINGS_KEY = 'wasel-find-ride-bookings';
const RIDE_SEARCHES_KEY = 'wasel-find-ride-searches';
const OFFER_RIDE_DRAFT_KEY = 'wasel-offer-ride-draft';

function readStoredStringList(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredStringList(key: string, values: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

function readStoredObject<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function buildRideFromPostedRide(ride: PostedRide): Ride {
  const capacityLabel = ride.packageCapacity === 'large'
    ? 'Large trunk'
    : ride.packageCapacity === 'small'
      ? 'Compact package lane'
      : 'Package lane ready';

  return {
    id: `live-${ride.id}`,
    driver: {
      name: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
      nameAr: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
      rating: 4.8,
      verified: true,
      trips: 0,
      phone: '+962790000000',
      avatar: (ride.carModel || 'Wasel').slice(0, 2).toUpperCase(),
    },
    from: ride.from,
    fromAr: ride.from,
    fromPoint: 'Shared pickup point',
    to: ride.to,
    toAr: ride.to,
    toPoint: 'Shared dropoff point',
    date: ride.date || new Date().toISOString().slice(0, 10),
    time: ride.time || 'Flexible',
    seatsAvailable: Math.max(1, ride.seats),
    totalSeats: Math.max(1, ride.seats),
    pricePerSeat: Math.max(0, ride.price),
    distance: 0,
    duration: 'Live route',
    genderPref: ride.gender === 'women_only' ? 'women_only' : ride.gender === 'family_only' ? 'family_only' : 'mixed',
    amenities: ['Live post', ride.carModel || 'Private vehicle', capacityLabel],
    prayerStops: ride.prayer,
    car: ride.carModel || 'Private vehicle',
    pkgCapacity: ride.acceptsPackages ? ride.packageCapacity : 'none',
    conversationLevel: 'normal',
    reviews: ride.note ? [{ name: 'Route note', rating: 5, text: ride.note }] : undefined,
  };
}

// ── Trip Detail Modal ─────────────────────────────────────────────────────────
function TripDetailModal({ ride, onClose, onBook, booked }: {
  ride: Ride; onClose: ()=>void; onBook: ()=>void; booked: boolean;
}) {
  const gm = GENDER_META[ride.genderPref];
  const levelIcon = ride.conversationLevel === 'quiet' ? '🤫' : ride.conversationLevel === 'talkative' ? '🗣️' : '💬';
  const levelLabel = ride.conversationLevel === 'quiet' ? 'Quiet ride' : ride.conversationLevel === 'talkative' ? 'Talkative' : 'Normal';
  const pickupCoord = resolveCityCoord(ride.from);
  const dropoffCoord = resolveCityCoord(ride.to);
  const driverCoord = midpoint(pickupCoord, dropoffCoord);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      >
        <motion.div
          initial={{ scale:0.9, opacity:0, y:30 }} animate={{ scale:1, opacity:1, y:0 }}
          exit={{ scale:0.9, opacity:0, y:30 }} transition={{ type:'spring', damping:25, stiffness:300 }}
          onClick={e => e.stopPropagation()}
          style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:r(24), width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' }}
        >
          {/* Modal header */}
          <div style={{ background:`linear-gradient(135deg, ${DS.navy}, #1a3a6a)`, borderRadius:`${r(24)} ${r(24)} 0 0`, padding:'24px 28px', position:'sticky', top:0, zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h2 style={{ color:'#fff', fontWeight:900, fontSize:'1.2rem', margin:0 }}>Trip Details</h2>
              <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', width:36, height:36, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                <X size={18} />
              </button>
            </div>
            {/* Route summary */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:800, color:'#fff', fontSize:'1.1rem' }}>{ride.from}</div>
                <div style={{ color:DS.cyan, fontSize:'0.75rem' }}>{ride.fromPoint}</div>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:'100%', height:2, background:`linear-gradient(90deg,${DS.green},${DS.cyan})`, borderRadius:2 }} />
                <span style={{ color:DS.sub, fontSize:'0.72rem' }}>{ride.duration} · {ride.distance} km</span>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:800, color:'#fff', fontSize:'1.1rem' }}>{ride.to}</div>
                <div style={{ color:DS.cyan, fontSize:'0.75rem' }}>{ride.toPoint}</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>

            {/* Driver info */}
            <div style={{ background:DS.card2, borderRadius:r(16), padding:'18px 20px', border:`1px solid ${DS.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:52, height:52, borderRadius:r(14), background:DS.gradC, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:'1.1rem', flexShrink:0 }}>
                  {ride.driver.avatar}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:800, color:'#fff', fontSize:'1.05rem' }}>{ride.driver.name}</span>
                    {ride.driver.verified && <span style={{ ...pill(DS.green), fontSize:'0.6rem' }}><CheckCircle2 size={9} /> Verified</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                    <Star size={13} fill="#F59E0B" color="#F59E0B" />
                    <span style={{ color:'#F59E0B', fontWeight:700, fontSize:'0.82rem' }}>{ride.driver.rating}</span>
                    <span style={{ color:DS.muted, fontSize:'0.75rem' }}>· {ride.driver.trips} trips</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <a href={`https://wa.me/${ride.driver.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                    style={{ width:38, height:38, borderRadius:r(10), background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.25)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                </div>
              </div>
              <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(0,0,0,0.2)', borderRadius:r(10) }}>
                <Car size={14} color={DS.cyan} />
                <span style={{ color:'#fff', fontWeight:600, fontSize:'0.85rem' }}>{ride.car}</span>
              </div>
            </div>

            {/* Trip details grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { icon:<Calendar size={14} />, label:'Date', val:ride.date },
                { icon:<Clock size={14} />, label:'Departure', val:ride.time },
                { icon:<Users size={14} />, label:'Seats left', val:`${ride.seatsAvailable} / ${ride.totalSeats}` },
                { icon:<Navigation size={14} />, label:'Distance', val:`${ride.distance} km` },
              ].map(item => (
                <div key={item.label} style={{ background:DS.card2, borderRadius:r(12), padding:'14px 16px', border:`1px solid ${DS.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ color:DS.cyan }}>{item.icon}</span>
                    <span style={{ color:DS.muted, fontSize:'0.7rem', fontWeight:600 }}>{item.label}</span>
                  </div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>{item.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background:DS.card2, borderRadius:r(16), padding:'14px', border:`1px solid ${DS.border}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10, flexWrap:'wrap' }}>
                <div>
                  <p style={{ color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 4px' }}>Route Map</p>
                  <p style={{ color:DS.sub, fontSize:'0.8rem', margin:0 }}>A clear preview of pickup, destination, and route direction.</p>
                </div>
                <span style={{ ...pill(DS.cyan), fontSize:'0.72rem' }}>Friendly map preview</span>
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

            {/* Amenities */}
            <div>
              <p style={{ color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Amenities</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {ride.amenities.map(a => (
                  <span key={a} style={{ ...pill(DS.cyan), padding:'5px 12px', fontSize:'0.75rem' }}>{a}</span>
                ))}
                {ride.prayerStops && <span style={{ ...pill(DS.gold), padding:'5px 12px', fontSize:'0.75rem' }}>🕌 Prayer stops</span>}
                {ride.ramadan && <span style={{ ...pill('#A78BFA'), padding:'5px 12px', fontSize:'0.75rem' }}>🌙 Ramadan</span>}
                <span style={{ ...pill(GENDER_META[ride.genderPref].color), padding:'5px 12px', fontSize:'0.75rem' }}>
                  {GENDER_META[ride.genderPref].emoji} {GENDER_META[ride.genderPref].label}
                </span>
                <span style={{ ...pill(DS.sub), padding:'5px 12px', fontSize:'0.75rem' }}>{levelIcon} {levelLabel}</span>
              </div>
            </div>

            {/* Intermediate stops */}
            {ride.intermediateStops && ride.intermediateStops.length > 0 && (
              <div style={{ background:DS.card2, borderRadius:r(12), padding:'14px 18px', border:`1px solid ${DS.border}` }}>
                <p style={{ color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Route Stops</p>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ color:'#fff', fontWeight:600, fontSize:'0.82rem' }}>{ride.from}</span>
                  {ride.intermediateStops.map(s => (
                    <span key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <ChevronRight size={12} color={DS.muted} />
                      <span style={{ color:DS.cyan, fontWeight:600, fontSize:'0.82rem' }}>{s}</span>
                    </span>
                  ))}
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <ChevronRight size={12} color={DS.muted} />
                    <span style={{ color:'#fff', fontWeight:600, fontSize:'0.82rem' }}>{ride.to}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Reviews */}
            {ride.reviews && ride.reviews.length > 0 && (
              <div>
                <p style={{ color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Passenger Reviews</p>
                {ride.reviews.map((rv, i) => (
                  <div key={i} style={{ background:DS.card2, borderRadius:r(12), padding:'14px 16px', border:`1px solid ${DS.border}`, marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontWeight:700, color:'#fff', fontSize:'0.85rem' }}>{rv.name}</span>
                      <div style={{ display:'flex', gap:2 }}>
                        {Array.from({ length: rv.rating }).map((_, j) => <Star key={j} size={11} fill="#F59E0B" color="#F59E0B" />)}
                      </div>
                    </div>
                    <p style={{ color:DS.sub, fontSize:'0.8rem', margin:0 }}>{rv.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Price + Book */}
            <div style={{ background:`linear-gradient(135deg, ${DS.navy}, #1a3a6a)`, borderRadius:r(16), padding:'20px 24px', border:`1px solid ${DS.cyan}20`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ color:DS.sub, fontSize:'0.75rem', marginBottom:4 }}>Price per seat</div>
                <div style={{ color:DS.cyan, fontWeight:900, fontSize:'2rem' }}>{ride.pricePerSeat} <span style={{ fontSize:'1rem', fontWeight:600 }}>JOD</span></div>
                <div style={{ color:DS.muted, fontSize:'0.72rem', marginTop:2 }}>~{Math.round(ride.pricePerSeat * 1.41)} USD</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
                <motion.button
                  whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                  onClick={onBook}
                  style={{
                    height:50, padding:'0 32px', borderRadius:'99px', border:'none', cursor:'pointer',
                    background: booked ? DS.gradG : DS.gradC,
                    color:'#fff', fontWeight:800, fontSize:'0.95rem',
                    boxShadow:`0 8px 24px ${booked ? DS.green : DS.cyan}40`,
                  }}
                >
                  {booked ? '✓ Booked!' : 'Confirm Booking'}
                </motion.button>
                <div style={{ display:'flex', gap:8 }}>
                  <a
                    href={`https://wa.me/${ride.driver.phone.replace(/[^0-9]/g,'')}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ ...pill('#25D366'), padding:'6px 14px', fontSize:'0.75rem', textDecoration:'none', cursor:'pointer' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366" style={{ marginRight:4 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Ride Card ─────────────────────────────────────────────────────────────────
function RideCard({ ride, idx, onOpen, booked = false }: { ride:Ride; idx:number; onOpen:()=>void; booked?: boolean }) {
  const gm = GENDER_META[ride.genderPref];
  return (
    <motion.div
      initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: idx * 0.06, type:'spring', stiffness:380, damping:28 }}
      whileHover={{ y:-3, boxShadow:`0 12px 40px rgba(0,200,232,0.12)` }}
      onClick={onOpen}
      style={{ background:DS.card, borderRadius:r(20), border:`1px solid ${DS.border}`, cursor:'pointer', overflow:'hidden', transition:'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = DS.borderH}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = DS.border}
    >
      {/* Glow accent */}
      <div style={{ height:2, background:DS.gradC }} />
      <div className="sp-ride-card-body" style={{ padding:'20px 24px' }}>
        {/* Driver row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:44, height:44, borderRadius:r(12), background:DS.gradC, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:'0.95rem' }}>
                {ride.driver.avatar}
              </div>
              {ride.driver.verified && (
                <div style={{ position:'absolute', bottom:-2, right:-2, width:16, height:16, borderRadius:'50%', background:DS.cyan, border:`2px solid ${DS.card}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle2 size={9} color="#fff" />
                </div>
              )}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontWeight:800, color:'#fff', fontSize:'0.92rem' }}>{ride.driver.name}</span>
                {ride.driver.verified && <span style={{ ...pill(DS.green), fontSize:'0.58rem' }}>Verified</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                <Star size={11} fill="#F59E0B" color="#F59E0B" />
                <span style={{ color:'#F59E0B', fontWeight:700, fontSize:'0.75rem' }}>{ride.driver.rating}</span>
                <span style={{ color:DS.muted, fontSize:'0.72rem' }}>· {ride.driver.trips} trips</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:DS.cyan, fontWeight:900, fontSize:'1.7rem', lineHeight:1 }}>{ride.pricePerSeat}</div>
            <div style={{ color:DS.muted, fontSize:'0.62rem', fontWeight:600, marginTop:2 }}>JOD/seat</div>
          </div>
        </div>

        {/* Route bar */}
        <div style={{ background:'rgba(0,0,0,0.25)', borderRadius:r(14), padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, color:'#fff', fontSize:'0.92rem' }}>{ride.from}</div>
            <div style={{ color:DS.muted, fontSize:'0.7rem', marginTop:1 }}>
              <Clock size={10} style={{ display:'inline', marginRight:3 }} />{ride.time}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:DS.green, boxShadow:`0 0 8px ${DS.green}60` }} />
            <div style={{ width:1, height:22, background:`linear-gradient(180deg,${DS.green},${DS.cyan})` }} />
            <div style={{ width:7, height:7, borderRadius:'50%', background:DS.cyan, boxShadow:`0 0 8px ${DS.cyan}60` }} />
            <span style={{ color:DS.muted, fontSize:'0.62rem', fontWeight:600, marginTop:2 }}>{ride.duration}</span>
          </div>
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ fontWeight:800, color:'#fff', fontSize:'0.92rem' }}>{ride.to}</div>
            <div style={{ color:DS.muted, fontSize:'0.7rem', marginTop:1 }}>{ride.distance} km</div>
          </div>
        </div>

        {/* Badges + CTA */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <span style={pill(DS.cyan)}>
              <Users size={9} /> {ride.seatsAvailable} seats
            </span>
            <span style={pill(gm.color)}>{gm.emoji} {gm.label}</span>
            {ride.prayerStops && <span style={pill(DS.gold)}>🕌</span>}
            {ride.pkgCapacity !== 'none' && <span style={pill(DS.gold)}><Package size={9} /> {ride.pkgCapacity}</span>}
            {booked && <span style={pill(DS.green)}><CheckCircle2 size={9} /> Booked</span>}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
            <span style={{ color:booked ? DS.green : DS.muted, fontSize:'0.75rem' }}>{booked ? 'Reserved' : 'View details →'}</span>
            <motion.button
              whileTap={{ scale:0.94 }}
              onClick={e => { e.stopPropagation(); onOpen(); }}
              className="sp-book-btn" style={{ height:44, padding:'0 18px', borderRadius:'99px', border:'none', background:booked ? DS.gradG : DS.gradC, color:'#fff', fontWeight:800, fontSize:'0.82rem', boxShadow:`0 4px 16px ${booked ? DS.green : DS.cyan}30`, cursor:'pointer' }}
            >
              {booked ? 'Booked' : 'Book Seat'}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Find Ride Page ────────────────────────────────────────────────────────────
export function FindRidePage() {
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const corridorParams = new URLSearchParams(location.search);
  const initialFrom = CITIES.includes(corridorParams.get('from') ?? '') ? corridorParams.get('from')! : 'Amman';
  const initialTo = CITIES.includes(corridorParams.get('to') ?? '') ? corridorParams.get('to')! : 'Aqaba';
  const initialDate = corridorParams.get('date') ?? '';
  const initialSearched = corridorParams.get('search') === '1';
  const t = {
    from: ar ? 'من' : 'FROM',
    to: ar ? 'إلى' : 'TO',
    date: ar ? 'التاريخ' : 'DATE',
    searchRides: ar ? 'ابحث عن الرحلات' : 'Search Rides',
    searching: ar ? 'جاري البحث…' : 'Searching…',
    searchRoute: ar ? 'مسار البحث' : 'Search Route',
    previewCorridor: ar ? 'عاين المسار قبل استعراض الرحلات.' : 'Preview the corridor before browsing rides.',
    clearFirstStep: ar ? 'ابدأ من الخطوة الأولى' : 'Clear from the first step',
    popularRoutes: ar ? 'مسارات شائعة' : 'Popular routes',
    showing: ar ? 'عرض' : 'Showing',
    rides: ar ? 'رحلات' : 'rides',
    ride: ar ? 'رحلة' : 'ride',
    found: ar ? 'نتيجة' : 'found',
    cheapest: ar ? 'الأرخص' : 'Cheapest',
    earliest: ar ? 'الأبكر' : 'Earliest',
    topRated: ar ? 'الأعلى تقييماً' : 'Top Rated',
    noRidesFound: ar ? 'لا توجد رحلات' : 'No rides found',
    tryDifferent: ar ? 'جرّب مساراً أو تاريخاً مختلفاً' : 'Try a different route or date',
    routeReady: ar ? 'جاهزية المسار' : 'Route readiness',
    bookingReady: ar ? 'جاهزية الحجز' : 'Booking readiness',
    recentSearches: ar ? 'عمليات البحث الأخيرة' : 'Recent searches',
    recommendedForYou: ar ? 'موصى بها لك' : 'Recommended for you',
    instantMatch: ar ? 'مطابقة فورية' : 'Instant match',
    searchHelp: ar ? 'اختر مدينتين مختلفتين لعرض أفضل الرحلات.' : 'Choose two different cities to unlock the best rides.',
    dateHelp: ar ? 'التاريخ اختياري، لكن إضافته تجعل النتائج أدق.' : 'Date is optional, but it makes the results more precise.',
    bookedTrips: ar ? 'رحلاتك المحجوزة' : 'Your booked trips',
    bookingSaved: ar ? 'تم حفظ الحجز في حسابك.' : 'This booking is now saved in your account.',
    bookingStarted: ar ? 'تم بدء الحجز' : 'Booking started',
    chooseDifferentCities: ar ? 'اختر مدينتين مختلفتين.' : 'Choose different origin and destination cities.',
    routeSummary: ar ? 'ملخص المسار' : 'Route summary',
    seatsLeft: ar ? 'مقاعد متبقية' : 'Seats left',
    routeIntensity: ar ? 'كثافة المسار' : 'Route intensity',
    sendPackageTitle: ar ? 'أرسل طرداً مع رحلة' : 'Send a Package with a Ride',
    deliveryRoute: ar ? 'مسار التوصيل' : 'Delivery Route',
    deliveryHint: ar ? 'المسار يربط بين المرسل والراكب والمستلم في رحلة واحدة واضحة.' : 'The route connects sender, rider, and receiver in one clear trip.',
    packageFriendly: ar ? 'مناسب للطرود' : 'Package-friendly',
    weight: ar ? 'الوزن' : 'Weight',
    note: ar ? 'ملاحظة' : 'Note',
    notePh: ar ? 'قابل للكسر، يرجى التعامل بحذر…' : 'Fragile, handle with care…',
    sendPackageBtn: ar ? 'إرسال الطرد مع الرحلة' : 'Send Package with Ride',
    sentTitle: ar ? 'تم إرسال طلب الطرد للراكب!' : 'Package request sent to a rider!',
    sendAnother: ar ? 'أرسل طرداً آخر' : 'Send Another',
    matchingDesc: ar ? 'سنطابقك مع راكب موثوق متجه إلى' : "We'll match you with a verified rider heading to",
  };
  const [tab,      setTab]      = useState<'ride'|'package'>('ride');
  const [from,     setFrom]     = useState(initialFrom);
  const [to,       setTo]       = useState(initialTo);
  const [date,     setDate]     = useState(initialDate);
  const [searched, setSearched] = useState(initialSearched);
  const [loading,  setLoading]  = useState(false);
  const [sort,     setSort]     = useState<'price'|'time'|'rating'>('rating');
  const [selected, setSelected] = useState<Ride|null>(null);
  const [booked,   setBooked]   = useState<Set<string>>(() => new Set(readStoredStringList(RIDE_BOOKINGS_KEY)));
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readStoredStringList(RIDE_SEARCHES_KEY));
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [pkg,      setPkg]      = useState({ from:'Amman', to:'Aqaba', weight:'<1 kg', note:'', sent:false });
  const searchFromCoord = resolveCityCoord(from);
  const searchToCoord = resolveCityCoord(to);
  const connectedRides = getConnectedRides().map(buildRideFromPostedRide);
  const allAvailableRides = [...connectedRides, ...ALL_RIDES];

  // Filtered & sorted rides
  const results: Ride[] = searched
    ? allAvailableRides
        .filter(r =>
          (!from || r.from.toLowerCase().includes(from.toLowerCase()) || r.fromAr === from) &&
          (!to   || r.to.toLowerCase().includes(to.toLowerCase())   || r.toAr   === to) &&
          (!date || r.date === date)
        )
        .sort((a, b) =>
          sort === 'price'  ? a.pricePerSeat - b.pricePerSeat :
          sort === 'time'   ? a.time.localeCompare(b.time) :
          b.driver.rating - a.driver.rating
        )
    : allAvailableRides.slice(0, 4);

  const corridorRides = allAvailableRides.filter((ride) => ride.from === from && ride.to === to);
  const routeReadinessLabel = corridorRides.length >= 2 ? t.instantMatch : corridorRides.length === 1 ? t.bookingReady : t.searchHelp;
  const recommendedRides = [...results]
    .sort((a, b) => {
      const score = (ride: Ride) => (ride.driver.rating * 10) + (ride.seatsAvailable * 2) + (ride.prayerStops ? 2 : 0) + (ride.pkgCapacity !== 'none' ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, 2);
  const bookedRides = allAvailableRides.filter((ride) => booked.has(ride.id)).slice(0, 3);

  useEffect(() => {
    writeStoredStringList(RIDE_BOOKINGS_KEY, Array.from(booked));
  }, [booked]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextFrom = CITIES.includes(params.get('from') ?? '') ? params.get('from')! : 'Amman';
    const nextTo = CITIES.includes(params.get('to') ?? '') ? params.get('to')! : 'Aqaba';
    const nextDate = params.get('date') ?? '';
    const nextSearched = params.get('search') === '1';

    setFrom(nextFrom);
    setTo(nextTo);
    setDate(nextDate);
    setSearched(nextSearched);
  }, [location.search]);

  const handleSearch = () => {
    if (from === to) {
      setSearchError(t.chooseDifferentCities);
      setSearched(false);
      return;
    }

    setSearchError(null);
    setBookingMessage(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setRecentSearches((prev) => {
        const label = `${from} → ${to}${date ? ` • ${date}` : ''}`;
        return [label, ...prev.filter((item) => item !== label)].slice(0, 4);
      });
    }, 700);
  };

  const handleBook = (ride: Ride) => {
    setBooked(prev => new Set(prev).add(ride.id));
    setBookingMessage(`${ride.from} to ${ride.to} with ${ride.driver.name} is now reserved.`);
    notificationsAPI.createNotification({
      title: t.bookingStarted,
      message: `${ride.from} to ${ride.to} at ${ride.time} is now in your trips.`,
      type: 'booking',
      priority: 'high',
      action_url: '/app/find-ride',
    }).catch(() => {});
    if (permission === 'default') {
      requestPermission().catch(() => {});
    }
    notifyTripConfirmed(ride.driver.name, `${ride.from} to ${ride.to}`);
    setSelected(null);
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="🚗" title="Find a Ride" titleAr="ابحث عن رحلة"
          sub={ar ? 'مسارات يومية بين المدن · احجز مقعدك فورا' : '100+ daily intercity routes · Book a seat instantly'}
          action={{ label: ar ? '➕ أضف رحلة' : '➕ Offer a Ride', onClick:() => nav('/app/offer-ride') }} />
        <CoreExperienceBanner
          title="Jordan-first mobility network built for trusted intercity movement"
          detail="Every search is organized around trusted captains, live intercity corridors, and package-compatible routes so the experience feels clear, premium, and region-ready from the first step."
          tone={DS.cyan}
        />

        {/* Tab toggle */}
        <div style={{ display:'flex', gap:0, background:DS.card, borderRadius:r(14), padding:4, border:`1px solid ${DS.border}`, marginBottom:24 }}>
          {([
            ['ride', ar ? '🚗 ابحث عن رحلة' : '🚗 Find a Ride'],
            ['package', ar ? '📦 أرسل طرد' : '📦 Send Package'],
          ] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} className="w-focus" style={{
              flex:1, height:44, borderRadius:r(10), border:'none', cursor:'pointer', fontFamily:DS.F,
              fontWeight: tab===k ? 700 : 500, fontSize:'0.875rem',
              background: tab===k ? DS.gradC : 'transparent',
              color: tab===k ? '#fff' : DS.muted,
              boxShadow: tab===k ? `0 4px 16px ${DS.cyan}25` : 'none', transition:'all 0.18s',
            }}>{lbl}</button>
          ))}
        </div>

        {/* ══ RIDE TAB ══ */}
        {tab === 'ride' && (<>
          {/* Search card */}
          <div style={{ background:DS.card, borderRadius:r(20), padding:'22px 24px', border:`1px solid ${DS.border}`, marginBottom:24, boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
            <div className="sp-search-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 180px', gap:12, marginBottom:14 }}>
              {/* From */}
              <div>
                <label style={{ display:'block', fontSize:'0.62rem', color:DS.muted, fontWeight:700, letterSpacing: ar ? undefined : '0.1em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.from}</label>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,0.25)', borderRadius:r(10), padding:'0 14px', border:`1px solid ${DS.border}`, height:46 }}>
                  <MapPin size={15} color={DS.green} />
                  <select className="w-focus" value={from} onChange={e => setFrom(e.target.value)} style={{ background:'transparent', border:'none', color:'#fff', fontFamily:DS.F, fontWeight:600, fontSize:'0.9rem', flex:1, outline:'none', cursor:'pointer' }}>
                    {CITIES.map(c => <option key={c} value={c} style={{ background:DS.card }}>{c}</option>)}
                  </select>
                </div>
              </div>
              {/* To */}
              <div>
                <label style={{ display:'block', fontSize:'0.62rem', color:DS.muted, fontWeight:700, letterSpacing: ar ? undefined : '0.1em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.to}</label>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,0.25)', borderRadius:r(10), padding:'0 14px', border:`1px solid ${DS.border}`, height:46 }}>
                  <MapPin size={15} color={DS.cyan} />
                  <select className="w-focus" value={to} onChange={e => setTo(e.target.value)} style={{ background:'transparent', border:'none', color:'#fff', fontFamily:DS.F, fontWeight:600, fontSize:'0.9rem', flex:1, outline:'none', cursor:'pointer' }}>
                    {CITIES.map(c => <option key={c} value={c} style={{ background:DS.card }}>{c}</option>)}
                  </select>
                </div>
              </div>
              {/* Date */}
              <div>
                <label style={{ display:'block', fontSize:'0.62rem', color:DS.muted, fontWeight:700, letterSpacing: ar ? undefined : '0.1em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.date}</label>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,0.25)', borderRadius:r(10), padding:'0 14px', border:`1px solid ${DS.border}`, height:46 }}>
                  <Calendar size={15} color={DS.muted} />
                  <input className="w-focus" type="date" value={date} onChange={e => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ background:'transparent', border:'none', color:'#fff', fontFamily:DS.F, fontSize:'0.85rem', flex:1, outline:'none', colorScheme:'dark' }} />
                </div>
              </div>
            </div>
            <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }} onClick={handleSearch} className="w-focus"
              style={{ width:'100%', height:52, borderRadius:r(14), border:'none', background:DS.gradC, color:'#fff', fontWeight:800, fontSize:'1rem', fontFamily:DS.F, boxShadow:`0 8px 24px ${DS.cyan}30`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              {loading ? (
                <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} style={{ width:20, height:20, border:`2px solid rgba(255,255,255,0.3)`, borderTop:'2px solid #fff', borderRadius:'50%' }} />
              ) : <Search size={18} />}
              {loading ? t.searching : t.searchRides}
            </motion.button>
            <div style={{ marginTop:14, background:DS.card2, borderRadius:r(14), padding:'12px', border:`1px solid ${DS.border}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10, flexWrap:'wrap' }}>
                <div>
                  <p style={{ color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing: ar ? undefined : '0.08em', textTransform: ar ? undefined : 'uppercase', margin:'0 0 4px' }}>{t.searchRoute}</p>
                  <p style={{ color:DS.sub, fontSize:'0.8rem', margin:0 }}>{t.previewCorridor}</p>
                </div>
                <span style={{ ...pill(DS.green), fontSize:'0.72rem' }}>{t.clearFirstStep}</span>
              </div>
              <MapWrapper
                mode="static"
                center={midpoint(searchFromCoord, searchToCoord)}
                pickupLocation={searchFromCoord}
                dropoffLocation={searchToCoord}
                height={180}
                showMosques={false}
                showRadars={false}
              />
            </div>
            {searchError && (
              <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center', background:`${DS.gold}12`, border:`1px solid ${DS.gold}30`, borderRadius:r(14), padding:'12px 14px', color:'#fff', fontSize:'0.84rem' }}>
                <Shield size={16} color={DS.gold} />
                <span>{searchError}</span>
              </div>
            )}
            {bookingMessage && (
              <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center', background:'rgba(0,200,117,0.10)', border:'1px solid rgba(0,200,117,0.28)', borderRadius:r(14), padding:'12px 14px', color:'#fff', fontSize:'0.84rem' }}>
                <CheckCircle2 size={16} color={DS.green} />
                <span>{bookingMessage}</span>
              </div>
            )}
            <div className="sp-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12, marginTop:14 }}>
              <div style={{ background:DS.card2, borderRadius:r(14), padding:'14px 15px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:DS.muted, fontSize:'0.68rem', fontWeight:800, letterSpacing: ar ? undefined : '0.08em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.routeReady}</div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'0.88rem' }}>{routeReadinessLabel}</div>
                <div style={{ color:DS.sub, fontSize:'0.76rem', marginTop:6 }}>{corridorRides.length} {t.rides}</div>
              </div>
              <div style={{ background:DS.card2, borderRadius:r(14), padding:'14px 15px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:DS.muted, fontSize:'0.68rem', fontWeight:800, letterSpacing: ar ? undefined : '0.08em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.routeSummary}</div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'0.88rem' }}>{from} → {to}</div>
                <div style={{ color:DS.sub, fontSize:'0.76rem', marginTop:6 }}>{date || t.dateHelp}</div>
              </div>
              <div style={{ background:DS.card2, borderRadius:r(14), padding:'14px 15px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:DS.muted, fontSize:'0.68rem', fontWeight:800, letterSpacing: ar ? undefined : '0.08em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.routeIntensity}</div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'0.88rem' }}>{results.reduce((sum, ride) => sum + ride.seatsAvailable, 0)} {t.seatsLeft}</div>
                <div style={{ color:DS.sub, fontSize:'0.76rem', marginTop:6 }}>{t.dateHelp}</div>
              </div>
            </div>
          </div>

          <div className="sp-2col" style={{ display:'grid', gridTemplateColumns:'1.15fr 0.85fr', gap:14, marginBottom:18 }}>
            <div style={{ background:DS.card, borderRadius:r(18), padding:'18px 18px 16px', border:`1px solid ${DS.border}` }}>
              <div style={{ color:'#fff', fontWeight:800, marginBottom:12 }}>{t.recommendedForYou}</div>
              <div style={{ display:'grid', gap:10 }}>
                {recommendedRides.map((ride) => (
                  <button
                    key={ride.id}
                    onClick={() => setSelected(ride)}
                    style={{ textAlign:'left', borderRadius:r(14), border:`1px solid ${DS.border}`, background:DS.card2, padding:'12px 14px', cursor:'pointer' }}
                  >
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:'0.84rem' }}>{ride.from} to {ride.to}</div>
                        <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{ride.time} · {ride.driver.name} · {ride.car}</div>
                      </div>
                      <span style={{ ...pill(booked.has(ride.id) ? DS.green : DS.cyan) }}>{booked.has(ride.id) ? 'Booked' : `${ride.pricePerSeat} JOD`}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gap:14 }}>
              <div style={{ background:DS.card, borderRadius:r(18), padding:'18px 18px 16px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:'#fff', fontWeight:800, marginBottom:12 }}>{t.recentSearches}</div>
                {recentSearches.length > 0 ? (
                  <div style={{ display:'grid', gap:10 }}>
                    {recentSearches.map((item) => (
                      <div key={item} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, background:DS.card2, padding:'11px 12px', color:DS.sub, fontSize:'0.78rem' }}>{item}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color:DS.muted, fontSize:'0.8rem' }}>{t.searchHelp}</div>
                )}
              </div>
              <div style={{ background:DS.card, borderRadius:r(18), padding:'18px 18px 16px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:'#fff', fontWeight:800, marginBottom:12 }}>{t.bookedTrips}</div>
                {bookedRides.length > 0 ? (
                  <div style={{ display:'grid', gap:10 }}>
                    {bookedRides.map((ride) => (
                      <div key={ride.id} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, background:DS.card2, padding:'11px 12px' }}>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:'0.8rem' }}>{ride.from} to {ride.to}</div>
                        <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{ride.time} · {ride.driver.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color:DS.muted, fontSize:'0.8rem' }}>{t.bookingSaved}</div>
                )}
              </div>
            </div>
          </div>

          {/* Results header */}
          <div className="sp-results-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <h2 style={{ color:'#fff', fontWeight:800, fontSize:'0.95rem', margin:0 }}>
              {searched
                ? `${from} ${ar ? '←' : '→'} ${to} · ${results.length} ${ar ? t.ride : `ride${results.length !== 1 ? 's' : ''}`} ${t.found}`
                : `${t.popularRoutes} · ${t.showing} ${results.length} ${t.rides}`}
            </h2>
            <div className="sp-sort-bar" style={{ display:'flex', gap:6 }}>
              {([['price',t.cheapest],['time',t.earliest],['rating',t.topRated]] as const).map(([k, lbl]) => (
                <button key={k} onClick={() => setSort(k)} className="sp-sort-btn w-focus" style={{
                  padding:'6px 14px', borderRadius:'99px', border:`1px solid ${sort===k ? DS.cyan : DS.border}`,
                  background: sort===k ? `${DS.cyan}15` : DS.card2,
                  color: sort===k ? DS.cyan : DS.sub, fontSize:'0.75rem', fontWeight:700, fontFamily:DS.F, cursor:'pointer',
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Ride cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <AnimatePresence>
              {results.length === 0 ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  style={{ background:DS.card, borderRadius:r(20), padding:'60px 24px', textAlign:'center', border:`1px solid ${DS.border}` }}>
                  <div style={{ fontSize:'3rem', marginBottom:16 }}>🔍</div>
                  <h3 style={{ color:'#fff', fontWeight:800, marginBottom:8 }}>{t.noRidesFound}</h3>
                  <p style={{ color:DS.sub, fontSize:'0.875rem' }}>{t.tryDifferent}</p>
                </motion.div>
              ) : results.map((ride, i) => (
                <RideCard key={ride.id} ride={ride} idx={i}
                  booked={booked.has(ride.id)}
                  onOpen={() => setSelected(ride)} />
              ))}
            </AnimatePresence>
          </div>
        </>)}

        {/* ══ PACKAGE TAB ══ */}
        {tab === 'package' && (
          <div style={{ background:DS.card, borderRadius:r(20), padding:'28px 28px', border:`1px solid ${DS.border}` }}>
            {pkg.sent ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:16 }}>📦</div>
                <h3 style={{ color:DS.green, fontWeight:900, fontSize:'1.3rem' }}>{t.sentTitle}</h3>
                <p style={{ color:DS.sub, marginTop:8 }}>{t.matchingDesc} {pkg.to}.</p>
                <button className="w-focus" onClick={() => setPkg(p => ({ ...p, sent:false }))} style={{ marginTop:20, padding:'10px 24px', borderRadius:'99px', border:`1px solid ${DS.border}`, background:DS.card2, color:DS.cyan, cursor:'pointer', fontFamily:DS.F, fontWeight:700 }}>{t.sendAnother}</button>
              </div>
            ) : (<>
              <h3 style={{ color:'#fff', fontWeight:800, marginBottom:20 }}>📦 {t.sendPackageTitle}</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:10, marginBottom:18 }}>
                {[
                  { title: ar ? 'المرسل' : 'Sender', desc: ar ? 'اختر المدينة والوزن والملاحظة.' : 'Choose city, weight, and note.' },
                  { title: ar ? 'الراكب' : 'Rider', desc: ar ? 'نطابق الطلب مع رحلة حقيقية.' : 'We match to a real trip.' },
                  { title: ar ? 'المستلم' : 'Receiver', desc: ar ? 'التسليم يتم على نفس المسار.' : 'Delivery finishes on the same route.' },
                ].map((step) => (
                  <div key={step.title} style={{ borderRadius:r(14), padding:'12px 13px', border:`1px solid ${DS.border}`, background:DS.card2 }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:'0.84rem', marginBottom:4 }}>{step.title}</div>
                    <div style={{ color:DS.sub, fontSize:'0.74rem', lineHeight:1.5 }}>{step.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gap:14, gridTemplateColumns:'1fr 1fr' }}>
                {[
                  { label:t.from, value:pkg.from, key:'from' as const },
                  { label:t.to,   value:pkg.to,   key:'to'   as const },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing: ar ? undefined : '0.1em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{f.label}</label>
                    <select className="w-focus" value={f.value} onChange={e => setPkg(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', cursor:'pointer' }}>
                      {CITIES.map(c => <option key={c} value={c} style={{ background:DS.card }}>{c}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing: ar ? undefined : '0.1em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.weight}</label>
                  <select className="w-focus" value={pkg.weight} onChange={e => setPkg(p => ({ ...p, weight:e.target.value }))}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', cursor:'pointer' }}>
                    {['<1 kg','1–3 kg','3–5 kg','5–10 kg'].map(w => <option key={w} style={{ background:DS.card }}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.72rem', fontWeight:700, letterSpacing: ar ? undefined : '0.1em', textTransform: ar ? undefined : 'uppercase', marginBottom:6 }}>{t.note}</label>
                  <input className="w-focus" placeholder={t.notePh} value={pkg.note} onChange={e => setPkg(p => ({ ...p, note:e.target.value }))}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <div style={{ marginTop:16, background:DS.card2, borderRadius:r(14), padding:'12px', border:`1px solid ${DS.border}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10, flexWrap:'wrap' }}>
                  <div>
                    <p style={{ color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing: ar ? undefined : '0.08em', textTransform: ar ? undefined : 'uppercase', margin:'0 0 4px' }}>{t.deliveryRoute}</p>
                    <p style={{ color:DS.sub, fontSize:'0.8rem', margin:0 }}>{t.deliveryHint}</p>
                  </div>
                  <span style={{ ...pill(DS.gold), fontSize:'0.72rem' }}>{t.packageFriendly}</span>
                </div>
                <MapWrapper
                  mode="static"
                  center={midpoint(resolveCityCoord(pkg.from), resolveCityCoord(pkg.to))}
                  pickupLocation={resolveCityCoord(pkg.from)}
                  dropoffLocation={resolveCityCoord(pkg.to)}
                  height={180}
                  showMosques={false}
                  showRadars={false}
                />
              </div>
              <motion.button whileTap={{ scale:0.97 }} onClick={() => setPkg(p => ({ ...p, sent:true }))} className="w-focus-gold"
                style={{ marginTop:20, width:'100%', height:52, borderRadius:r(14), border:'none', background:DS.gradGold, color:'#fff', fontWeight:800, fontSize:'0.95rem', fontFamily:DS.F, boxShadow:`0 8px 24px ${DS.gold}30`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'0 18px' }}>
                📦 {t.sendPackageBtn}
              </motion.button>
            </>)}
          </div>
        )}

        {/* Trip Detail Modal */}
        {selected && (
          <TripDetailModal
            ride={selected}
            booked={booked.has(selected.id)}
            onClose={() => setSelected(null)}
            onBook={() => handleBook(selected)}
          />
        )}
      </PageShell>
    </Protected>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFER RIDE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function OfferRidePage() {
  const nav = useIframeSafeNavigate();
  const defaultForm = {
    from:'Amman',
    to:'Aqaba',
    date:'',
    time:'07:00',
    seats:3,
    price:8,
    gender:'mixed',
    prayer:false,
    carModel:'',
    note:'',
    acceptsPackages:true,
    packageCapacity:'medium',
    packageNote:'Small and medium parcels accepted on this trip.',
  };
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => readStoredObject(OFFER_RIDE_DRAFT_KEY, defaultForm));
  const [submitted, setSubmitted] = useState(false);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [busyState, setBusyState] = useState<'idle' | 'posting'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>('Draft autosaves on this device.');
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const up = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const corridorCount = getConnectedRides().filter((ride) => ride.from === form.from && ride.to === form.to).length;
  const recentPostedRides = getConnectedRides().filter((ride) => ride.from === form.from && ride.to === form.to).slice(0, 3);

  useEffect(() => {
    setNetworkStats(getConnectedStats());
  }, [submitted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OFFER_RIDE_DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  function validateCurrentStep(targetStep: number) {
    if (targetStep >= 1) {
      if (form.from === form.to) return 'Origin and destination need to be different.';
      if (!form.date) return 'Choose a departure date.';
      if (!form.time) return 'Choose a departure time.';
    }
    if (targetStep >= 2) {
      if (form.seats < 1 || form.seats > 7) return 'Seats should be between 1 and 7.';
      if (form.price < 1 || form.price > 50) return 'Price should be between 1 and 50 JOD.';
      if (!form.carModel.trim()) return 'Add the car model so riders know what to expect.';
    }
    if (targetStep >= 3 && form.acceptsPackages && !form.packageNote.trim()) {
      return 'Add a short package note when package delivery is enabled.';
    }
    return null;
  }

  function moveToStep(targetStep: number) {
    const nextError = validateCurrentStep(targetStep - 1);
    if (nextError) {
      setFormError(nextError);
      return;
    }
    setFormError(null);
    setStep(targetStep);
  }

  async function handlePostRide() {
    const nextError = validateCurrentStep(3);
    if (nextError) {
      setFormError(nextError);
      return;
    }

    setBusyState('posting');
    setFormError(null);

    try {
      const createdRide = await createConnectedRide({
        from: form.from,
        to: form.to,
        date: form.date,
        time: form.time,
        seats: form.seats,
        price: form.price,
        gender: form.gender,
        prayer: form.prayer,
        carModel: form.carModel,
        note: form.note,
        acceptsPackages: form.acceptsPackages,
        packageCapacity: form.packageCapacity as 'small' | 'medium' | 'large',
        packageNote: form.packageNote,
      });

      setSubmitted(true);
      setDraftMessage('Ride posted and draft cleared.');
      setNetworkStats(getConnectedStats());
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OFFER_RIDE_DRAFT_KEY);
      }

      notificationsAPI.createNotification({
        title: 'Ride posted successfully',
        message: form.acceptsPackages
          ? `Your ${form.from} to ${form.to} ride is live and accepting packages.`
          : `Your ${form.from} to ${form.to} ride is now live.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/offer-ride',
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }
      notifyTripConfirmed('Wasel Network', `${createdRide.from} to ${createdRide.to}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not post the ride right now.');
    } finally {
      setBusyState('idle');
    }
  }

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="+" title="Offer a Ride" titleAr="Ride Posting" sub="Share your journey - Earn fuel money - Carry passengers and packages together" color={DS.blue} />
        <CoreExperienceBanner
          title="Publish one trip for riders and packages together"
          detail="Offer Ride now acts as a supply tool for the full Wasel network. Drivers can expose seats, parcel space, and corridor availability in one trusted posting flow."
          tone={DS.blue}
        />
        <div className="sp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
          {[
            { label:'Posted rides', value:String(networkStats.ridesPosted), detail:'Connected across the app', color:DS.cyan },
            { label:'Package-ready rides', value:String(networkStats.packageEnabledRides), detail:'Visible to package search', color:DS.gold },
            { label:'Packages matched', value:String(networkStats.matchedPackages), detail:'Matched through ride routes', color:DS.green },
            { label:'Network activity', value:String(networkStats.packagesCreated), detail:'Tracked requests created', color:DS.blue },
          ].map((item) => (
            <div key={item.label} style={{ background:'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius:r(18), border:`1px solid ${DS.border}`, padding:'18px 18px 16px', boxShadow:'0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color:item.color, fontWeight:900, fontSize:'1.2rem', marginBottom:4 }}>{item.value}</div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:'0.84rem' }}>{item.label}</div>
              <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{item.detail}</div>
            </div>
          ))}
        </div>
        {submitted ? (
          <div style={{ background:DS.card, borderRadius:r(20), padding:'60px 28px', textAlign:'center', border:`1px solid ${DS.border}` }}>
            <div style={{ fontSize:'4rem', marginBottom:20 }}>OK</div>
            <h2 style={{ color:DS.green, fontWeight:900, fontSize:'1.5rem', margin:'0 0 12px' }}>Ride Posted!</h2>
            <p style={{ color:DS.sub }}>Your ride from <strong style={{ color:'#fff' }}>{form.from}</strong> to <strong style={{ color:'#fff' }}>{form.to}</strong> is now live.</p>
            <p style={{ color:DS.muted, fontSize:'0.85rem', marginTop:8 }}>
              {form.acceptsPackages
                ? 'Passengers and package requests can now discover this route from across the app.'
                : 'Passengers will contact you when they book.'}
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12, maxWidth:720, margin:'22px auto 0' }}>
              {[
                { label:'Corridor readiness', value:corridorCount > 0 ? `${corridorCount + 1} live rides` : 'First live ride' },
                { label:'Delivery mode', value:form.acceptsPackages ? `Packages on (${form.packageCapacity})` : 'Passengers only' },
                { label:'Departure plan', value:`${form.date} at ${form.time}` },
              ].map((item) => (
                <div key={item.label} style={{ background:DS.card2, borderRadius:r(14), padding:'14px 15px', border:`1px solid ${DS.border}` }}>
                  <div style={{ color:DS.muted, fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{item.label}</div>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:'0.82rem', marginTop:6 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginTop:24 }}>
              <button onClick={() => {
                setSubmitted(false);
                setStep(1);
                setForm(defaultForm);
              }} style={{ padding:'12px 28px', borderRadius:'99px', border:'none', background:DS.gradC, color:'#fff', fontWeight:700, fontFamily:DS.F, cursor:'pointer' }}>Post Another</button>
            </div>
          </div>
        ) : (
          <div style={{ background:DS.card, borderRadius:r(20), padding:'28px 28px', border:`1px solid ${DS.border}` }}>
            <div className="sp-2col" style={{ display:'grid', gridTemplateColumns:'1.15fr 0.85fr', gap:14, marginBottom:20 }}>
              <div style={{ background:DS.card2, borderRadius:r(16), padding:'16px 18px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:'#fff', fontWeight:800, marginBottom:10 }}>Posting confidence</div>
                <div style={{ display:'grid', gap:10 }}>
                  {[
                    { label:'Live corridor', value:corridorCount > 0 ? `${corridorCount} rides already posted on this route` : 'No live rides on this route yet' },
                    { label:'Package visibility', value:form.acceptsPackages ? `Eligible for package matching (${form.packageCapacity})` : 'Passengers only' },
                    { label:'Draft status', value:draftMessage || 'Draft autosaves on this device.' },
                  ].map((item) => (
                    <div key={item.label} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 13px', background:DS.card }}>
                      <div style={{ color:DS.muted, fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{item.label}</div>
                      <div style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem', marginTop:6 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:DS.card2, borderRadius:r(16), padding:'16px 18px', border:`1px solid ${DS.border}` }}>
                <div style={{ color:'#fff', fontWeight:800, marginBottom:10 }}>Recent corridor posts</div>
                {recentPostedRides.length > 0 ? (
                  <div style={{ display:'grid', gap:10 }}>
                    {recentPostedRides.map((ride) => (
                      <div key={ride.id} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 13px', background:DS.card }}>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem' }}>{ride.from} to {ride.to}</div>
                        <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{ride.date} at {ride.time} · {ride.carModel || 'Vehicle pending'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color:DS.muted, fontSize:'0.8rem' }}>This route will become the first visible posting for the current corridor.</div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:28 }}>
              {[1,2,3].map(s => (
                <div key={s} style={{ flex:1, height:4, borderRadius:2, background: step >= s ? DS.gradC : DS.card2 }} />
              ))}
            </div>
            {formError && (
              <div style={{ marginBottom:18, display:'flex', gap:10, alignItems:'center', background:`${DS.gold}12`, border:`1px solid ${DS.gold}30`, borderRadius:r(14), padding:'12px 14px', color:'#fff', fontSize:'0.84rem' }}>
                <Shield size={16} color={DS.gold} />
                <span>{formError}</span>
              </div>
            )}

            {step === 1 && (
              <div style={{ display:'grid', gap:14, gridTemplateColumns:'1fr 1fr' }}>
                <h3 style={{ color:'#fff', fontWeight:800, gridColumn:'1/-1', margin:'0 0 4px' }}>Route Details</h3>
                {[{ l:'From', k:'from' as const }, { l:'To', k:'to' as const }].map(f => (
                  <div key={f.l}>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{f.l}</label>
                    <select value={form[f.k]} onChange={e => up(f.k, e.target.value)}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', cursor:'pointer' }}>
                      {CITIES.map(c => <option key={c} value={c} style={{ background:DS.card }}>{c}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Date</label>
                  <input type="date" value={form.date} onChange={e => up('date', e.target.value)}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', colorScheme:'dark', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Time</label>
                  <input type="time" value={form.time} onChange={e => up('time', e.target.value)}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', colorScheme:'dark', boxSizing:'border-box' }} />
                </div>
                <button onClick={() => moveToStep(2)} style={{ gridColumn:'1/-1', height:50, borderRadius:r(14), border:'none', background:DS.gradC, color:'#fff', fontWeight:800, fontFamily:DS.F, fontSize:'0.95rem', cursor:'pointer', boxShadow:`0 4px 20px ${DS.cyan}30` }}>
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={{ display:'grid', gap:14 }}>
                <h3 style={{ color:'#fff', fontWeight:800, margin:'0 0 4px' }}>Seats, Pricing, and Capacity</h3>
                {[
                  { l:'Available Seats', k:'seats' as const, type:'number', min:1, max:7 },
                  { l:'Price per Seat (JOD)', k:'price' as const, type:'number', min:1, max:50 },
                ].map(f => (
                  <div key={f.l}>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{f.l}</label>
                    <input type={f.type} min={f.min} max={f.max} value={(form as any)[f.k]} onChange={e => up(f.k, Number(e.target.value))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Car Model</label>
                  <input placeholder="e.g. Toyota Camry 2023" value={form.carModel} onChange={e => up('carModel', e.target.value)}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                </div>
                <button onClick={() => up('acceptsPackages', !form.acceptsPackages)} style={{
                  padding:'12px 18px', borderRadius:r(10), border:`1px solid ${form.acceptsPackages ? DS.green : DS.border}`,
                  background: form.acceptsPackages ? `${DS.green}10` : DS.card2, color: form.acceptsPackages ? DS.green : DS.sub,
                  fontFamily:DS.F, fontWeight:700, cursor:'pointer', textAlign:'left',
                }}>
                  Package network: {form.acceptsPackages ? 'Accepting packages on this ride' : 'Passengers only'}
                </button>
                {form.acceptsPackages && (
                  <div>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Package capacity</label>
                    <select value={form.packageCapacity} onChange={e => up('packageCapacity', e.target.value)}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', cursor:'pointer' }}>
                      {['small', 'medium', 'large'].map(size => <option key={size} value={size} style={{ background:DS.card }}>{size}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setStep(1)} style={{ flex:1, height:50, borderRadius:r(14), border:`1px solid ${DS.border}`, background:DS.card2, color:DS.sub, fontFamily:DS.F, fontWeight:700, cursor:'pointer' }}>Back</button>
                  <button onClick={() => moveToStep(3)} style={{ flex:2, height:50, borderRadius:r(14), border:'none', background:DS.gradC, color:'#fff', fontWeight:800, fontFamily:DS.F, cursor:'pointer', boxShadow:`0 4px 20px ${DS.cyan}30` }}>Continue</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display:'grid', gap:14 }}>
                <h3 style={{ color:'#fff', fontWeight:800, margin:'0 0 4px' }}>Preferences and Connected Delivery</h3>
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Gender Preference</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {Object.entries(GENDER_META).map(([k, v]) => (
                      <button key={k} onClick={() => up('gender', k)} style={{
                        padding:'8px 16px', borderRadius:'99px', border:`1px solid ${form.gender===k ? v.color : DS.border}`,
                        background: form.gender===k ? `${v.color}15` : DS.card2,
                        color: form.gender===k ? v.color : DS.sub, fontFamily:DS.F, fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                      }}>{v.label}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => up('prayer', !form.prayer)} style={{
                  padding:'12px 18px', borderRadius:r(10), border:`1px solid ${form.prayer ? DS.gold : DS.border}`,
                  background: form.prayer ? `${DS.gold}10` : DS.card2, color: form.prayer ? DS.gold : DS.sub,
                  fontFamily:DS.F, fontWeight:700, cursor:'pointer', textAlign:'left',
                }}>Prayer stops: {form.prayer ? 'Enabled' : 'Optional'}</button>
                {form.acceptsPackages && (
                  <div>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Package note</label>
                    <input placeholder="Example: compact parcels only" value={form.packageNote} onChange={e => up('packageNote', e.target.value)}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                  </div>
                )}
                <div>
                  <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Note for passengers</label>
                  <textarea rows={2} placeholder="Anything passengers should know" value={form.note} onChange={e => up('note', e.target.value)}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', resize:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ background:DS.card2, borderRadius:r(14), padding:'18px 20px', border:`1px solid ${DS.border}` }}>
                  <h4 style={{ color:DS.cyan, fontWeight:700, margin:'0 0 12px', fontSize:'0.85rem' }}>Summary</h4>
                  <div style={{ color:'#fff', fontSize:'0.9rem', lineHeight:1.8 }}>
                    {form.from} to {form.to} - {form.date || 'Choose date'} at {form.time}<br />
                    {form.seats} seats - {form.price} JOD/seat - {form.carModel || 'Car TBD'}<br />
                    {form.acceptsPackages ? `Packages enabled (${form.packageCapacity})` : 'Passengers only'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setStep(2)} style={{ flex:1, height:50, borderRadius:r(14), border:`1px solid ${DS.border}`, background:DS.card2, color:DS.sub, fontFamily:DS.F, fontWeight:700, cursor:'pointer' }}>Back</button>
                  <button disabled={busyState === 'posting'} onClick={handlePostRide} style={{ flex:2, height:50, borderRadius:r(14), border:'none', background:DS.gradG, color:'#fff', fontWeight:800, fontFamily:DS.F, cursor:busyState === 'posting' ? 'wait' : 'pointer', opacity:busyState === 'posting' ? 0.75 : 1, boxShadow:`0 4px 20px ${DS.green}30` }}>{busyState === 'posting' ? 'Posting connected ride...' : 'Post Connected Ride'}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageShell>
    </Protected>
  );
}

// ================================================================================
// PACKAGES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function PackagesPage() {
  const nav = useIframeSafeNavigate();
  const [activeTab, setActiveTab] = useState<'send'|'track'|'raje3'>('send');
  const [pkg, setPkg] = useState({ from:'Amman', to:'Aqaba', weight:'<1 kg', recipientName:'', recipientPhone:'', note:'', sent:false, trackingId:'' });
  const [trackId, setTrackId] = useState('');
  const [trackedPackage, setTrackedPackage] = useState(() => getConnectedPackages()[0] ?? null);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [recentPackages, setRecentPackages] = useState<PackageRequest[]>(() => getConnectedPackages().slice(0, 4));
  const [createError, setCreateError] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<'idle' | 'creating' | 'tracking'>('idle');
  const { notify, requestPermission, permission } = usePushNotifications();
  const matchingRideCount = getConnectedRides().filter((ride) => ride.acceptsPackages && ride.from === pkg.from && ride.to === pkg.to).length;

  const refreshPackageSnapshot = () => {
    setNetworkStats(getConnectedStats());
    setRecentPackages(getConnectedPackages().slice(0, 4));
  };

  useEffect(() => {
    refreshPackageSnapshot();
  }, [pkg.sent, activeTab]);

  function resetComposer() {
    setPkg({ from:'Amman', to:'Aqaba', weight:'<1 kg', recipientName:'', recipientPhone:'', note:'', sent:false, trackingId:'' });
    setCreateError(null);
  }

  function validatePackageInput() {
    if (pkg.from === pkg.to) return 'Pickup and destination need to be different cities.';
    if (!pkg.recipientName.trim()) return 'Add the recipient name so the captain knows who will receive it.';
    if (pkg.recipientPhone.replace(/[^\d]/g, '').length < 9) return 'Add a valid recipient phone number.';
    return null;
  }

  async function handlePackageCreate(packageType: 'delivery' | 'return' = 'delivery') {
    const validationError = validatePackageInput();
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setBusyState('creating');
    setCreateError(null);

    try {
      const created = await createConnectedPackage({
        from: pkg.from,
        to: pkg.to,
        weight: pkg.weight,
        note: pkg.note,
        packageType,
        recipientName: pkg.recipientName,
        recipientPhone: pkg.recipientPhone,
      });

      setPkg((prev) => ({ ...prev, sent:true, trackingId: created.trackingId }));
      setTrackedPackage(created);
      setTrackId(created.trackingId);
      setTrackingMessage(`Tracking is live for ${created.trackingId}.`);
      refreshPackageSnapshot();

      notificationsAPI.createNotification({
        title: packageType === 'return' ? 'Return request started' : 'Package booking started',
        message: created.matchedRideId
          ? `Your package was matched to a live ${created.from} to ${created.to} ride.`
          : `Your package request is live and waiting for the next matching ride.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/packages',
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }

      notify({
        title: packageType === 'return' ? 'Return Started' : 'Package Request Created',
        body: created.matchedRideId
          ? `Matched to ${created.matchedDriver || 'a connected ride'}. Tracking ID: ${created.trackingId}`
          : `Tracking ID: ${created.trackingId}. We are searching for a ride now.`,
        tag: 'package-created',
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'We could not create the package request right now.');
    } finally {
      setBusyState('idle');
    }
  }

  async function handleTrackingSearch() {
    setBusyState('tracking');
    setTrackingMessage(null);

    try {
      const found = await getPackageByTrackingId(trackId);
      setTrackedPackage(found);
      setTrackingMessage(found ? `Tracking loaded for ${found.trackingId}.` : 'No package was found for that tracking ID yet.');
      refreshPackageSnapshot();
    } finally {
      setBusyState('idle');
    }
  }

  const trackedStatusColor = trackedPackage?.status === 'delivered'
    ? DS.green
    : trackedPackage?.status === 'in_transit'
      ? DS.cyan
      : trackedPackage?.status === 'matched'
        ? DS.gold
        : DS.muted;

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="PKG" title="Wasel Packages" titleAr="Package Logistics" sub="Send - Track - Return - powered by connected rides" color={DS.gold} action={{ label:'Post a package-ready ride', onClick: () => nav('/app/offer-ride') }} />
        <CoreExperienceBanner
          title="Package sharing on the same live mobility network"
          detail="Packages are no longer framed like a separate product. Matching, tracking, and trust now sit on top of the same corridor network used by riders and drivers."
          tone={DS.gold}
        />
        <div className="sp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
          {[
            { label:'Connected rides', value:String(networkStats.ridesPosted), detail:'Posted routes visible to packages', color:DS.cyan },
            { label:'Package-ready', value:String(networkStats.packageEnabledRides), detail:'Rides accepting parcels', color:DS.green },
            { label:'Requests created', value:String(networkStats.packagesCreated), detail:'Delivery and returns', color:DS.gold },
            { label:'Matched packages', value:String(networkStats.matchedPackages), detail:'Already assigned to a ride', color:DS.blue },
          ].map((item) => (
            <div key={item.label} style={{ background:DS.card, borderRadius:r(18), border:`1px solid ${DS.border}`, padding:'18px 18px 16px' }}>
              <div style={{ color:item.color, fontWeight:900, fontSize:'1.2rem', marginBottom:4 }}>{item.value}</div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:'0.84rem' }}>{item.label}</div>
              <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{item.detail}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, background:'rgba(255,255,255,0.03)', borderRadius:r(16), padding:6, border:`1px solid ${DS.border}`, marginBottom:24, boxShadow:'0 10px 22px rgba(0,0,0,0.14)' }}>
          {([['send','Send Package'],['track','Track Package'],['raje3','Raje3 Returns']] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setActiveTab(k)} style={{
              flex:1, height:44, borderRadius:r(12), border:'none', cursor:'pointer', fontFamily:DS.F,
              fontWeight: activeTab===k ? 800 : 600, fontSize:'0.82rem', letterSpacing:'-0.01em',
              background: activeTab===k ? DS.gradGold : 'transparent',
              color: activeTab===k ? '#fff' : DS.muted, transition:'all 0.18s',
            }}>{lbl}</button>
          ))}
        </div>

        <div style={{ background:'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius:r(22), padding:'28px 28px', border:`1px solid ${DS.border}`, boxShadow:'0 16px 38px rgba(0,0,0,0.18)' }}>
          {activeTab === 'send' && (
            pkg.sent ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:16 }}>OK</div>
                <h3 style={{ color:DS.green, fontWeight:900, margin:'0 0 8px' }}>Package Request Created</h3>
                <p style={{ color:DS.sub }}>
                  {trackedPackage?.matchedRideId
                    ? `Matched to a connected ride from ${pkg.from} to ${pkg.to}.`
                    : `Searching for the best connected ride from ${pkg.from} to ${pkg.to}.`}
                </p>
                <div style={{ margin:'20px auto', maxWidth:360, background:'rgba(255,255,255,0.03)', borderRadius:r(16), padding:'16px 20px', border:`1px solid ${DS.border}`, boxShadow:'0 10px 22px rgba(0,0,0,0.14)' }}>
                  <p style={{ color:DS.muted, fontSize:'0.75rem', marginBottom:4 }}>Tracking ID</p>
                  <p style={{ color:DS.cyan, fontWeight:800, fontSize:'1.2rem', letterSpacing:'0.1em' }}>{pkg.trackingId}</p>
                  <p style={{ color:DS.muted, fontSize:'0.75rem', margin:'14px 0 4px' }}>Handoff code</p>
                  <p style={{ color:DS.gold, fontWeight:800, fontSize:'1.05rem', letterSpacing:'0.08em' }}>{trackedPackage?.handoffCode || 'Pending assignment'}</p>
                  <p style={{ color:DS.sub, fontSize:'0.8rem', marginTop:8 }}>{trackedPackage?.matchedDriver ? `Assigned to ${trackedPackage.matchedDriver}` : 'Waiting for route assignment'}</p>
                </div>
                <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <button onClick={() => setActiveTab('track')} style={{ padding:'10px 24px', borderRadius:'99px', border:'none', background:DS.gradC, color:'#fff', cursor:'pointer', fontFamily:DS.F, fontWeight:700 }}>Open Tracking</button>
                  <button onClick={resetComposer} style={{ padding:'10px 24px', borderRadius:'99px', border:`1px solid ${DS.border}`, background:DS.card2, color:DS.gold, cursor:'pointer', fontFamily:DS.F, fontWeight:700 }}>Create Another</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gap:16, gridTemplateColumns:'minmax(0, 1.5fr) minmax(320px, 1fr)' }}>
                <div style={{ display:'grid', gap:14, gridTemplateColumns:'1fr 1fr' }}>
                  <h3 style={{ color:'#fff', fontWeight:800, gridColumn:'1/-1', margin:'0 0 4px' }}>Send through the shared ride network</h3>
                  {[{ l:'From', k:'from' as const }, { l:'To', k:'to' as const }].map(f => (
                    <div key={f.l}>
                      <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{f.l}</label>
                      <select value={pkg[f.k]} onChange={e => setPkg(p => ({ ...p, [f.k]: e.target.value }))}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', cursor:'pointer' }}>
                        {CITIES.map(c => <option key={c} value={c} style={{ background:DS.card }}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Weight</label>
                    <select value={pkg.weight} onChange={e => setPkg(p => ({ ...p, weight:e.target.value }))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', cursor:'pointer' }}>
                      {['<1 kg','1-3 kg','3-5 kg','5-10 kg'].map(w => <option key={w} style={{ background:DS.card }}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Recipient</label>
                    <input placeholder="Full recipient name" value={pkg.recipientName} onChange={e => setPkg(p => ({ ...p, recipientName:e.target.value }))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Phone</label>
                    <input placeholder="Recipient phone" value={pkg.recipientPhone} onChange={e => setPkg(p => ({ ...p, recipientPhone:e.target.value }))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', color:DS.muted, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Note</label>
                    <input placeholder="Fragile or handling notes" value={pkg.note} onChange={e => setPkg(p => ({ ...p, note:e.target.value }))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:r(10), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div style={{ gridColumn:'1/-1', background:'rgba(255,255,255,0.03)', borderRadius:r(14), padding:'16px 18px', border:`1px solid ${DS.border}` }}>
                    <div style={{ color:'#fff', fontWeight:800, marginBottom:6 }}>Connected flow</div>
                    <div style={{ color:DS.sub, fontSize:'0.82rem', lineHeight:1.6 }}>Every package request now checks live posted rides first. If a matching ride accepts packages, your request is immediately attached to that route and tracking starts from the same network.</div>
                  </div>
                  {createError && (
                    <div style={{ gridColumn:'1/-1', display:'flex', gap:10, alignItems:'center', background:`${DS.gold}12`, border:`1px solid ${DS.gold}30`, borderRadius:r(14), padding:'12px 14px', color:'#fff', fontSize:'0.84rem' }}>
                      <Shield size={16} color={DS.gold} />
                      <span>{createError}</span>
                    </div>
                  )}
                  <button disabled={busyState === 'creating'} onClick={() => handlePackageCreate('delivery')} style={{ gridColumn:'1/-1', height:52, borderRadius:r(14), border:'none', background:DS.gradGold, color:'#fff', fontWeight:800, fontFamily:DS.F, fontSize:'0.95rem', cursor:busyState === 'creating' ? 'wait' : 'pointer', opacity:busyState === 'creating' ? 0.75 : 1, boxShadow:`0 4px 20px ${DS.gold}30` }}>
                    {busyState === 'creating' ? 'Creating package request...' : 'Create connected package request'}
                  </button>
                </div>
                <div style={{ display:'grid', gap:14 }}>
                  <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:r(16), padding:'18px 18px 16px', border:`1px solid ${DS.border}`, boxShadow:'0 10px 22px rgba(0,0,0,0.12)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:12 }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:800, fontSize:'0.95rem' }}>Route readiness</div>
                        <div style={{ color:DS.muted, fontSize:'0.76rem', marginTop:4 }}>Live visibility for {pkg.from} to {pkg.to}</div>
                      </div>
                      <span style={{ ...pill(matchingRideCount > 0 ? DS.green : DS.gold) }}>{matchingRideCount > 0 ? `${matchingRideCount} rides live` : 'Standby mode'}</span>
                    </div>
                    <div style={{ color:DS.sub, fontSize:'0.82rem', lineHeight:1.6 }}>
                      {matchingRideCount > 0
                        ? 'This corridor already has package-ready rides, so matching should be immediate or near-immediate.'
                        : 'No package-ready ride is live for this route yet. We will still create the request and keep it queued for the next matching captain.'}
                    </div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:r(16), padding:'18px 18px 16px', border:`1px solid ${DS.border}`, boxShadow:'0 10px 22px rgba(0,0,0,0.12)' }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:'0.95rem', marginBottom:12 }}>What great looks like</div>
                    <div style={{ display:'grid', gap:10 }}>
                      {[
                        { title:'Recipient-ready handoff', desc:'Name, phone, and the handoff code are captured before pickup starts.' },
                        { title:'Connected ride matching', desc:'Existing rides are checked before a new logistics lane is created.' },
                        { title:'Single tracking story', desc:'One tracking ID follows the request from creation to delivery.' },
                      ].map((item) => (
                        <div key={item.title} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 13px', background:'rgba(255,255,255,0.03)' }}>
                          <div style={{ color:'#fff', fontSize:'0.84rem', fontWeight:700 }}>{item.title}</div>
                          <div style={{ color:DS.muted, fontSize:'0.75rem', marginTop:4 }}>{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:r(16), padding:'18px 18px 16px', border:`1px solid ${DS.border}`, boxShadow:'0 10px 22px rgba(0,0,0,0.12)' }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:'0.95rem', marginBottom:10 }}>Recent shipments</div>
                    {recentPackages.length > 0 ? (
                      <div style={{ display:'grid', gap:10 }}>
                        {recentPackages.map((item) => (
                          <button
                            key={item.trackingId}
                            onClick={() => {
                              setActiveTab('track');
                              setTrackId(item.trackingId);
                              setTrackedPackage(item);
                              setTrackingMessage(`Tracking ready for ${item.trackingId}.`);
                            }}
                            style={{ textAlign:'left', borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 13px', background:'rgba(255,255,255,0.03)', cursor:'pointer' }}
                          >
                            <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                              <span style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem' }}>{item.from} to {item.to}</span>
                              <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>{item.trackingId}</span>
                            </div>
                            <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:6 }}>
                              {item.matchedRideId ? `Assigned to ${item.matchedDriver || 'connected captain'}` : 'Waiting for route assignment'}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color:DS.muted, fontSize:'0.8rem' }}>Your recent package requests will appear here for one-click tracking.</div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'track' && (
            <div style={{ textAlign:'center', maxWidth:560, margin:'0 auto', padding:'20px 0' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:16 }}>TRACK</div>
              <h3 style={{ color:'#fff', fontWeight:800, margin:'0 0 8px' }}>Track Your Package</h3>
              <p style={{ color:DS.sub, marginBottom:20 }}>Enter your tracking ID to see package and ride status together</p>
              <div style={{ display:'flex', gap:10 }}>
                <input placeholder="PKG-XXXXX" value={trackId} onChange={e => setTrackId(e.target.value)}
                  style={{ flex:1, padding:'14px 18px', borderRadius:r(12), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', fontFamily:DS.F, fontSize:'0.95rem', outline:'none' }} />
                <button disabled={busyState === 'tracking'} onClick={handleTrackingSearch} style={{ padding:'0 22px', borderRadius:r(12), border:'none', background:DS.gradC, color:'#fff', fontWeight:800, fontFamily:DS.F, cursor:busyState === 'tracking' ? 'wait' : 'pointer', opacity:busyState === 'tracking' ? 0.75 : 1 }}>
                  <Search size={18} />
                </button>
              </div>
              {trackingMessage && (
                <div style={{ marginTop:14, color:trackId.trim().length > 0 && trackedPackage ? DS.cyan : DS.muted, fontSize:'0.82rem' }}>{trackingMessage}</div>
              )}
                {trackedPackage && trackId.trim().length > 0 && (
                  <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  style={{ marginTop:20, background:'rgba(255,255,255,0.03)', borderRadius:r(16), padding:'20px', border:`1px solid ${DS.border}`, textAlign:'left', boxShadow:'0 10px 22px rgba(0,0,0,0.14)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, gap:12, flexWrap:'wrap' }}>
                    <span style={{ color:'#fff', fontWeight:800 }}>Package {trackedPackage.trackingId}</span>
                    <span style={{ ...pill(trackedStatusColor) }}>{trackedPackage.status.replace('_', ' ')}</span>
                  </div>
                  <div style={{ color:DS.sub, fontSize:'0.82rem', marginBottom:16 }}>
                    {trackedPackage.matchedDriver
                      ? `Assigned to ${trackedPackage.matchedDriver} on a connected route from ${trackedPackage.from} to ${trackedPackage.to}.`
                      : `Still searching for a posted ride from ${trackedPackage.from} to ${trackedPackage.to}.`}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10, marginBottom:16 }}>
                    {[
                      { label:'Handoff code', value:trackedPackage.handoffCode },
                      { label:'Recipient handoff', value:trackedPackage.recipientName || 'Name pending' },
                    ].map((item) => (
                      <div key={item.label} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 13px', background:'rgba(255,255,255,0.03)' }}>
                        <div style={{ color:DS.muted, fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{item.label}</div>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem', marginTop:6 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:10, marginBottom:16 }}>
                    {[
                      { label:'Route', value:`${trackedPackage.from} to ${trackedPackage.to}` },
                      { label:'Weight', value:trackedPackage.weight },
                      { label:'Mode', value:trackedPackage.packageType === 'return' ? 'Return' : 'Delivery' },
                    ].map((item) => (
                      <div key={item.label} style={{ borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 13px', background:'rgba(255,255,255,0.03)' }}>
                        <div style={{ color:DS.muted, fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{item.label}</div>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem', marginTop:6 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {trackedPackage.timeline.map((step, i) => (
                    <div key={i} style={{ display:'flex', gap:12, marginBottom:12 }}>
                      <div style={{ width:20, height:20, borderRadius:'50%', background: step.complete ? DS.gradC : DS.card, border:`2px solid ${step.complete ? DS.cyan : DS.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {step.complete && <CheckCircle2 size={11} color="#fff" />}
                      </div>
                      <span style={{ color: step.complete ? '#fff' : DS.muted, fontSize:'0.85rem', alignSelf:'center' }}>{step.label}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:16, borderRadius:r(14), overflow:'hidden', border:`1px solid ${DS.border}` }}>
                    <MapWrapper
                      mode="live"
                      center={midpoint(resolveCityCoord(trackedPackage.from), resolveCityCoord(trackedPackage.to))}
                      pickupLocation={resolveCityCoord(trackedPackage.from)}
                      dropoffLocation={resolveCityCoord(trackedPackage.to)}
                      driverLocation={midpoint(resolveCityCoord(trackedPackage.from), resolveCityCoord(trackedPackage.to))}
                      height={220}
                      showMosques={false}
                      showRadars={false}
                    />
                  </div>
                </motion.div>
              )}
              {!trackedPackage && trackId.trim().length > 0 && (
                <div style={{ marginTop:18, color:DS.muted, fontSize:'0.85rem' }}>No connected package found for that tracking ID yet.</div>
              )}
              {recentPackages.length > 0 && (
                <div style={{ marginTop:24, textAlign:'left' }}>
                  <div style={{ color:'#fff', fontWeight:800, marginBottom:10 }}>Recent tracking shortcuts</div>
                  <div style={{ display:'grid', gap:10 }}>
                    {recentPackages.map((item) => (
                      <button
                        key={item.trackingId}
                        onClick={() => {
                          setTrackId(item.trackingId);
                          setTrackedPackage(item);
                          setTrackingMessage(`Tracking ready for ${item.trackingId}.`);
                        }}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, width:'100%', textAlign:'left', borderRadius:r(12), border:`1px solid ${DS.border}`, padding:'12px 14px', background:DS.card2, cursor:'pointer' }}
                      >
                        <div>
                          <div style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem' }}>{item.trackingId}</div>
                          <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{item.from} to {item.to}</div>
                        </div>
                        <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>{item.status.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raje3' && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>R</div>
              <h3 style={{ color:'#fff', fontWeight:800, margin:'0 0 8px' }}>Raje3 Returns</h3>
              <p style={{ color:DS.sub, margin:'0 auto 24px', maxWidth:480 }}>Return e-commerce items through the same shared ride network. Create a return request, match it to a posted route, and keep one tracking ID from pickup to dropoff.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:24, textAlign:'left' }}>
                {[
                  { title:'Create the return', desc:'Add pickup city, return destination, and package notes.' },
                  { title:'Match to a ride', desc:'We prioritize posted rides already accepting packages.' },
                  { title:'Track every handoff', desc:'Use one tracking ID for pickup, transit, and return delivery.' },
                ].map(s => (
                  <div key={s.title} style={{ background:DS.card2, borderRadius:r(14), padding:'18px 16px', border:`1px solid ${DS.border}` }}>
                    <h4 style={{ color:'#fff', fontWeight:700, fontSize:'0.85rem', margin:'0 0 6px' }}>{s.title}</h4>
                    <p style={{ color:DS.muted, fontSize:'0.75rem', margin:0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              {createError && (
                <div style={{ maxWidth:520, margin:'0 auto 18px', display:'flex', gap:10, alignItems:'center', background:`${DS.gold}12`, border:`1px solid ${DS.gold}30`, borderRadius:r(14), padding:'12px 14px', color:'#fff', fontSize:'0.84rem', textAlign:'left' }}>
                  <Shield size={16} color={DS.gold} />
                  <span>{createError}</span>
                </div>
              )}
              <button disabled={busyState === 'creating'} onClick={() => handlePackageCreate('return')} style={{ padding:'14px 32px', borderRadius:'99px', border:'none', background:DS.gradGold, color:'#fff', fontWeight:800, fontFamily:DS.F, fontSize:'0.95rem', cursor:busyState === 'creating' ? 'wait' : 'pointer', opacity:busyState === 'creating' ? 0.75 : 1, boxShadow:`0 4px 20px ${DS.gold}30` }}>
                {busyState === 'creating' ? 'Starting return...' : 'Start a connected return'}
              </button>
            </div>
          )}
        </div>
      </PageShell>
    </Protected>
  );
}

// ================================================================================
// BUS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function BusPage() {
  const BUSES = [
    {
      id:0,
      from:'Amman',
      to:'Aqaba',
      dep:'07:00',
      arr:'11:30',
      price:7,
      seats:12,
      company:'Wasel Express',
      amenities:['AC','WiFi','USB','Snacks'],
      color:DS.cyan,
      via:['7th Circle', 'Karak Service Plaza'],
      duration:'4h 30m',
      frequency:'Daily',
      punctuality:'96% on-time this week',
      pickupPoint:'Abdali Intercity Hub',
      dropoffPoint:'Aqaba Corniche Terminal',
      summary:'Best for early arrivals, students, and business travelers heading south.',
    },
    {
      id:1,
      from:'Amman',
      to:'Irbid',
      dep:'08:00',
      arr:'09:30',
      price:3,
      seats:8,
      company:'Wasel Express',
      amenities:['AC','USB'],
      color:DS.blue,
      via:['University Street'],
      duration:'1h 30m',
      frequency:'Every 90 min',
      punctuality:'93% on-time this week',
      pickupPoint:'North Bus Gate',
      dropoffPoint:'Irbid University District',
      summary:'Fast morning connection with simple boarding and light luggage support.',
    },
    {
      id:2,
      from:'Amman',
      to:'Aqaba',
      dep:'14:00',
      arr:'18:30',
      price:7,
      seats:5,
      company:'Wasel Express',
      amenities:['AC','WiFi','USB'],
      color:DS.cyan,
      via:['Airport Road', 'Karak Service Plaza'],
      duration:'4h 30m',
      frequency:'Daily',
      punctuality:'91% on-time this week',
      pickupPoint:'Abdali Intercity Hub',
      dropoffPoint:'Aqaba Marina Stop',
      summary:'Ideal for same-day travel with live status updates and quieter afternoon boarding.',
    },
    {
      id:3,
      from:'Irbid',
      to:'Amman',
      dep:'06:30',
      arr:'08:00',
      price:3,
      seats:15,
      company:'Wasel Express',
      amenities:['AC','USB'],
      color:DS.green,
      via:['Jerash Connector'],
      duration:'1h 30m',
      frequency:'Weekdays',
      punctuality:'95% on-time this week',
      pickupPoint:'Irbid Main Terminal',
      dropoffPoint:'Abdali Intercity Hub',
      summary:'Reliable weekday commuter option for office starts and university lectures.',
    },
  ];
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>(BUSES.map((route) => ({ ...route, id: String(route.id) })));
  const [selected, setSelected] = useState<string>('0');
  const [tripDate, setTripDate] = useState('2026-03-28');
  const [passengers, setPassengers] = useState(1);
  const [scheduleMode, setScheduleMode] = useState<'depart-now' | 'schedule-later'>('schedule-later');
  const [seatPreference, setSeatPreference] = useState<'window' | 'aisle' | 'front-zone'>('window');
  const [bookingComplete, setBookingComplete] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesInfo, setRoutesInfo] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingSource, setBookingSource] = useState<'server' | 'local' | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBusRoutes() {
      setRoutesLoading(true);
      setRoutesInfo(null);

      try {
        const liveRoutes = await fetchBusRoutes({
          date: tripDate,
          seats: passengers,
        });

        if (cancelled) return;

        if (liveRoutes.length > 0) {
          setBusRoutes(liveRoutes);
          setSelected((prev) => (liveRoutes.some((route) => route.id === prev) ? prev : liveRoutes[0].id));
        } else {
          const fallback = BUSES.map((route) => ({ ...route, id: String(route.id) }));
          setBusRoutes(fallback);
          setSelected((prev) => (fallback.some((route) => route.id === prev) ? prev : fallback[0].id));
          setRoutesInfo('Showing scheduled routes while live inventory syncs.');
        }
      } catch {
        if (cancelled) return;
        const fallback = BUSES.map((route) => ({ ...route, id: String(route.id) }));
        setBusRoutes(fallback);
        setSelected((prev) => (fallback.some((route) => route.id === prev) ? prev : fallback[0].id));
        setRoutesInfo('Live route API is unavailable. You can still continue booking.');
      } finally {
        if (!cancelled) setRoutesLoading(false);
      }
    }

    loadBusRoutes();
    return () => { cancelled = true; };
  }, [tripDate, passengers]);

  const activeBus = busRoutes.find((bus) => bus.id === selected) ?? busRoutes[0] ?? ({ ...BUSES[0], id: String(BUSES[0].id) });
  const pickupCoord = resolveCityCoord(activeBus.from);
  const dropoffCoord = resolveCityCoord(activeBus.to);
  const routeCenter = midpoint(pickupCoord, dropoffCoord);
  const totalPrice = activeBus.price * passengers;
  const departureLabel = scheduleMode === 'depart-now' ? `Next departure today at ${activeBus.dep}` : `${tripDate} at ${activeBus.dep}`;

  async function handleBusBooking() {
    if (!activeBus) return;
    setBookingBusy(true);
    setBookingComplete(false);

    try {
      const result = await createBusBooking({
        tripId: activeBus.id,
        seatsRequested: passengers,
        pickupStop: activeBus.pickupPoint,
        dropoffStop: activeBus.dropoffPoint,
        scheduleDate: tripDate,
        departureTime: activeBus.dep,
        seatPreference,
        scheduleMode,
        totalPrice,
      });

      setBookingSource(result.source);
      setBookingComplete(true);
    } finally {
      setBookingBusy(false);
    }
  }

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="🚌" title="Wasel Bus" titleAr="Bus Service" sub="Fixed-price intercity coaches - Scheduled booking - Live route preview" color={DS.green} />
        <CoreExperienceBanner
          title="Scheduled transport with the same premium Wasel system"
          detail="Bus keeps the same trust language as rides and packages: clear pricing, predictable departures, and route visibility before checkout so users never feel like they entered a different product."
          tone={DS.green}
        />

        <div className="sp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
          {[
            { label:'Guaranteed boarding', value:'15 min', detail:'Check in before departure', icon:<CheckCircle2 size={18} />, color:DS.green },
            { label:'Best fare', value:`${activeBus.price} JOD`, detail:'Transparent seat pricing', icon:<CreditCard size={18} />, color:activeBus.color },
            { label:'Route confidence', value:activeBus.punctuality, detail:'Updated from recent trips', icon:<TrendingUp size={18} />, color:DS.cyan },
            { label:'Comfort onboard', value:activeBus.amenities.join(' - '), detail:'Displayed before you book', icon:<Wifi size={18} />, color:DS.gold },
          ].map((item) => (
            <div key={item.label} style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:r(18), padding:'18px 18px 16px' }}>
              <div style={{ width:42, height:42, borderRadius:r(12), background:`${item.color}16`, border:`1px solid ${item.color}30`, display:'flex', alignItems:'center', justifyContent:'center', color:item.color, marginBottom:14 }}>
                {item.icon}
              </div>
              <div style={{ color:item.color, fontWeight:900, fontSize:'1.05rem', marginBottom:4 }}>{item.value}</div>
              <div style={{ color:'#fff', fontWeight:700, fontSize:'0.86rem' }}>{item.label}</div>
              <div style={{ color:DS.muted, fontSize:'0.74rem', marginTop:4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        {(routesLoading || routesInfo) && (
          <div style={{ marginBottom:16, background:DS.card2, border:`1px solid ${DS.border}`, borderRadius:r(14), padding:'12px 14px', color:DS.sub, fontSize:'0.8rem' }}>
            {routesLoading ? 'Syncing live bus routes...' : routesInfo}
          </div>
        )}

        <div className="sp-2col" style={{ display:'grid', gridTemplateColumns:'1.2fr 0.9fr', gap:16, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {busRoutes.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity:0, y:12 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:i*0.05 }}
                style={{ background:DS.card, borderRadius:r(20), border:`1px solid ${selected===b.id ? b.color : DS.border}`, overflow:'hidden', cursor:'pointer', transition:'border-color 0.2s, transform 0.2s', boxShadow:selected===b.id ? `0 10px 30px ${b.color}12` : 'none' }}
                onClick={() => {
                  setSelected(String(b.id));
                  setBookingComplete(false);
                  setBookingSource(null);
                }}
              >
                <div style={{ height:3, background:`linear-gradient(90deg,${b.color},transparent)` }} />
                <div style={{ padding:'20px 24px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:16, minWidth:0 }}>
                      <div style={{ width:48, height:48, borderRadius:r(12), background:`${b.color}15`, border:`1.5px solid ${b.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Bus size={22} color={b.color} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ color:'#fff', fontWeight:800, fontSize:'1.02rem' }}>{b.from} to {b.to}</div>
                        <div style={{ color:DS.sub, fontSize:'0.8rem', marginTop:3 }}>{b.dep} - {b.arr} - {b.duration} - {b.company}</div>
                        <div style={{ color:DS.muted, fontSize:'0.77rem', marginTop:8 }}>{b.summary}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {selected === b.id && (
                        <div style={{ ...pill(b.color), marginBottom:6, fontSize:'0.64rem' }}>Selected route</div>
                      )}
                      <div style={{ color:b.color, fontWeight:900, fontSize:'1.6rem' }}>{b.price}</div>
                      <div style={{ color:DS.muted, fontSize:'0.62rem', fontWeight:600 }}>JOD/seat</div>
                      <span style={{ ...pill(b.seats > 5 ? DS.green : DS.gold), marginTop:6, fontSize:'0.65rem' }}>{b.seats} seats left</span>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginTop:16 }}>
                    {[
                      { label:'Pickup', value:b.pickupPoint, icon:<MapPin size={13} color={b.color} /> },
                      { label:'Frequency', value:b.frequency, icon:<Calendar size={13} color={b.color} /> },
                      { label:'Reliability', value:b.punctuality, icon:<Award size={13} color={b.color} /> },
                    ].map((item) => (
                      <div key={item.label} style={{ background:DS.card2, border:`1px solid ${DS.border}`, borderRadius:r(12), padding:'12px 13px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, color:DS.muted, fontSize:'0.68rem', fontWeight:700, marginBottom:4 }}>
                          {item.icon}
                          {item.label}
                        </div>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:'0.8rem', lineHeight:1.35 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:16 }}>
                    {b.amenities.map(a => <span key={a} style={pill(b.color)}>{a}</span>)}
                    {b.via.map(stop => <span key={stop} style={pill(DS.sub)}>Via {stop}</span>)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:16 }}>
            <div style={{ background:DS.card, border:`1px solid ${activeBus.color}30`, borderRadius:r(22), overflow:'hidden', boxShadow:`0 14px 40px ${activeBus.color}10` }}>
              <div style={{ padding:'22px 22px 18px', background:`linear-gradient(135deg, ${DS.navy}, ${activeBus.color}22)` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ color:'#fff', fontWeight:900, fontSize:'1.15rem' }}>Schedule your seat</div>
                    <div style={{ color:DS.sub, fontSize:'0.78rem', marginTop:4 }}>{activeBus.from} to {activeBus.to} - {activeBus.dep} departure</div>
                  </div>
                  <span style={{ ...pill(activeBus.color), fontSize:'0.7rem' }}>{activeBus.seats} seats open</span>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button
                    onClick={() => setScheduleMode('depart-now')}
                    style={{ height:38, padding:'0 14px', borderRadius:'99px', border:'none', cursor:'pointer', background:scheduleMode === 'depart-now' ? DS.gradC : 'rgba(255,255,255,0.08)', color:'#fff', fontWeight:700 }}
                  >
                    Next departure
                  </button>
                  <button
                    onClick={() => setScheduleMode('schedule-later')}
                    style={{ height:38, padding:'0 14px', borderRadius:'99px', border:'none', cursor:'pointer', background:scheduleMode === 'schedule-later' ? DS.gradG : 'rgba(255,255,255,0.08)', color:'#fff', fontWeight:700 }}
                  >
                    Schedule ahead
                  </button>
                </div>
              </div>

              <div style={{ padding:22, display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ background:DS.card2, border:`1px solid ${DS.border}`, borderRadius:r(16), padding:'14px 16px' }}>
                  <div style={{ color:DS.muted, fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Departure plan</div>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:'0.95rem' }}>{departureLabel}</div>
                  <div style={{ color:DS.sub, fontSize:'0.78rem', marginTop:4 }}>Board at {activeBus.pickupPoint} and arrive at {activeBus.dropoffPoint}.</div>
                </div>

                {scheduleMode === 'schedule-later' && (
                  <div>
                    <label style={{ display:'block', color:DS.sub, fontSize:'0.76rem', marginBottom:8 }}>Travel date</label>
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => {
                        setTripDate(e.target.value);
                        setBookingComplete(false);
                      }}
                      style={{ width:'100%', height:46, borderRadius:r(14), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', padding:'0 14px', fontFamily:DS.F }}
                    />
                  </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', color:DS.sub, fontSize:'0.76rem', marginBottom:8 }}>Passengers</label>
                    <div style={{ display:'flex', alignItems:'center', background:DS.card2, border:`1px solid ${DS.border}`, borderRadius:r(14), overflow:'hidden' }}>
                      <button
                        onClick={() => {
                          setPassengers((value) => Math.max(1, value - 1));
                          setBookingComplete(false);
                        }}
                        style={{ width:42, height:46, border:'none', background:'transparent', color:'#fff', fontSize:'1.1rem', cursor:'pointer' }}
                      >
                        -
                      </button>
                      <div style={{ flex:1, textAlign:'center', color:'#fff', fontWeight:800 }}>{passengers}</div>
                      <button
                        onClick={() => {
                          setPassengers((value) => Math.min(activeBus.seats, value + 1));
                          setBookingComplete(false);
                        }}
                        style={{ width:42, height:46, border:'none', background:'transparent', color:'#fff', fontSize:'1.1rem', cursor:'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display:'block', color:DS.sub, fontSize:'0.76rem', marginBottom:8 }}>Seat preference</label>
                    <select
                      value={seatPreference}
                      onChange={(e) => {
                        setSeatPreference(e.target.value as 'window' | 'aisle' | 'front-zone');
                        setBookingComplete(false);
                      }}
                      style={{ width:'100%', height:46, borderRadius:r(14), border:`1px solid ${DS.border}`, background:DS.card2, color:'#fff', padding:'0 14px', fontFamily:DS.F }}
                    >
                      <option value="window">Window</option>
                      <option value="aisle">Aisle</option>
                      <option value="front-zone">Front zone</option>
                    </select>
                  </div>
                </div>

                <div style={{ background:`linear-gradient(135deg, rgba(0,200,232,0.08), rgba(240,168,48,0.08))`, border:`1px solid ${DS.border}`, borderRadius:r(16), padding:'16px 16px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                    <span style={{ color:DS.sub, fontSize:'0.78rem' }}>Seat fare</span>
                    <span style={{ color:'#fff', fontWeight:700 }}>{activeBus.price} JOD x {passengers}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                    <span style={{ color:DS.sub, fontSize:'0.78rem' }}>Schedule support</span>
                    <span style={{ color:'#fff', fontWeight:700 }}>{scheduleMode === 'schedule-later' ? 'Included' : 'Auto-assigned'}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, paddingTop:10, borderTop:`1px solid ${DS.border}` }}>
                    <span style={{ color:'#fff', fontWeight:800 }}>Total</span>
                    <span style={{ color:activeBus.color, fontWeight:900, fontSize:'1.2rem' }}>{totalPrice} JOD</span>
                  </div>
                </div>

                <button
                  onClick={handleBusBooking}
                  disabled={bookingBusy || routesLoading}
                  style={{
                    width:'100%',
                    height:50,
                    borderRadius:r(14),
                    border:'none',
                    background:`linear-gradient(135deg,${activeBus.color},${DS.blue})`,
                    color:'#fff',
                    fontWeight:900,
                    fontFamily:DS.F,
                    cursor:bookingBusy || routesLoading ? 'not-allowed' : 'pointer',
                    fontSize:'0.95rem',
                    opacity:bookingBusy || routesLoading ? 0.7 : 1,
                  }}
                >
                  {bookingBusy ? 'Confirming booking...' : 'Confirm booking'}
                </button>

                {bookingComplete && (
                  <div style={{ background:'rgba(0,200,117,0.10)', border:'1px solid rgba(0,200,117,0.28)', borderRadius:r(16), padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, color:DS.green, fontWeight:800, marginBottom:6 }}>
                      <CheckCircle2 size={16} />
                      Booking reserved
                    </div>
                    <div style={{ color:'#fff', fontSize:'0.86rem', lineHeight:1.5 }}>
                      {passengers} seat{passengers > 1 ? 's are' : ' is'} reserved for {departureLabel}. Your {seatPreference.replace('-', ' ')} preference and boarding point were saved.
                      {bookingSource === 'local' ? ' Saved locally while server sync completes.' : ' Saved in your account.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:r(22), padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ color:'#fff', fontWeight:800 }}>Live route view</div>
                  <div style={{ color:DS.sub, fontSize:'0.76rem', marginTop:4 }}>Pickup, destination, and route direction before checkout.</div>
                </div>
                <span style={{ ...pill(activeBus.color), fontSize:'0.68rem' }}>Map enabled</span>
              </div>
              <MapWrapper
                mode="live"
                center={routeCenter}
                pickupLocation={pickupCoord}
                dropoffLocation={dropoffCoord}
                driverLocation={midpoint(pickupCoord, dropoffCoord)}
                height={230}
                showMosques={false}
                showRadars={false}
              />
              <div style={{ display:'grid', gap:10, marginTop:14 }}>
                {[
                  { icon:<MapPin size={14} color={activeBus.color} />, label:'Boarding', value:activeBus.pickupPoint },
                  { icon:<ArrowRight size={14} color={activeBus.color} />, label:'Main stop', value:activeBus.via.join(' - ') },
                  { icon:<Clock size={14} color={activeBus.color} />, label:'ETA', value:`${activeBus.arr} arrival - ${activeBus.duration}` },
                ].map((item) => (
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10, background:DS.card2, border:`1px solid ${DS.border}`, borderRadius:r(14), padding:'12px 14px' }}>
                    <div style={{ width:34, height:34, borderRadius:r(10), background:`${activeBus.color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{item.icon}</div>
                    <div>
                      <div style={{ color:DS.muted, fontSize:'0.68rem', fontWeight:700 }}>{item.label}</div>
                      <div style={{ color:'#fff', fontWeight:700, fontSize:'0.84rem' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:r(22), padding:'18px 18px 16px' }}>
              <div style={{ color:'#fff', fontWeight:800, marginBottom:8 }}>What riders need to know</div>
              <div style={{ display:'grid', gap:10 }}>
                {[
                  'Booking closes 15 minutes before departure so boarding stays smooth.',
                  'Tickets are digital and tied to the passenger count you select.',
                  'If a route shifts, riders receive an in-app update before departure.',
                ].map((item) => (
                  <div key={item} style={{ display:'flex', alignItems:'flex-start', gap:10, color:DS.sub, fontSize:'0.8rem', lineHeight:1.5 }}>
                    <Shield size={15} color={DS.green} style={{ flexShrink:0, marginTop:2 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}

// ================================================================================
// DRIVER PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function DriverPage() {
  const { user } = useLocalAuth();
  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="📊" title="Driver Dashboard" titleAr="لوحة السائق" sub="Earnings · Trips · Demand Heatmap" color={DS.blue} />
        <CoreExperienceBanner
          title="Driver operations with the same premium product system"
          detail="The driver side now aligns with the rest of Wasel: clearer performance signals, live demand visibility, and trust-forward operations instead of a disconnected internal-looking dashboard."
          tone={DS.blue}
        />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:"Today's Earnings", val:'JOD 42', icon:'💰', color:DS.green },
            { label:'Active Trips',     val:'3',      icon:'🚗', color:DS.cyan  },
            { label:'Rating',           val:'4.9★',   icon:'⭐', color:DS.gold  },
            { label:'Total Trips',      val:'127',    icon:'📍', color:DS.blue  },
          ].map(m => (
            <div key={m.label} style={{ background:DS.card, borderRadius:r(16), padding:'20px 18px', border:`1px solid ${DS.border}` }}>
              <div style={{ fontSize:'1.8rem', marginBottom:8 }}>{m.icon}</div>
              <div style={{ color:m.color, fontWeight:900, fontSize:'1.5rem' }}>{m.val}</div>
              <div style={{ color:DS.muted, fontSize:'0.75rem', marginTop:4 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:DS.card, borderRadius:r(20), padding:'24px', border:`1px solid ${DS.border}` }}>
          <h3 style={{ color:'#fff', fontWeight:800, marginBottom:16, margin:'0 0 16px' }}>🔥 Demand Heatmap — Amman</h3>
          <div style={{ display:'grid', gap:10 }}>
            {[
              { zone:'Abdali',    demand:92, earn:'JOD 45/hr', surge:'2.5×', color:DS.red    },
              { zone:'Shmeisani', demand:65, earn:'JOD 28/hr', surge:'1.4×', color:DS.gold   },
              { zone:'Sweifieh',  demand:38, earn:'JOD 18/hr', surge:'1.0×', color:DS.green  },
              { zone:'7th Circle',demand:54, earn:'JOD 22/hr', surge:'1.2×', color:DS.cyan   },
            ].map(z => (
              <div key={z.zone} style={{ display:'flex', alignItems:'center', gap:14, background:DS.card2, borderRadius:r(12), padding:'14px 18px', border:`1px solid ${DS.border}` }}>
                <div style={{ width:40, height:40, borderRadius:r(10), background:`${z.color}15`, border:`1.5px solid ${z.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:z.color, fontSize:'0.8rem', flexShrink:0 }}>
                  {z.demand}%
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#fff', fontWeight:700 }}>{z.zone}</div>
                  <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    <div style={{ flex:1, height:4, borderRadius:2, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
                      <div style={{ width:`${z.demand}%`, height:'100%', background:`linear-gradient(90deg,${z.color},${z.color}80)`, borderRadius:2 }} />
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ color:z.color, fontWeight:800 }}>{z.earn}</div>
                  <div style={{ color:DS.muted, fontSize:'0.72rem' }}>Surge {z.surge}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function SafetyPage() {
  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="🛡️" title="Safety Center" titleAr="مركز الأمان" sub="ID-verified drivers · SOS · Trip insurance" color={DS.green} />
        <CoreExperienceBanner
          title="Trust should feel built in, not added later"
          detail="Safety is presented here as a system-wide product layer: verified identity, emergency support, insurance, and cultural comfort cues that support every ride, package, and scheduled trip."
          tone={DS.green}
        />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[
            { emoji:'🪪', title:'Gov-ID Verification', desc:'All drivers verified with Jordan Sanad eKYC system', color:DS.cyan  },
            { emoji:'🆘', title:'SOS Emergency',        desc:'One tap to share location with emergency contacts', color:DS.red   },
            { emoji:'📋', title:'Trip Insurance',       desc:'Up to JOD 1,000 coverage per trip',                 color:DS.gold  },
            { emoji:'🕌', title:'Cultural Intelligence', desc:'Prayer stops, gender preferences, Ramadan mode',   color:DS.blue  },
          ].map(f => (
            <div key={f.title} style={{ background:DS.card, borderRadius:r(20), padding:'24px 22px', border:`1px solid ${DS.border}` }}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>{f.emoji}</div>
              <h3 style={{ color:'#fff', fontWeight:800, margin:'0 0 8px', fontSize:'1rem' }}>{f.title}</h3>
              <p style={{ color:DS.sub, fontSize:'0.82rem', margin:0, lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </PageShell>
    </Protected>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function WaselPlusPage() {
  const [subscribed, setSubscribed] = useState(false);
  return (
    <Protected>
      <PageShell>
      <SectionHead emoji="💎" title="Wasel Plus" titleAr="واصل بلس" sub="10% off all rides · Priority booking · Exclusive perks" color={DS.gold} />
        <CoreExperienceBanner
          title="Premium membership with product-level value"
          detail="Wasel Plus is framed as a cleaner upgrade to the same network experience: better pricing, better access, and better reassurance without changing the core product language."
          tone={DS.gold}
        />
        {subscribed ? (
          <div style={{ background:DS.card, borderRadius:r(20), padding:'60px 28px', textAlign:'center', border:`1px solid ${DS.gold}25` }}>
            <div style={{ fontSize:'4rem', marginBottom:16 }}>👑</div>
            <h2 style={{ color:DS.gold, fontWeight:900, fontSize:'1.5rem', margin:'0 0 8px' }}>You're a Plus Member!</h2>
            <p style={{ color:DS.sub }}>Enjoy 10% off every ride and priority booking.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              { emoji:'💸', title:'10% Off All Rides', desc:'Automatic discount on every booking' },
              { emoji:'⚡', title:'Priority Booking',   desc:'First access to limited seats'       },
              { emoji:'📦', title:'Free Package Insurance', desc:'Up to JOD 50 per package'        },
              { emoji:'🕌', title:'Premium Cultural', desc:'Advanced prayer stop planning'          },
            ].map(f => (
              <div key={f.title} style={{ background:DS.card, borderRadius:r(18), padding:'22px 20px', border:`1px solid ${DS.border}` }}>
                <div style={{ fontSize:'1.8rem', marginBottom:8 }}>{f.emoji}</div>
                <h4 style={{ color:'#fff', fontWeight:800, margin:'0 0 6px' }}>{f.title}</h4>
                <p style={{ color:DS.sub, fontSize:'0.8rem', margin:0 }}>{f.desc}</p>
              </div>
            ))}
            <div style={{ gridColumn:'1/-1', background:`linear-gradient(135deg,#2a1a00,#3d2a00)`, borderRadius:r(18), padding:'28px 28px', border:`1px solid ${DS.gold}30`, textAlign:'center' }}>
              <div style={{ color:DS.gold, fontWeight:900, fontSize:'2rem', marginBottom:4 }}>12.99 JOD <span style={{ fontSize:'1rem' }}>/month</span></div>
              <div style={{ color:'rgba(240,168,48,0.6)', fontSize:'0.82rem', marginBottom:20 }}>Cancel anytime</div>
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => setSubscribed(true)}
                style={{ width:'100%', height:52, borderRadius:'99px', border:'none', background:DS.gradGold, color:'#fff', fontWeight:800, fontFamily:DS.F, fontSize:'1rem', cursor:'pointer', boxShadow:`0 8px 24px ${DS.gold}40` }}>
                👑 Subscribe to Plus
              </motion.button>
            </div>
          </div>
        )}
      </PageShell>
    </Protected>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function ProfilePage() {
  const { user, signOut } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'U';
  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="👤" title="My Profile" titleAr="ملفي الشخصي" sub="Account settings · Trust score · Verification" color={DS.cyan} />
        <CoreExperienceBanner
          title="Identity, trust, and account controls in one place"
          detail="Profile now reads as a control center for the Wasel network: who you are, how trusted you are, and which tools protect your future bookings, packages, and payments."
          tone={DS.cyan}
        />
        <div style={{ display:'grid', gap:14 }}>
          {/* Avatar card */}
          <div style={{ background:DS.card, borderRadius:r(20), padding:'32px 28px', border:`1px solid ${DS.border}`, display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ width:72, height:72, borderRadius:r(18), background:DS.gradC, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:'1.7rem', flexShrink:0 }}>
              {initials}
            </div>
            <div style={{ flex:1 }}>
              <h2 style={{ color:'#fff', fontWeight:900, margin:'0 0 4px', fontSize:'1.3rem' }}>{user?.name}</h2>
              <p style={{ color:DS.sub, margin:'0 0 10px', fontSize:'0.85rem' }}>{user?.email}</p>
              <div style={{ display:'flex', gap:12 }}>
                {[
                  { label:'Trips',   val:user?.trips   ?? 0, color:DS.cyan  },
                  { label:'Balance', val:`JOD ${(user?.balance ?? 0).toFixed(1)}`, color:DS.gold },
                  { label:'Rating',  val:`${(user?.rating ?? 5.0).toFixed(1)}★`,  color:'#F59E0B' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ color:s.color, fontWeight:900, fontSize:'1.2rem' }}>{s.val}</div>
                    <div style={{ color:DS.muted, fontSize:'0.7rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <span style={{ ...pill(DS.green), alignSelf:'flex-start' }}><CheckCircle2 size={10} /> Verified</span>
          </div>
          {/* Menu */}
          {[
            { emoji:'🚗', label:'My Trips', path:'/app/find-ride' },
            { emoji:'💳', label:'Wallet & Payments', path:'/app/payments' },
            { emoji:'🛡️', label:'Safety Center', path:'/app/safety' },
        { emoji:'💎', label:'Wasel Plus', path:'/app/plus' },
          ].map(item => (
            <button key={item.label} onClick={() => nav(item.path)}
              style={{ display:'flex', alignItems:'center', gap:14, background:DS.card, borderRadius:r(16), padding:'18px 22px', border:`1px solid ${DS.border}`, cursor:'pointer', textAlign:'left', width:'100%', transition:'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = DS.borderH}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = DS.border}>
              <span style={{ fontSize:'1.4rem' }}>{item.emoji}</span>
              <span style={{ color:'#fff', fontWeight:600, fontFamily:DS.F, flex:1, fontSize:'0.92rem' }}>{item.label}</span>
              <ChevronRight size={16} color={DS.muted} />
            </button>
          ))}
          <button onClick={signOut} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'rgba(239,68,68,0.06)', borderRadius:r(16), padding:'16px', border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer', color:DS.red, fontFamily:DS.F, fontWeight:700, width:'100%' }}>
            🚪 Sign Out
          </button>
        </div>
      </PageShell>
    </Protected>
  );
}

// Legacy exports to avoid breaking other files
export const PageHeader = SectionHead as any;
export const Pill = ({ label, color }: { label:string; color:string }) => (
  <span style={pill(color)}>{label}</span>
);

