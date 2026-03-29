/**
 * Wasel | واصل — FUTURISTIC LANDING PAGE v4.0
 * Radical redesign: Neural mobility network experience
 * Apple reveal × Tesla launch × Stripe storytelling
 * Adapted for Middle Eastern smart mobility ecosystem
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'motion/react';
import {
  ArrowRight, MapPin, Package, Users, Star, Shield,
  CheckCircle, ChevronRight, ChevronLeft,
  Smartphone, Clock, Zap, Globe,
  Menu, X, Twitter, Instagram, Facebook, Linkedin,
  Navigation, Car, Heart, Award,
  Layers, Radio, Lock, TrendingUp, Leaf,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onExploreRides: () => void;
  onOfferRide: () => void;
  onExplorePackages: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTELLATION LOGO — City nodes forming a W shape
   ═══════════════════════════════════════════════════════════════ */
function ConstellationLogo({ size = 44, withText = true, animate = true }: {
  size?: number; withText?: boolean; animate?: boolean;
}) {
  const nodes = [
    { x: 4,  y: 32, r: 3.5, color: '#00C8E8', delay: 0 },    // left
    { x: 14, y: 14, r: 4,   color: '#F0A830', delay: 0.15 },  // left-mid top
    { x: 24, y: 28, r: 3.5, color: '#00C8E8', delay: 0.3 },   // center
    { x: 34, y: 14, r: 4,   color: '#F0A830', delay: 0.45 },  // right-mid top
    { x: 44, y: 32, r: 3.5, color: '#00C8E8', delay: 0.6 },   // right
  ];

  // Satellite nodes for constellation effect
  const satellites = [
    { x: 8,  y: 8,  r: 1.5, delay: 0.8 },
    { x: 38, y: 38, r: 1.2, delay: 0.9 },
    { x: 44, y: 10, r: 1.5, delay: 1.0 },
    { x: 2,  y: 44, r: 1.2, delay: 1.1 },
    { x: 24, y: 4,  r: 1.8, delay: 1.2 },
  ];

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}>
        <defs>
          <filter id="logoGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00C8E8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#040C18" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background ambient glow */}
        <circle cx="24" cy="24" r="26" fill="url(#bgGrad)" />

        {/* Outer orbit ring */}
        <motion.circle cx="24" cy="24" r="22" stroke="#00C8E8" strokeWidth="0.5"
          strokeDasharray="4 3" strokeOpacity="0.25" fill="none"
          animate={animate ? { rotate: 360 } : {}}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '24px 24px' }}
        />

        {/* Satellite constellation nodes */}
        {satellites.map((s, i) => (
          <motion.circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#00C8E8"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0.2, 0.5] }}
            transition={{ delay: s.delay, duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Thin constellation lines to satellites */}
        <motion.line x1="14" y1="14" x2="8" y2="8" stroke="#00C8E8" strokeWidth="0.5" strokeOpacity="0.3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
        <motion.line x1="34" y1="14" x2="44" y2="10" stroke="#00C8E8" strokeWidth="0.5" strokeOpacity="0.3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
        <motion.line x1="24" y1="28" x2="24" y2="4" stroke="#F0A830" strokeWidth="0.5" strokeOpacity="0.2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} />

        {/* W-shape connecting lines */}
        <motion.path
          d="M 4 32 L 14 14 L 24 28 L 34 14 L 44 32"
          stroke="#00C8E8" strokeWidth="1.8" fill="none"
          strokeLinecap="round" strokeLinejoin="round"
          filter="url(#logoGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Secondary glow line (bronze overlay) */}
        <motion.path
          d="M 4 32 L 14 14 L 24 28 L 34 14 L 44 32"
          stroke="#F0A830" strokeWidth="0.6" fill="none"
          strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
        />

        {/* City nodes */}
        {nodes.map((n, i) => (
          <motion.g key={i} filter="url(#nodeGlow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: n.delay + 0.5, type: 'spring', stiffness: 300 }}>
            {/* Outer glow ring */}
            <motion.circle cx={n.x} cy={n.y} r={n.r + 4} fill={n.color} fillOpacity="0.1"
              animate={animate ? { scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] } : {}}
              transition={{ duration: 2.5, delay: n.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Node ring */}
            <circle cx={n.x} cy={n.y} r={n.r + 1.5} fill="none" stroke={n.color} strokeWidth="0.8" strokeOpacity="0.4" />
            {/* Node fill */}
            <circle cx={n.x} cy={n.y} r={n.r} fill="#040C18" stroke={n.color} strokeWidth="1.5" />
            {/* Node center */}
            <circle cx={n.x} cy={n.y} r={n.r * 0.45} fill={n.color} />
          </motion.g>
        ))}

        {/* Moving traveler dot — SVG-native animateMotion to avoid offsetDistance prop warning */}
        {animate && (
          <circle r="2.5" fill="white" filter="url(#logoGlow)">
            <animateMotion dur="3s" repeatCount="indefinite" begin="1.5s"
              path="M 4 32 L 14 14 L 24 28 L 34 14 L 44 32" calcMode="linear" />
          </circle>
        )}
      </svg>

      {withText && (
        <div className="flex flex-col leading-none gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-black tracking-tight"
              style={{
                fontSize: size * 0.42,
                backgroundImage: 'linear-gradient(135deg, #00C8E8 0%, #5EE7FF 60%, #00C8E8 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
              Wasel
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: size * 0.28 }}>|</span>
            <span className="font-bold" style={{ fontSize: size * 0.3, color: '#F0A830', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
              واصل
            </span>
          </div>
          <span style={{ fontSize: size * 0.2, color: 'rgba(0,200,232,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            MOBILITY NETWORK
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEURAL ROUTE MAP — Full-screen animated Jordan map
   ═══════════════════════════════════════════════════════════════ */
function NeuralRouteMap() {
  const cities = [
    { id: 'amman',    x: 310, y: 120, label: 'Amman',    labelAr: 'عمّان',     size: 18, color: '#00C8E8', delay: 0,   tier: 1 },
    { id: 'aqaba',    x: 200, y: 440, label: 'Aqaba',    labelAr: 'العقبة',    size: 13, color: '#F0A830', delay: 2.2, tier: 1 },
    { id: 'irbid',    x: 390, y: 60,  label: 'Irbid',    labelAr: 'إربد',      size: 12, color: '#F0A830', delay: 0.6, tier: 1 },
    { id: 'zarqa',    x: 460, y: 130, label: 'Zarqa',    labelAr: 'الزرقاء',   size: 11, color: '#00C875', delay: 0.9, tier: 2 },
    { id: 'deadsea',  x: 160, y: 160, label: 'Dead Sea', labelAr: 'البحر الميت', size: 10, color: '#00C8E8', delay: 1.1, tier: 2 },
    { id: 'maan',     x: 340, y: 290, label: "Ma'an",    labelAr: 'معان',      size: 10, color: '#00C8E8', delay: 1.4, tier: 2 },
    { id: 'petra',    x: 270, y: 330, label: 'Petra',    labelAr: 'البتراء',   size: 10, color: '#F0A830', delay: 1.6, tier: 2 },
    { id: 'madaba',   x: 360, y: 170, label: 'Madaba',   labelAr: 'مادبا',    size: 9,  color: '#00C875', delay: 1.2, tier: 3 },
    { id: 'salt',     x: 285, y: 95,  label: 'Salt',     labelAr: 'السلط',     size: 8,  color: '#00C8E8', delay: 0.4, tier: 3 },
    { id: 'jarash',   x: 370, y: 90,  label: 'Jerash',   labelAr: 'جرش',      size: 8,  color: '#00C8E8', delay: 0.7, tier: 3 },
  ];

  const routes = [
    { from: [310, 120], to: [200, 440], color: '#00C8E8', width: 2.5, delay: 0,   path: 'M 310 120 C 290 200, 250 300, 230 380 C 215 420, 208 435, 200 440', dash: '' },
    { from: [310, 120], to: [390, 60],  color: '#F0A830', width: 2,   delay: 0.5, path: 'M 310 120 C 335 95, 360 75, 390 60', dash: '' },
    { from: [310, 120], to: [460, 130], color: '#00C875', width: 1.8, delay: 0.8, path: 'M 310 120 C 360 120, 410 125, 460 130', dash: '' },
    { from: [310, 120], to: [160, 160], color: '#00C8E8', width: 1.8, delay: 1.0, path: 'M 310 120 C 260 130, 200 140, 160 160', dash: '8 4' },
    { from: [310, 120], to: [360, 170], color: '#00C875', width: 1.5, delay: 1.1, path: 'M 310 120 C 330 140, 345 155, 360 170', dash: '6 3' },
    { from: [310, 120], to: [340, 290], color: '#00C8E8', width: 1.5, delay: 1.3, path: 'M 310 120 C 320 180, 330 230, 340 290', dash: '6 3' },
    { from: [340, 290], to: [270, 330], color: '#F0A830', width: 1.5, delay: 1.5, path: 'M 340 290 C 315 308, 292 320, 270 330', dash: '5 3' },
    { from: [270, 330], to: [200, 440], color: '#F0A830', width: 1.5, delay: 1.7, path: 'M 270 330 C 250 370, 225 410, 200 440', dash: '5 3' },
  ];

  // Travelers moving along routes
  const travelers = [
    { path: "M 310 120 C 290 200, 250 300, 230 380 C 215 420, 208 435, 200 440", color: '#F0A830', size: 5, delay: 2.5, dur: 4 },
    { path: "M 310 120 C 335 95, 360 75, 390 60",                                 color: '#00C8E8', size: 4, delay: 3.5, dur: 2.5 },
    { path: "M 310 120 C 360 120, 410 125, 460 130",                              color: '#00C875', size: 4, delay: 4.0, dur: 2.5 },
    { path: "M 310 120 C 290 200, 250 300, 230 380 C 215 420, 208 435, 200 440", color: '#00C8E8', size: 3, delay: 5.0, dur: 4.5 },
  ];

  // Floating particles (data nodes in the network)
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: 80 + (i * 27) % 440,
    y: 40 + (i * 19) % 460,
    r: 0.8 + (i % 3) * 0.4,
    delay: i * 0.3,
    color: i % 3 === 0 ? '#00C8E8' : i % 3 === 1 ? '#F0A830' : '#00C875',
  }));

  return (
    <div className="absolute inset-0 w-full h-full">
      <svg
        viewBox="0 0 600 520"
        className="w-full h-full scale-[1.04]"
        preserveAspectRatio="xMidYMid slice"
        style={{ filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.28))' }}
      >
        <defs>
          <radialGradient id="heroNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00C8E8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00C8E8" stopOpacity="0" />
          </radialGradient>
          <filter id="heroGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="heroSoftGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="bgHero" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#00C8E8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#040C18" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="routeFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00C8E8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00C8E8" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background radial glow */}
        <ellipse cx="310" cy="200" rx="300" ry="280" fill="url(#bgHero)" />

        {/* Grid — neural network background */}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 65} x2="600" y2={i * 65} stroke="#00C8E8" strokeWidth="0.3" opacity="0.04" />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="520" stroke="#00C8E8" strokeWidth="0.3" opacity="0.04" />
        ))}

        {/* Floating particles */}
        {particles.map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color}
            animate={{ opacity: [0, 0.4, 0], y: [0, -8, 0] }}
            transition={{ duration: 3 + (i % 3), delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Routes — neural pathway lines */}
        {routes.map((r, i) => (
          <motion.path key={i}
            d={r.path}
            stroke={r.color} strokeWidth={r.width} fill="none"
            strokeLinecap="round" strokeDasharray={r.dash || undefined}
            filter="url(#heroGlow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: r.dash ? 0.5 : 0.75 }}
            transition={{ duration: 1.8, delay: r.delay, ease: 'easeInOut' }}
          />
        ))}

        {/* Pulse rings on major route midpoints */}
        {[[255, 280], [350, 92]].map(([cx, cy], i) => (
          <motion.circle key={i} cx={cx} cy={cy} r={6} fill="none" stroke="#00C8E8" strokeWidth="1"
            animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, delay: i * 1.2 + 2, repeat: Infinity, ease: 'easeOut' }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}

        {/* City nodes */}
        {cities.map((city) => (
          <motion.g key={city.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: city.delay + 0.4, type: 'spring', stiffness: 260 }}>
            {/* Ambient glow */}
            <circle cx={city.x} cy={city.y} r={city.size + 12} fill={city.color} opacity="0.06" />
            {/* Pulse ring */}
            <motion.circle cx={city.x} cy={city.y} r={city.size + 5} fill="none" stroke={city.color} strokeWidth="0.8" strokeOpacity="0.3"
              animate={city.tier === 1 ? { scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] } : {}}
              transition={{ duration: 3, delay: city.delay, repeat: Infinity }}
              style={{ transformOrigin: `${city.x}px ${city.y}px` }}
            />
            {/* Outer ring */}
            <circle cx={city.x} cy={city.y} r={city.size + 3} fill="none" stroke={city.color} strokeWidth="0.8" strokeOpacity="0.35" />
            {/* Node body */}
            <circle cx={city.x} cy={city.y} r={city.size} fill="#040C18" stroke={city.color} strokeWidth={city.tier === 1 ? 2 : 1.5}
              filter="url(#heroGlow)" />
            {/* Node center fill */}
            <circle cx={city.x} cy={city.y} r={city.size * 0.42} fill={city.color} />

            {/* Label */}
            <text x={city.x + city.size + 8} y={city.y + 4}
              fill="rgba(255,255,255,0.94)" fontSize={city.tier === 1 ? 12 : 10}
              fontFamily="Inter, sans-serif" fontWeight={city.tier === 1 ? '600' : '400'}>
              {city.label}
            </text>
            <text x={city.x + city.size + 8} y={city.y + 17}
              fill="rgba(255,255,255,0.58)" fontSize={city.tier === 1 ? 9.5 : 8}
              fontFamily="Cairo, Tajawal, sans-serif">
              {city.labelAr}
            </text>
          </motion.g>
        ))}

        {/* Moving travelers — SVG-native animateMotion to avoid offsetDistance prop warning */}
        {travelers.map((t, i) => (
          <circle key={i} r={t.size} fill={t.color} filter="url(#heroGlow)">
            <animateMotion dur={`${t.dur}s`} repeatCount="indefinite" begin={`${t.delay}s`}
              path={t.path} calcMode="paced" />
          </circle>
        ))}

        {/* Package icons floating along route */}
        <motion.g animate={{ y: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 3.5 }}>
          <rect x="248" y="255" width="16" height="16" rx="3" fill="#F0A830" opacity="0.9" />
          <line x1="248" y1="263" x2="264" y2="263" stroke="white" strokeWidth="1" opacity="0.7" />
          <line x1="256" y1="255" x2="256" y2="271" stroke="white" strokeWidth="1" opacity="0.7" />
        </motion.g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PHONE MOCKUP
   ═══════════════════════════════════════════════════════════════ */
function PhoneMockup({ screen, floating = false }: { screen: React.ReactNode; floating?: boolean }) {
  return (
    <motion.div className="relative mx-auto" style={{ width: 220, height: 440 }}
      animate={floating ? { y: [0, -12, 0] } : {}}
      transition={floating ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : {}}>
      <div className="absolute inset-0 rounded-[36px] border border-white/15 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1a2840, #0d1a2e)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
        {/* Dynamic island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-2xl bg-[#040C18] z-10 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00C8E8]/60" />
          <div className="w-10 h-1.5 rounded-full bg-black/60" />
        </div>
        <div className="absolute inset-0 pt-8 overflow-hidden rounded-[36px]">{screen}</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/20" />
      </div>
      {/* Glass reflection */}
      <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-white/8 to-transparent pointer-events-none" />
      {/* Bottom shadow */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-6 rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,200,232,0.3) 0%, transparent 70%)', filter: 'blur(8px)' }} />
    </motion.div>
  );
}

/* ── App Screens ── */
function HomeScreen() {
  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#040C18' }}>
      <div className="px-4 pt-8 pb-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white/50 text-xs">مرحبا، أحمد 👋</p>
            <p className="text-white font-bold text-sm">Where are you going?</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00C8E8]/20 border border-[#00C8E8]/40 flex items-center justify-center">
            <span className="text-[#00C8E8] text-xs font-bold">A</span>
          </div>
        </div>
        <div className="bg-white/8 rounded-2xl p-3 border border-white/10 mb-4">
          <p className="text-white/40 text-xs">Search destination... | ابحث عن وجهتك</p>
        </div>
        <p className="text-white/50 text-xs mb-2">Popular Routes | مسارات شائعة</p>
        {[
          { from: 'Amman', to: 'Aqaba', price: '8 JOD', seats: 3, color: '#00C8E8' },
          { from: 'Amman', to: 'Irbid', price: '4 JOD', seats: 2, color: '#F0A830' },
        ].map((r) => (
          <div key={r.to} className="flex items-center gap-2 mb-2 p-2 rounded-xl border border-white/8" style={{ background: 'rgba(0,200,232,0.06)' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: r.color + '20' }}>
              <Navigation className="w-3 h-3" style={{ color: r.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{r.from} → {r.to}</p>
              <p className="text-white/40 text-[10px]">{r.seats} seats available</p>
            </div>
            <p className="text-[#F0A830] text-xs font-bold">{r.price}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 relative overflow-hidden mx-3 rounded-2xl">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d2038 0%, #0a1a2e 100%)' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-[#00C8E8]/40"
              style={{ left: `${15 + i * 8}%`, top: `${30 + Math.sin(i) * 25}%` }} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[#00C8E8] bg-[#00C8E8]/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#00C8E8]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEW SCREEN COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function MobilityOSScreen() {
  const services = [
    { icon: '🔎', label: 'Find a Ride', labelAr: 'ابحث عن رحلة', color: '#00C8E8', count: 'Live' },
    { icon: '➕', label: 'Offer a Ride', labelAr: 'اعرض رحلة', color: '#3B82F6', count: 'Live' },
    { icon: '📦', label: 'Packages', labelAr: 'طرود', color: '#F0A830', count: 'Live' },
    { icon: '🚌', label: 'Wasel Bus', labelAr: 'باص', color: '#00C875', count: 'Ready' },
    { icon: '💳', label: 'Wallet', labelAr: 'محفظة', color: '#A78BFA', count: 'Live' },
    { icon: '🔔', label: 'Alerts', labelAr: 'تنبيهات', color: '#22C55E', count: 'Live' },
  ];
  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#040C18' }}>
      <div className="px-4 pt-8 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Mobility OS</p>
            <p className="text-white font-black text-base">واصل • Wasel</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(0,200,232,0.12)', border: '1px solid rgba(0,200,232,0.25)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#A8E63D] animate-pulse" />
            <span className="text-[#00C8E8] text-[10px] font-semibold">Jordan Live</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl mb-4" style={{ background: 'rgba(0,200,232,0.06)', border: '1px solid rgba(0,200,232,0.12)' }}>
          <div className="flex items-center justify-between">
            {[{ val: '12K+', lbl: 'Users' }, { val: '48K', lbl: 'Trips' }, { val: '4.9★', lbl: 'Rating' }].map(s => (
              <div key={s.lbl} className="text-center">
                <p className="text-[#00C8E8] font-black text-sm">{s.val}</p>
                <p className="text-white/35 text-[9px]">{s.lbl}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Services</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {services.map((s) => (
            <div key={s.label} className="p-2.5 rounded-2xl flex flex-col items-center gap-1"
              style={{ background: `${s.color}0D`, border: `1px solid ${s.color}22` }}>
              <span className="text-lg">{s.icon}</span>
              <p className="text-white text-[10px] font-semibold leading-tight">{s.label}</p>
              <p className="text-[9px]" style={{ color: s.color }}>{s.count}</p>
            </div>
          ))}
        </div>
        <div className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #00C8E8, #0095b8)' }}>
          <span className="text-white text-xs font-bold">Open Platform · افتح</span>
        </div>
      </div>
    </div>
  );
}

function RidesScreen() {
  const [tab, setTab] = useState<'find' | 'post'>('find');
  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#040C18' }}>
      <div className="px-4 pt-8 pb-3">
        <p className="text-white font-bold text-sm mb-3">Rides | الرحلات</p>
        <div className="flex rounded-xl p-0.5 mb-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['find', 'post'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: tab === t ? '#00C8E8' : 'transparent', color: tab === t ? 'white' : 'rgba(255,255,255,0.4)' }}>
              {t === 'find' ? '🔍 Find Ride' : '🚗 Post Ride'}
            </button>
          ))}
        </div>
        {tab === 'find' ? (
          <>
            <div className="space-y-2 mb-3">
              {[{ icon: '🟢', label: 'From', val: 'Amman' }, { icon: '🔴', label: 'To', val: 'Aqaba' }].map((f) => (
                <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-xs">{f.icon}</span>
                  <div>
                    <p className="text-white/40 text-[9px]">{f.label}</p>
                    <p className="text-white text-[11px] font-medium">{f.val}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded-xl border border-white/10 bg-white/5"><p className="text-white/40 text-[9px]">Date</p><p className="text-white text-[11px] font-medium">Fri, Mar 14</p></div>
              <div className="p-2 rounded-xl border border-white/10 bg-white/5"><p className="text-white/40 text-[9px]">Seats</p><p className="text-white text-[11px] font-medium">2 seats</p></div>
            </div>
            {[
              { d: 'Mohammed K.', r: 4.9, t: '07:00 AM', p: '8 JOD', s: 3 },
              { d: 'Sara A.', r: 4.8, t: '09:30 AM', p: '9 JOD', s: 2 },
            ].map((r) => (
              <div key={r.d} className="flex items-center gap-2 mb-2 p-2.5 rounded-xl border border-white/8 bg-white/3">
                <div className="w-7 h-7 rounded-full bg-[#00C8E8]/20 border border-[#00C8E8]/30 flex items-center justify-center shrink-0">
                  <span className="text-[#00C8E8] text-[10px] font-bold">{r.d[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-white text-[10px] font-medium truncate">{r.d}</p>
                    <Star className="w-2 h-2 text-yellow-400 fill-yellow-400 shrink-0" />
                    <span className="text-white/50 text-[9px]">{r.r}</span>
                  </div>
                  <p className="text-white/45 text-[9px]">{r.t} · {r.s} seats</p>
                </div>
                <p className="text-[#F0A830] text-[10px] font-bold shrink-0">{r.p}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            <p className="text-white/40 text-[10px] mb-3" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>انشر رحلتك واكسب مصاري</p>
            {[{ label: 'From', val: 'Amman' }, { label: 'To', val: 'Aqaba' }, { label: 'Departure', val: 'Sat 07:00 AM' }, { label: 'Available seats', val: '3 seats' }].map((f) => (
              <div key={f.label} className="mb-2 p-2.5 rounded-xl border border-white/10 bg-white/5">
                <p className="text-white/40 text-[9px]">{f.label}</p>
                <p className="text-white text-[11px] font-medium">{f.val}</p>
              </div>
            ))}
            <div className="p-2.5 rounded-2xl border border-[#00C8E8]/25 bg-[#00C8E8]/6">
              <div className="flex justify-between items-center">
                <div><p className="text-white/50 text-[9px]">Price / seat</p><p className="text-white font-bold text-base">8 JOD</p></div>
                <div className="text-right"><p className="text-white/50 text-[9px]">You earn</p><p className="text-[#00C875] font-bold text-base">21 JOD</p></div>
              </div>
            </div>
            <div className="mt-3 w-full py-2.5 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00C8E8, #0095b8)' }}>
              <span className="text-white text-xs font-bold">Post Ride | انشر</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PackagesScreen() {
  const [tab, setTab] = useState<'send' | 'track'>('send');
  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#040C18' }}>
      <div className="px-4 pt-8 pb-3">
        <p className="text-white font-bold text-sm mb-3">Packages | الطرود</p>
        <div className="flex rounded-xl p-0.5 mb-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['send', 'track'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: tab === t ? '#F0A830' : 'transparent', color: tab === t ? 'white' : 'rgba(255,255,255,0.4)' }}>
              {t === 'send' ? '📦 Send & Create' : '📍 Track'}
            </button>
          ))}
        </div>
        {tab === 'send' ? (
          <>
            <p className="text-white/40 text-[10px] mb-3" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>أرسل طردك مع مسافر · رخيص وآمن</p>
            {[{ label: 'From', val: 'Amman' }, { label: 'To', val: 'Aqaba' }, { label: 'Size', val: 'Small · up to 5 kg' }, { label: 'Description', val: 'Electronics (fragile)' }].map((f) => (
              <div key={f.label} className="mb-2 p-2.5 rounded-xl border border-white/10 bg-white/5">
                <p className="text-white/40 text-[9px]">{f.label}</p>
                <p className="text-white text-[11px] font-medium">{f.val}</p>
              </div>
            ))}
            <div className="p-2.5 rounded-2xl border border-[#F0A830]/30 bg-[#F0A830]/8">
              <div className="flex justify-between items-center">
                <div><p className="text-white/50 text-[9px]">Cost</p><p className="text-white font-bold text-base">3.50 JOD</p></div>
                <div className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#F0A830]" /><p className="text-[#F0A830] text-[10px] font-semibold">Insured 100 JOD</p></div>
              </div>
            </div>
            <div className="mt-3 w-full py-2.5 rounded-2xl flex items-center justify-center" style={{ background: '#F0A830' }}>
              <span className="text-white text-xs font-bold">Create & Send · أرسل</span>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 p-2.5 rounded-2xl border border-[#00C8E8]/25 bg-[#00C8E8]/6">
              <p className="text-[#00C8E8] text-[10px] font-semibold mb-0.5">PKG-20260314-AQB</p>
              <p className="text-white text-xs font-bold">Amman → Aqaba · In Transit 🚗</p>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-[9px] text-white/50 mb-1"><span>Amman</span><span>Aqaba</span></div>
              <div className="h-2 rounded-full bg-white/10 relative overflow-hidden">
                <motion.div className="absolute left-0 top-0 h-full rounded-full" style={{ background: '#00C8E8' }}
                  initial={{ width: '20%' }} animate={{ width: '62%' }} transition={{ duration: 2, delay: 0.3 }} />
              </div>
              <div className="flex justify-between text-[9px] mt-1"><span className="text-white/35">Picked up 9:00 AM</span><span className="text-[#00C8E8]">ETA 1:10 PM</span></div>
            </div>
            {[
              { icon: '✅', label: 'Picked up', sub: '9:00 AM · Amman', done: true },
              { icon: '🚗', label: 'In Transit', sub: 'Currently moving', done: true },
              { icon: '📍', label: 'Delivery', sub: 'Est. 1:10 PM · Aqaba', done: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 mb-2">
                <span className="text-sm">{s.icon}</span>
                <div className="flex-1">
                  <p className={`text-[11px] font-semibold ${s.done ? 'text-white' : 'text-white/40'}`}>{s.label}</p>
                  <p className="text-[9px] text-white/35">{s.sub}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function WaselBusScreen() {
  const routes = [
    { from: 'Amman', to: 'Aqaba', dep: '06:00 AM', seats: 12, price: '6 JOD', color: '#00C8E8' },
    { from: 'Amman', to: 'Irbid', dep: '08:30 AM', seats: 7, price: '3 JOD', color: '#00C875' },
    { from: 'Amman', to: 'Zarqa', dep: '09:15 AM', seats: 20, price: '2 JOD', color: '#F0A830' },
  ];
  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#040C18' }}>
      <div className="px-4 pt-8 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🚌</span>
          <div>
            <p className="text-white font-bold text-sm">Wasel Bus</p>
            <p className="text-white/40 text-[10px]" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>باص واصل · حجوزات مسبقة</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl mb-4 flex items-center justify-between"
          style={{ background: 'rgba(0,200,232,0.06)', border: '1px solid rgba(0,200,232,0.15)' }}>
          <div className="text-center"><p className="text-[#00C8E8] font-bold text-sm">3</p><p className="text-white/35 text-[9px]">Routes</p></div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center"><p className="text-[#F0A830] font-bold text-sm">Fri</p><p className="text-white/35 text-[9px]">Today</p></div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center"><p className="text-[#00C875] font-bold text-sm">39</p><p className="text-white/35 text-[9px]">Seats Left</p></div>
        </div>
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Today's Departures</p>
        {routes.map((r) => (
          <div key={r.to} className="mb-2.5 p-3 rounded-2xl"
            style={{ background: `${r.color}0A`, border: `1px solid ${r.color}25` }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: r.color }} />
                <p className="text-white font-semibold text-[11px]">{r.from} → {r.to}</p>
              </div>
              <p className="font-bold text-[11px]" style={{ color: r.color }}>{r.price}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white/45 text-[9px]">🕐 {r.dep}</span>
                <span className="text-white/45 text-[9px]">💺 {r.seats} seats</span>
              </div>
              <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: `${r.color}20`, color: r.color }}>Book</div>
            </div>
          </div>
        ))}
        <div className="mt-1 w-full py-2.5 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00C875, #009950)' }}>
          <span className="text-white text-xs font-bold">All Routes · كل المسارات</span>
        </div>
      </div>
    </div>
  );
}



function ProfileScreen() {
  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#040C18' }}>
      <div className="px-4 pt-8 pb-3">
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00C8E8]/30 to-[#00C875]/30 border-2 border-[#00C8E8]/50 flex items-center justify-center mb-2">
            <span className="text-[#00C8E8] text-xl font-bold">أ</span>
          </div>
          <p className="text-white font-bold text-sm">أحمد الخالدي</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white/70 text-xs">4.97 · Verified ✓</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[{ val: '47', label: 'Trips' }, { val: '4.97', label: 'Rating' }, { val: '12', label: 'Packages' }].map((s) => (
            <div key={s.label} className="p-2 rounded-xl border border-white/10 bg-white/5 text-center">
              <p className="text-[#00C8E8] font-bold text-sm">{s.val}</p>
              <p className="text-white/40 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
        {[
          { icon: '✓', label: 'ID Verified', color: '#00C875' },
          { icon: '📱', label: 'Phone Verified', color: '#00C8E8' },
          { icon: '⭐', label: 'Top Traveler', color: '#F0A830' },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-3 mb-2 p-2 rounded-xl border border-white/8 bg-white/3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: b.color + '20', color: b.color }}>{b.icon}</div>
            <p className="text-white/80 text-xs">{b.label}</p>
            <CheckCircle className="w-3 h-3 ml-auto" style={{ color: b.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

// Reusable scroll-reveal wrapper
function Reveal({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'left' | 'right' | 'none' }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const variants = {
    hidden: { opacity: 0, y: direction === 'up' ? 40 : 0, x: direction === 'left' ? -40 : direction === 'right' ? 40 : 0 },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'}
      variants={variants} transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

// Section label tag
function SectionTag({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00C8E8]/30 mb-6"
      style={{ background: 'rgba(0,200,232,0.08)' }}>
      <div className="w-1.5 h-1.5 rounded-full bg-[#00C8E8] animate-pulse" />
      <span className="text-[#00C8E8] text-xs font-semibold uppercase tracking-widest">{text}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function LandingPage({ onGetStarted, onLogin, onExploreRides, onOfferRide, onExplorePackages }: LandingPageProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeScreen, setActiveScreen] = useState(0);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveScreen(s => (s + 1) % 6), 3800);
    return () => clearInterval(t);
  }, []);

  const screens = [
    <MobilityOSScreen />,
    <HomeScreen />,
    <RidesScreen />,
    <PackagesScreen />,
    <WaselBusScreen />,
    <ProfileScreen />,
  ];
  const screenLabels = ['Mobility OS', 'Home', '1st · Find & Post Rides', '2nd · Packages', 'Wasel Bus', 'Profile'];

  const navLinks = [
    { label: 'The Network', href: '#network' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Product', href: '#product' },
    { label: 'Trust', href: '#trust' },
  ];

  const liveServiceCards = [
    {
      title: 'Find a Ride',
      subtitle: 'Search live intercity rides and book the corridor instantly.',
      icon: <Navigation className="w-5 h-5" />,
      color: '#00C8E8',
      action: onExploreRides,
    },
    {
      title: 'Offer a Ride',
      subtitle: 'Publish seats, turn your route live, and open package capacity.',
      icon: <Car className="w-5 h-5" />,
      color: '#3B82F6',
      action: onOfferRide,
    },
    {
      title: 'Packages',
      subtitle: 'Send, track, and attach deliveries to already-posted rides.',
      icon: <Package className="w-5 h-5" />,
      color: '#F0A830',
      action: onExplorePackages,
    },
  ];

  // Problem story cards
  const problems = [
    { emoji: '🚗', title: 'Empty Seats, Full Cost', titleAr: 'مقاعد فارغة، تكلفة كاملة', desc: 'Millions of cars drive between cities every day with empty seats. The driver pays full fuel costs alone.', color: '#ef4444' },
    { emoji: '💸', title: 'Expensive Taxis', titleAr: 'تكسي غالي', desc: 'Traditional taxis charge 3-5× the real cost of the journey. Intercity travel stays unaffordable for most.', color: '#f59e0b' },
    { emoji: '📦', title: 'Slow Deliveries', titleAr: 'توصيل بطيء', desc: 'Packages wait days for couriers when travelers are already going to the same destination right now.', color: '#8b5cf6' },
  ];

  // Benefits
  const benefits = [
    { icon: <TrendingUp className="w-6 h-6" />, title: 'Save up to 70%', titleAr: 'وفّر لغاية 70%', desc: 'Split fuel costs with real travelers going your way. JOD 8 instead of JOD 25.', color: '#00C8E8' },
    { icon: <Zap className="w-6 h-6" />, title: 'Instant Matching', titleAr: 'مطابقة فورية', desc: 'AI matches your trip with drivers heading the same way, same day.', color: '#F0A830' },
    { icon: <Package className="w-6 h-6" />, title: 'Send Packages', titleAr: 'أرسل الطرود', desc: 'Your package rides with a verified traveler. Tracked, insured, delivered.', color: '#00C875' },
    { icon: <Heart className="w-6 h-6" />, title: 'Cultural Comfort', titleAr: 'راحة ثقافية', desc: 'Women-only rides, prayer stops, Ramadan mode. Built for you.', color: '#F0A830' },
    { icon: <Leaf className="w-6 h-6" />, title: 'Greener Travel', titleAr: 'سفر أنظف', desc: 'Full cars mean fewer vehicles on the road. Every shared trip reduces emissions.', color: '#00C875' },
    { icon: <Globe className="w-6 h-6" />, title: 'Intercity Network', titleAr: 'شبكة بين المدن', desc: 'Amman to Aqaba, Irbid, Petra and beyond. Growing every month.', color: '#00C8E8' },
  ];

  // How it works steps
  const steps = [
    { num: '01', title: 'Choose Your Destination', titleAr: 'اختر وجهتك', desc: 'Search by city, date, and number of seats. Find rides posted by real travelers.', icon: <MapPin className="w-5 h-5" /> },
    { num: '02', title: 'Intelligent Matching', titleAr: 'مطابقة ذكية', desc: 'Our network connects you with verified drivers heading your way. See reviews, ratings, and car details.', icon: <Zap className="w-5 h-5" /> },
    { num: '03', title: 'Share the Journey', titleAr: 'شارك الرحلة', desc: 'Travel together, split the cost. Pay securely or cash on arrival. People and packages, together.', icon: <Users className="w-5 h-5" /> },
  ];

  // Trust steps
  const trustSteps = [
    { icon: <Shield className="w-5 h-5" />, title: 'Identity Verified', titleAr: 'هوية موثّقة', desc: 'Sanad eKYC — government-grade ID verification for every driver and passenger.', color: '#00C8E8' },
    { icon: <Award className="w-5 h-5" />, title: 'Driver Approved', titleAr: 'سائق معتمد', desc: 'Background checks, license validation, and vehicle inspection before the first trip.', color: '#F0A830' },
    { icon: <Lock className="w-5 h-5" />, title: 'Secure Payments', titleAr: 'دفع آمن', desc: 'Stripe-secured payments. Cash on arrival available. Funds released only after trip completion.', color: '#00C875' },
    { icon: <Radio className="w-5 h-5" />, title: 'Live Tracking', titleAr: 'تتبع مباشر', desc: 'Real-time GPS for every trip. Share your journey with loved ones automatically.', color: '#00C8E8' },
  ];

  // Testimonials
  const testimonials = [
    {
      name: 'Ahmad Al-Khalidi', nameAr: 'أحمد الخالدي', role: 'Software Engineer, Amman', rating: 5,
      text: 'I drive to Aqaba every weekend. With Wasel, I fill my car and cover my fuel — I basically travel for free now.',
      textAr: 'بروح على العقبة كل أسبوع. مع واصل، بملّى سيارتي وبغطّي البنزين — صريحة بسافر بالمجان.',
      avatar: 'https://images.unsplash.com/photo-1597424868002-8e844632031d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
    },
    {
      name: 'Nour Al-Hassan', nameAr: 'نور الحسن', role: 'Teacher, Irbid', rating: 5,
      text: 'As a woman, I always felt unsafe in taxis. Wasel\'s women-only rides changed everything for me.',
      textAr: 'كنت دايمًا خايفة من التاكسي. رحلات الستات على واصل غيّرت كل شي.',
      avatar: 'https://images.unsplash.com/photo-1670251544348-e8055a6a2bdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
    },
    {
      name: 'Omar Nassar', nameAr: 'عمر نصّار', role: 'Student, Yarmouk University', rating: 5,
      text: 'I go home to Amman every weekend. Wasel costs me 4 JOD instead of 12 — that\'s my whole week\'s coffee budget!',
      textAr: 'بروح عمّان كل أسبوع. واصل بيكلّفني 4 دينار بدل 12 — هاد مصاري قهوة الأسبوع كله!',
      avatar: 'https://images.unsplash.com/photo-1669924588116-b1fdde8412e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
    },
  ];

  // Future cities (MENA expansion)
  const futureCities = [
    { name: 'Amman', x: 48, y: 52, active: true },
    { name: 'Zarqa', x: 52, y: 48, active: true },
    { name: 'Irbid', x: 46, y: 44, active: true },
    { name: 'Aqaba', x: 44, y: 72, active: true },
    { name: 'Beirut', x: 43, y: 38, active: false },
    { name: 'Damascus', x: 50, y: 40, active: false },
    { name: 'Jerusalem', x: 44, y: 46, active: false },
    { name: 'Cairo', x: 42, y: 62, active: false },
    { name: 'Riyadh', x: 60, y: 62, active: false },
    { name: 'Dubai', x: 70, y: 60, active: false },
    { name: 'Baghdad', x: 58, y: 45, active: false },
  ];

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#040C18', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Progress indicator ── */}
      <motion.div className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
        style={{ background: 'linear-gradient(90deg, #00C8E8, #F0A830)', scaleX: scrollYProgress }} />

      {/* ══════════════════════════════════════════════════════
          NAVBAR
          ══════════════════════════════════════════════════════ */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/8' : ''}`}
        style={{ background: scrolled ? 'rgba(4,12,24,0.96)' : 'transparent', backdropFilter: scrolled ? 'blur(24px)' : 'none' }}
        initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <ConstellationLogo size={36} animate={false} />
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map(l => (
                <button key={l.label}
                  onClick={() => {
                    const id = l.href.replace('#', '');
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-white/55 hover:text-white text-sm font-medium transition-colors duration-200 tracking-wide">
                  {l.label}
                </button>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={onLogin} className="px-5 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
                Sign In | دخول
              </button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onExploreRides}
                className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #00C8E8 0%, #0095b8 100%)' }}>
                <span className="relative z-10">Open Live Services →</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </div>
            <button className="lg:hidden p-2 text-white/70 hover:text-white" onClick={() => setNavOpen(!navOpen)}>
              {navOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {navOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="lg:hidden border-t border-white/10 overflow-hidden"
              style={{ background: 'rgba(4,12,24,0.98)', backdropFilter: 'blur(24px)' }}>
              <div className="px-4 py-4 flex flex-col gap-3">
                {navLinks.map(l => (
                  <button key={l.label}
                    onClick={() => {
                      setNavOpen(false);
                      const id = l.href.replace('#', '');
                      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 150);
                    }}
                    className="text-white/70 hover:text-white py-2 text-sm font-medium transition-colors text-left">
                    {l.label}
                  </button>
                ))}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                  <button onClick={() => { setNavOpen(false); onLogin(); }} className="py-2.5 text-white/70 text-sm font-medium">Sign In | دخول</button>
                  <button onClick={() => { setNavOpen(false); onExploreRides(); }}
                    className="py-3 rounded-2xl text-white font-bold text-sm" style={{ background: '#00C8E8' }}>
                    Open Live Services →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — IMMERSIVE HERO
          ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Neural route map background */}
        <motion.div
          className="absolute inset-0"
          style={{ y: heroY, opacity: heroOpacity, filter: 'contrast(1.14) saturate(1.18) brightness(1.08)' }}
        >
          <NeuralRouteMap />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040C18]/45 via-[#040C18]/18 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040C18]/38 via-transparent to-[#040C18]/18" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="hidden">
            {/* Live indicator */}
            <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00C8E8]/30 mb-8"
              style={{ background: 'rgba(0,200,232,0.06)' }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <motion.div className="w-2 h-2 rounded-full bg-[#00C8E8]"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <span className="text-[#00C8E8] text-xs font-semibold uppercase tracking-widest">Live Network · Jordan</span>
            </motion.div>

            {/* Main headline — word by word reveal */}
            <div className="overflow-hidden mb-6">
              <motion.h1 className="font-black leading-tight"
                style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', lineHeight: 1.05 }}
                initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.85) 100%)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Movement
                </span>
                <br />
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #00C8E8 0%, #5EE7FF 50%, #F0A830 100%)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  connects
                </span>
                <br />
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  everything.
                </span>
              </motion.h1>
            </div>

            <motion.p className="text-lg text-white/65 max-w-xl leading-relaxed mb-3"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
              Wasel is the intelligent network moving people and packages between cities. Built for the Middle East, powered by community.
            </motion.p>
            <motion.p className="text-base text-white/40 mb-10 leading-relaxed"
              style={{ fontFamily: 'Cairo, Tajawal, sans-serif', direction: 'rtl', textAlign: 'left' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              واصل — الشبكة الذكية اللي بتوصّل الناس والطرود بين المدن. شارك الرحلة، وفّر المصاري.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }}>
              <motion.button whileHover={{ scale: 1.04, boxShadow: '0 20px 40px rgba(0,200,232,0.4)' }}
                whileTap={{ scale: 0.97 }} onClick={onExploreRides}
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00C8E8 0%, #0095b8 100%)' }}>
                <span>Find a live ride</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              </motion.button>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onOfferRide}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white/80 border border-white/15 hover:border-white/30 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
                Offer a Ride | اعرض رحلة
              </motion.button>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-4 mt-8 max-w-5xl"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.95 }}
            >
              {liveServiceCards.map((service) => (
                <button
                  key={service.title}
                  onClick={service.action}
                  className="text-left rounded-3xl p-5 border transition-all hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: `${service.color}33`, backdropFilter: 'blur(16px)' }}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl" style={{ background: `${service.color}18`, color: service.color }}>
                      {service.icon}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: service.color }}>Live now</span>
                  </div>
                  <div className="text-white font-bold text-lg">{service.title}</div>
                  <div className="text-white/60 text-sm leading-6 mt-2">{service.subtitle}</div>
                </button>
              ))}
            </motion.div>

            {/* Live stats */}
            <motion.div className="flex flex-wrap gap-6 mt-12"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              {[
                { val: '12K+', label: 'Travelers', color: '#00C8E8' },
                { val: '48K+', label: 'Trips Shared', color: '#F0A830' },
                { val: '4.9★', label: 'Average Rating', color: '#A8E63D' },
                { val: '8 JOD', label: 'Avg. Amman→Aqaba', color: '#00C8E8' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + i * 0.1 }}>
                  <div className="font-black text-2xl" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-white/40 text-xs font-medium">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 w-full min-h-screen flex items-end justify-center px-4 sm:px-6 lg:px-8 pt-32 pb-20 pointer-events-none">
          <motion.div
            className="relative w-full max-w-5xl h-[58vh] rounded-[32px] border border-white/10 overflow-hidden"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 72%)',
              boxShadow: '0 28px 72px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -40px 90px rgba(4,12,24,0.18)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(94,231,255,0.08),transparent_38%),radial-gradient(circle_at_58%_62%,rgba(0,200,117,0.08),transparent_24%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            <div className="absolute left-8 right-8 top-8 h-px hidden sm:block bg-gradient-to-r from-[#5EE7FF]/0 via-[#5EE7FF]/35 to-[#F0A830]/0" />
            <div className="absolute left-6 top-6 sm:hidden inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-1.5"
              style={{ background: 'rgba(6,18,34,0.68)', backdropFilter: 'blur(16px)' }}>
              <span className="inline-flex w-2 h-2 rounded-full bg-[#00C875]" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/75">Network Live</span>
            </div>
            <div className="absolute inset-x-8 top-8 hidden sm:flex items-start justify-between gap-6">
              <motion.div
                className="rounded-[24px] border border-white/12 px-5 py-4"
                style={{
                  background: 'linear-gradient(180deg, rgba(6,18,34,0.82) 0%, rgba(6,18,34,0.62) 100%)',
                  backdropFilter: 'blur(18px)',
                  boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
                }}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.7 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl border border-[#00C8E8]/35 bg-[#00C8E8]/12 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-[#5EE7FF]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[#5EE7FF]/80">Live Grid</div>
                    <div className="text-white font-semibold">Jordan Mobility Network</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/55 text-xs">
                  <span className="inline-flex w-2 h-2 rounded-full bg-[#00C875]" />
                  <span>9 active corridors visualized in real time</span>
                </div>
              </motion.div>

              <motion.div
                className="rounded-[24px] border border-white/12 px-5 py-4 min-w-[250px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(11,20,36,0.8) 0%, rgba(11,20,36,0.56) 100%)',
                  backdropFilter: 'blur(18px)',
                  boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
                }}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.7 }}
              >
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-3">Flagship Route</div>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="text-white font-semibold">Amman to Aqaba</div>
                    <div className="text-white/50 text-xs">330 km corridor</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#F0A830] font-black text-lg">8 JOD</div>
                    <div className="text-white/45 text-xs">from per seat</div>
                  </div>
                </div>
                <div className="h-px bg-white/8 mb-3" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/55">Average load</span>
                  <span className="text-[#A8E63D] font-semibold">87% occupied</span>
                </div>
              </motion.div>
            </div>

            <div className="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8">
              <motion.div
                className="rounded-[28px] border border-white/12 p-3 sm:p-4"
                style={{
                  background: 'linear-gradient(180deg, rgba(6,18,34,0.84) 0%, rgba(6,18,34,0.62) 100%)',
                  backdropFilter: 'blur(18px)',
                  boxShadow: '0 22px 52px rgba(0,0,0,0.24)',
                }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.75 }}
              >
                <div className="hidden sm:flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/42 mb-1">Network Snapshot</div>
                    <div className="text-white/72 text-sm">Mobility, trust, and parcel readiness in one frame</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <div className="w-2 h-2 rounded-full bg-[#5EE7FF]" />
                    <span>Updated live</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Active cities', value: '10', tone: '#5EE7FF', icon: MapPin },
                    { label: 'Shared trips', value: '48K+', tone: '#F0A830', icon: Navigation },
                    { label: 'Trust score', value: '4.9', tone: '#A8E63D', icon: Shield },
                    { label: 'Package ready', value: '24/7', tone: '#00C875', icon: Package },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        className="rounded-[20px] border border-white/8 px-3 py-3 sm:px-4"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 + index * 0.08, duration: 0.5 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center border"
                            style={{ borderColor: `${item.tone}40`, background: `${item.tone}14` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: item.tone }} />
                          </div>
                          <div className="w-12 h-px" style={{ background: `linear-gradient(90deg, transparent, ${item.tone}80)` }} />
                        </div>
                        <div className="text-white font-black text-xl sm:text-2xl leading-none">{item.value}</div>
                        <div className="text-white/45 text-[11px] sm:text-xs mt-2 uppercase tracking-[0.18em]">{item.label}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <div
            className="rounded-full border border-white/12 px-3 py-1.5"
            style={{ background: 'rgba(6,18,34,0.54)', backdropFilter: 'blur(14px)' }}
          >
            <span className="text-white/55 text-[10px] font-medium uppercase tracking-[0.28em]">Explore</span>
          </div>
          <div className="relative w-px h-14 overflow-hidden bg-gradient-to-b from-white/25 to-transparent">
            <motion.div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-4 rounded-full bg-[#5EE7FF]"
              animate={{ y: [0, 40, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM (Story Mode)
          ══════════════════════════════════════════════════════ */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#040C18] via-[#080E1C] to-[#040C18]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Reveal>
              <SectionTag text="The Problem" />
              <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Mobility is broken.
                </span>
              </h2>
              <p className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                Every day, thousands of cars drive between Jordanian cities with empty seats, while people pay too much and wait too long.
              </p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.15}>
                <motion.div className="relative p-8 rounded-3xl border border-white/8 overflow-hidden group"
                  style={{ background: 'var(--wasel-glass-md)', backdropFilter: 'blur(16px)' }}
                  whileHover={{ y: -6, borderColor: `${p.color}40` }}>
                  {/* Background glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${p.color}08, transparent 70%)` }} />
                  <div className="text-5xl mb-6">{p.emoji}</div>
                  <div className="w-8 h-1 rounded-full mb-4" style={{ background: p.color }} />
                  <h3 className="text-xl font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-white/40 text-sm mb-2" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>{p.titleAr}</p>
                  <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — THE BREAKTHROUGH
          ══════════════════════════════════════════════════════ */}
      <section className="py-32 relative overflow-hidden">
        {/* Dramatic background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #040C18 0%, #070E1A 50%, #040C18 100%)' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div className="w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,200,232,0.08) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <SectionTag text="The Breakthrough" />
            <h2 className="font-black mb-8" style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', lineHeight: 1.05 }}>
              <span className="text-white">What if every trip </span>
              <br />
              <span style={{
                backgroundImage: 'linear-gradient(135deg, #00C8E8 0%, #5EE7FF 50%, #F0A830 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                carried more?
              </span>
            </h2>
            <p className="text-white/60 text-xl max-w-3xl mx-auto leading-relaxed mb-12">
              What if the driver heading to Aqaba could take 3 passengers and a package — covering their fuel, earning extra income, and making travel affordable for everyone?
            </p>
          </Reveal>

          {/* Central animated logo reveal */}
          <Reveal delay={0.3}>
            <div className="flex justify-center mb-12">
              <motion.div className="relative"
                animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                <ConstellationLogo size={72} withText={false} />
                {/* Radial pulses */}
                {[1, 2, 3].map(i => (
                  <motion.div key={i} className="absolute inset-0 rounded-full border border-[#00C8E8]/20"
                    animate={{ scale: [1, 2.5 + i * 0.5], opacity: [0.4, 0] }}
                    transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }} />
                ))}
              </motion.div>
            </div>
            <div className="inline-flex items-baseline gap-3">
              <span className="text-4xl font-black" style={{
                backgroundImage: 'linear-gradient(135deg, #00C8E8, #F0A830)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Wasel</span>
              <span className="text-white/30 text-2xl">|</span>
              <span className="text-2xl font-bold text-white/70" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>واصل</span>
            </div>
            <p className="text-white/40 text-sm mt-3 uppercase tracking-widest">The Intelligent Mobility Network</p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — THE NETWORK (Living System)
          ══════════════════════════════════════════════════════ */}
      <section id="network" className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Reveal>
                <SectionTag text="The Network" />
                <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.1 }}>
                  <span className="text-white">A living mobility</span>
                  <br />
                  <span style={{
                    backgroundImage: 'linear-gradient(135deg, #00C8E8, #5EE7FF)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>organism</span>
                </h2>
                <p className="text-white/60 text-lg leading-relaxed mb-8">
                  Routes behave like neural pathways. Every trip creates a connection. Every passenger adds intelligence. The more people travel, the smarter the network becomes.
                </p>
              </Reveal>

              <div className="space-y-4">
                {[
                  { icon: '🏙️', title: 'Amman → Aqaba', detail: '330 km · 4h · from 8 JOD/seat', active: true },
                  { icon: '🎓', title: 'Amman → Irbid', detail: '85 km · 1.5h · from 4 JOD/seat', active: true },
                  { icon: '🌊', title: 'Amman → Dead Sea', detail: '60 km · 1h · from 5 JOD/seat', active: true },
                  { icon: '🏛️', title: 'Amman → Petra', detail: '250 km · 3h · coming soon', active: false },
                ].map((route, i) => (
                  <Reveal key={route.title} delay={i * 0.1}>
                    <motion.div className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 group cursor-pointer"
                      style={{ background: route.active ? 'rgba(0,200,232,0.05)' : 'rgba(13,20,36,0.4)' }}
                      whileHover={{ x: 8, borderColor: 'rgba(0,200,232,0.3)' }}>
                      <span className="text-2xl">{route.icon}</span>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{route.title}</p>
                        <p className="text-white/45 text-xs">{route.detail}</p>
                      </div>
                      {route.active ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#A8E63D] animate-pulse" />
                          <span className="text-[#A8E63D] text-xs font-medium">Live</span>
                        </div>
                      ) : (
                        <span className="text-white/25 text-xs">Soon</span>
                      )}
                    </motion.div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Animated Network Visualization */}
            <Reveal direction="right">
              <div className="relative h-[480px] rounded-3xl border border-white/8 overflow-hidden"
                style={{ background: 'rgba(11,17,32,0.8)', backdropFilter: 'blur(20px)' }}>
                <div className="absolute inset-0 p-4">
                  {/* Mini Jordan neural network */}
                  <svg viewBox="0 0 400 380" className="w-full h-full">
                    <defs>
                      <filter id="netGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    {/* Grid */}
                    {Array.from({ length: 6 }, (_, i) => (
                      <line key={i} x1="0" y1={i * 70} x2="400" y2={i * 70} stroke="#00C8E8" strokeWidth="0.3" opacity="0.05" />
                    ))}

                    {/* Routes */}
                    {[
                      { d: "M 200 90 C 185 160, 165 240, 145 320", color: '#00C8E8', delay: 0, w: 2.5 },
                      { d: "M 200 90 C 250 65, 290 55, 320 50", color: '#F0A830', delay: 0.4, w: 2 },
                      { d: "M 200 90 C 270 95, 310 105, 340 120", color: '#00C875', delay: 0.7, w: 1.8 },
                      { d: "M 200 90 C 160 115, 120 135, 100 155", color: '#00C8E8', delay: 0.9, w: 1.6 },
                      { d: "M 200 90 C 215 160, 225 230, 230 290", color: '#F0A830', delay: 1.1, w: 1.5 },
                    ].map((r, i) => (
                      <motion.path key={i} d={r.d} stroke={r.color} strokeWidth={r.w} fill="none"
                        strokeLinecap="round" filter="url(#netGlow)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.8 }}
                        transition={{ duration: 1.5, delay: r.delay, ease: 'easeInOut' }}
                      />
                    ))}

                    {/* Nodes */}
                    {[
                      { x: 200, y: 90, size: 14, color: '#00C8E8', label: 'عمّان', label2: 'Amman', delay: 0 },
                      { x: 145, y: 320, size: 10, color: '#F0A830', label: 'العقبة', label2: 'Aqaba', delay: 2 },
                      { x: 320, y: 50, size: 9, color: '#F0A830', label: 'إربد', label2: 'Irbid', delay: 0.5 },
                      { x: 340, y: 120, size: 9, color: '#00C875', label: 'الزرقاء', label2: 'Zarqa', delay: 0.8 },
                      { x: 100, y: 155, size: 8, color: '#00C8E8', label: 'البحر الميت', label2: 'Dead Sea', delay: 1 },
                      { x: 230, y: 290, size: 8, color: '#F0A830', label: 'معان', label2: "Ma'an", delay: 1.2 },
                    ].map((n, i) => (
                      <motion.g key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: n.delay + 0.3, type: 'spring' }}>
                        <motion.circle cx={n.x} cy={n.y} r={n.size + 6} fill={n.color} opacity="0.08"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.08, 0.2, 0.08] }}
                          transition={{ duration: 2.5, delay: n.delay, repeat: Infinity }} />
                        <circle cx={n.x} cy={n.y} r={n.size} fill="#040C18" stroke={n.color} strokeWidth="2" filter="url(#netGlow)" />
                        <circle cx={n.x} cy={n.y} r={n.size * 0.4} fill={n.color} />
                        <text x={n.x + n.size + 5} y={n.y + 4} fill="rgba(255,255,255,0.75)" fontSize="9" fontFamily="Inter, sans-serif">{n.label2}</text>
                      </motion.g>
                    ))}

                    {/* Travelers */}
                    {[
                      { path: "M 200 90 C 185 160, 165 240, 145 320", color: '#F0A830', r: 4, delay: 2.5 },
                      { path: "M 200 90 C 250 65, 290 55, 320 50", color: '#00C8E8', r: 3.5, delay: 3.5 },
                    ].map((t, i) => (
                      <circle key={i} r={t.r} fill={t.color} filter="url(#netGlow)">
                        <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${t.delay}s`}
                          path={t.path} calcMode="paced" />
                      </circle>
                    ))}
                  </svg>
                </div>

                {/* Live trips overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="rounded-2xl border border-white/10 p-3" style={{ background: 'rgba(11,17,32,0.9)', backdropFilter: 'blur(16px)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#A8E63D] animate-pulse" />
                      <span className="text-[#A8E63D] text-xs font-semibold">Live trips right now</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[{ n: '23', l: 'Active Trips' }, { n: '67', l: 'Seats Available' }, { n: '3.2k', l: 'Travelers' }].map(s => (
                        <div key={s.l}>
                          <div className="text-[#00C8E8] font-bold text-sm">{s.n}</div>
                          <div className="text-white/40 text-[10px]">{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — HOW IT WORKS (Visual Flow)
          ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #040C18 0%, #070E1A 50%, #040C18 100%)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Reveal>
              <SectionTag text="How It Works" />
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                <span className="text-white">Three steps to </span>
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #00C8E8, #F0A830)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>movement</span>
              </h2>
            </Reveal>
          </div>

          <div className="relative">
            {/* Connecting animated line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 h-px z-0">
              <motion.div className="h-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #00C8E8 30%, #F0A830 70%, transparent 100%)' }}
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeInOut' }} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8 relative z-10">
              {steps.map((step, i) => (
                <Reveal key={step.num} delay={i * 0.2}>
                  <div className="relative group">
                    {/* Step number */}
                    <div className="text-[80px] font-black leading-none mb-4 select-none"
                      style={{ color: 'rgba(0,200,232,0.06)', lineHeight: 1 }}>
                      {step.num}
                    </div>

                    <motion.div className="p-8 rounded-3xl border border-white/8 -mt-12 relative overflow-hidden"
                      style={{ background: 'var(--wasel-glass-md)', backdropFilter: 'blur(16px)' }}
                      whileHover={{ y: -8, borderColor: 'rgba(0,200,232,0.3)' }}>
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-[#00C8E8]"
                        style={{ background: 'rgba(0,200,232,0.1)', border: '1px solid rgba(0,200,232,0.2)' }}>
                        {step.icon}
                      </div>
                      <div className="text-[#00C8E8] text-xs font-bold uppercase tracking-widest mb-2">Step {step.num}</div>
                      <h3 className="text-white text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-white/40 text-sm mb-3" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>{step.titleAr}</p>
                      <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>

                      {/* Arrow connector */}
                      {i < 2 && (
                        <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full"
                          style={{ background: '#040C18', border: '1px solid rgba(0,200,232,0.3)' }}>
                          <ChevronRight className="w-4 h-4 text-[#00C8E8]" />
                        </div>
                      )}
                    </motion.div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Bilingual CTA inline */}
          <Reveal delay={0.4}>
            <div className="text-center mt-16">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onGetStarted}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #00C8E8, #0095b8)' }}>
                Start Your Journey | ابدأ رحلتك
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — PRODUCT EXPERIENCE (Floating Phones)
          ══════════════════════════════════════════════════════ */}
      <section id="product" className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Reveal>
              <SectionTag text="Product Experience" />
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                <span className="text-white">Built for every </span>
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #F0A830, #f5c86a)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>journey</span>
              </h2>
              <p className="text-white/55 text-lg max-w-xl mx-auto">Six experiences. One network. Seamless across every touchpoint.</p>
            </Reveal>
          </div>

          {/* Screen selector tabs */}
          <div className="flex justify-center gap-2 mb-12 flex-wrap">
            {screenLabels.map((label, i) => (
              <motion.button key={label} onClick={() => setActiveScreen(i)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300"
                style={{
                  background: activeScreen === i ? '#00C8E8' : 'rgba(255,255,255,0.05)',
                  color: activeScreen === i ? 'white' : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${activeScreen === i ? '#00C8E8' : 'rgba(255,255,255,0.08)'}`,
                }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                {label}
              </motion.button>
            ))}
          </div>

          {/* 3-phone parallax layout */}
          <div className="relative flex items-center justify-center gap-6 lg:gap-12 min-h-[500px]">
            {/* Left phone — previous */}
            <motion.div className="hidden md:block opacity-30 scale-90"
              style={{ filter: 'blur(2px)' }}>
              <PhoneMockup screen={screens[(activeScreen - 1 + 6) % 6]} />
            </motion.div>

            {/* Center phone — active */}
            <motion.div key={activeScreen} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              <PhoneMockup screen={screens[activeScreen]} floating />
            </motion.div>

            {/* Right phone — next */}
            <motion.div className="hidden md:block opacity-30 scale-90"
              style={{ filter: 'blur(2px)' }}>
              <PhoneMockup screen={screens[(activeScreen + 1) % 6]} />
            </motion.div>

            {/* Ambient glow behind center phone */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(0,200,232,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-2 mt-10">
            {screens.map((_, i) => (
              <button key={i} onClick={() => setActiveScreen(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === activeScreen ? 24 : 6,
                  height: 6,
                  background: i === activeScreen ? '#00C8E8' : 'rgba(255,255,255,0.2)',
                }} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 7 — WHY THIS CHANGES EVERYTHING
          ══════════════════════════════════════════════════════ */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #040C18 0%, #070E1A 50%, #040C18 100%)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Reveal>
              <SectionTag text="Why Wasel" />
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                <span className="text-white">This changes </span>
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #00C8E8, #F0A830)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>everything</span>
              </h2>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.1}>
                <motion.div className="p-8 rounded-3xl border border-white/8 group relative overflow-hidden"
                  style={{ background: 'var(--wasel-glass-md)', backdropFilter: 'blur(16px)' }}
                  whileHover={{ y: -6, borderColor: `${b.color}40` }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 20% 20%, ${b.color}06, transparent 70%)` }} />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 relative z-10"
                    style={{ background: `${b.color}12`, border: `1px solid ${b.color}25`, color: b.color }}>
                    {b.icon}
                  </div>
                  <h3 className="text-white text-lg font-bold mb-1 relative z-10">{b.title}</h3>
                  <p className="text-sm mb-3 relative z-10" style={{ color: b.color, fontFamily: 'Cairo, Tajawal, sans-serif' }}>{b.titleAr}</p>
                  <p className="text-white/55 text-sm leading-relaxed relative z-10">{b.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 8 — TRUST & SAFETY
          ══════════════════════════════════════════════════════ */}
      <section id="trust" className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Reveal>
                <SectionTag text="Trust & Safety" />
                <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.1 }}>
                  <span className="text-white">Trust built into</span>
                  <br />
                  <span style={{
                    backgroundImage: 'linear-gradient(135deg, #00C8E8, #00C875)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>every layer</span>
                </h2>
                <p className="text-white/55 text-lg leading-relaxed mb-8">
                  Safety isn't a feature. It's the foundation. Every person on Wasel goes through a rigorous verification process before their first trip.
                </p>
              </Reveal>

              <div className="space-y-4">
                {trustSteps.map((step, i) => (
                  <Reveal key={step.title} delay={i * 0.12}>
                    <motion.div className="flex gap-4 p-5 rounded-2xl border border-white/8 group"
                      style={{ background: 'var(--wasel-glass-sm)', backdropFilter: 'blur(16px)' }}
                      whileHover={{ x: 6, borderColor: `${step.color}35` }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${step.color}12`, border: `1px solid ${step.color}25`, color: step.color }}>
                        {step.icon}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-0.5">{step.title}</h4>
                        <p className="text-white/35 text-xs mb-1" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>{step.titleAr}</p>
                        <p className="text-white/55 text-xs leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Trust Score visual */}
            <Reveal direction="right">
              <div className="relative p-8 rounded-3xl border border-white/8" style={{ background: 'var(--wasel-glass-md)', backdropFilter: 'blur(20px)' }}>
                <h3 className="text-white font-bold text-lg mb-6">Community Trust Score</h3>

                {/* Score ring */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                      <motion.circle cx="80" cy="80" r="70" fill="none" stroke="url(#trustGradient)" strokeWidth="12"
                        strokeLinecap="round" strokeDasharray="439.8"
                        initial={{ strokeDashoffset: 439.8 }}
                        whileInView={{ strokeDashoffset: 439.8 * 0.03 }}
                        viewport={{ once: true }}
                        transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }} />
                      <defs>
                        <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00C8E8" />
                          <stop offset="100%" stopColor="#00C875" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white">97</span>
                      <span className="text-[#00C8E8] text-xs font-semibold">Trust Score</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { val: '100%', label: 'ID Verified', color: '#00C8E8' },
                    { val: '4.92', label: 'Avg. Rating', color: '#F0A830' },
                    { val: '0', label: 'Disputes', color: '#00C875' },
                    { val: '< 2h', label: 'Response Time', color: '#00C8E8' },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-white/45 text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TESTIMONIALS
          ══════════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #040C18 0%, #070E1A 50%, #040C18 100%)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Reveal>
              <SectionTag text="Community" />
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                <span className="text-white">Real people. </span>
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #F0A830, #f5c86a)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Real journeys.</span>
              </h2>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.15}>
                <motion.div className="p-7 rounded-3xl border border-white/8 flex flex-col gap-4 h-full relative overflow-hidden"
                  style={{ background: 'var(--wasel-glass-md)', backdropFilter: 'blur(16px)' }}
                  whileHover={{ y: -6, borderColor: 'rgba(240,168,48,0.3)' }}>
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }, (_, k) => <Star key={k} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed flex-1">"{t.text}"</p>
                  <p className="text-white/40 text-xs leading-relaxed text-right" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
                    "{t.textAr}"
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#00C8E8]/30 shrink-0">
                      <ImageWithFallback src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-[#00C8E8] text-xs">{t.role}</p>
                    </div>
                  </div>
                  <div className="absolute top-6 right-6 text-[#00C8E8]/12 text-6xl font-serif leading-none select-none">"</div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 9 — FUTURE VISION (MENA Expansion)
          ══════════════════════════════════════════════════════ */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Reveal>
              <SectionTag text="Future Vision" />
              <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
                <span className="text-white">Today Jordan.</span>
                <br />
                <span style={{
                  backgroundImage: 'linear-gradient(135deg, #00C8E8, #F0A830)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Tomorrow the Middle East.</span>
              </h2>
              <p className="text-white/55 text-lg max-w-2xl mx-auto">
                Wasel is building the mobility infrastructure for an entire region. 400 million people. Hundreds of cities. One network.
              </p>
            </Reveal>
          </div>

          {/* MENA Map visualization */}
          <Reveal delay={0.2}>
            <div className="relative rounded-3xl border border-white/8 overflow-hidden" style={{ background: 'rgba(11,17,32,0.8)' }}>
              <div className="relative h-[380px] lg:h-[480px]">
                {/* Background grid */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {Array.from({ length: 10 }, (_, i) => (
                    <line key={`hm${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="#00C8E8" strokeWidth="0.1" opacity="0.04" />
                  ))}
                  {Array.from({ length: 10 }, (_, i) => (
                    <line key={`vm${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="#00C8E8" strokeWidth="0.1" opacity="0.04" />
                  ))}
                </svg>

                {/* Expansion rings from Jordan */}
                {[1, 2, 3, 4].map(i => (
                  <motion.div key={i} className="absolute rounded-full border border-[#00C8E8]/20"
                    style={{
                      left: '48%', top: '52%',
                      width: i * 12 + '%',
                      height: i * 12 + '%',
                      transform: 'translate(-50%, -50%)',
                    }}
                    animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}

                {/* City nodes */}
                {futureCities.map((city, i) => (
                  <motion.div key={city.name} className="absolute"
                    style={{ left: `${city.x}%`, top: `${city.y}%`, transform: 'translate(-50%, -50%)' }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, type: 'spring' }}>
                    <div className="relative flex flex-col items-center">
                      {/* Node */}
                      <motion.div
                        className="rounded-full border-2 flex items-center justify-center"
                        style={{
                          width: city.active ? 20 : 12,
                          height: city.active ? 20 : 12,
                          background: city.active ? 'rgba(0,200,232,0.2)' : 'rgba(255,255,255,0.05)',
                          borderColor: city.active ? '#00C8E8' : 'rgba(255,255,255,0.15)',
                        }}
                        animate={city.active ? { boxShadow: ['0 0 0 0 rgba(0,200,232,0.4)', '0 0 0 8px rgba(0,200,232,0)', '0 0 0 0 rgba(0,200,232,0)'] } : {}}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                        {city.active && <div className="w-2 h-2 rounded-full bg-[#00C8E8]" />}
                      </motion.div>
                      {/* Label */}
                      <span className="text-[10px] mt-1 font-medium whitespace-nowrap"
                        style={{ color: city.active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }}>
                        {city.name}
                      </span>
                      {city.active && (
                        <span className="text-[8px] text-[#A8E63D] font-semibold">LIVE</span>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Expanding route lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {[
                    { d: "M 48 52 Q 46 45, 43 38", active: false },
                    { d: "M 48 52 Q 49 46, 50 40", active: false },
                    { d: "M 48 52 Q 46 49, 44 46", active: false },
                    { d: "M 48 52 Q 46 62, 44 72", active: true },
                  ].map((line, i) => (
                    <motion.path key={i} d={line.d}
                      stroke={line.active ? '#00C8E8' : 'rgba(255,255,255,0.1)'} strokeWidth="0.3" fill="none"
                      strokeDasharray={line.active ? '0' : '0.5 1'}
                      initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: i * 0.2 }}
                    />
                  ))}
                </svg>
              </div>

              {/* Timeline */}
              <div className="border-t border-white/8 p-6 grid grid-cols-3 gap-4">
                {[
                  { phase: 'Now', title: 'Jordan Launch', detail: 'Amman, Aqaba, Irbid, Zarqa', color: '#00C8E8', active: true },
                  { phase: 'Year 2', title: 'Levant', detail: 'Palestine, Lebanon, Syria', color: '#F0A830', active: false },
                  { phase: 'Year 3+', title: 'MENA Wide', detail: 'Egypt, Gulf, Iraq', color: '#00C875', active: false },
                ].map((phase, i) => (
                  <div key={phase.phase} className="text-center">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: phase.active ? phase.color : 'rgba(255,255,255,0.25)' }}>
                      {phase.phase}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: phase.active ? 'white' : 'rgba(255,255,255,0.35)' }}>{phase.title}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{phase.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 10 — FINAL CTA
          ══════════════════════════════════════════════════════ */}
      <section className="py-40 relative overflow-hidden">
        {/* Epic background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #040C18 0%, #050A14 50%, #040C18 100%)' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div className="w-[800px] h-[800px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,200,232,0.07) 0%, transparent 65%)' }}
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div className="w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(240,168,48,0.05) 0%, transparent 65%)' }}
            animate={{ scale: [1.1, 1, 1.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            {/* Big constellation logo */}
            <div className="flex justify-center mb-12">
              <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                <ConstellationLogo size={80} withText={false} />
              </motion.div>
            </div>

            <h2 className="font-black mb-6" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)', lineHeight: 1.0 }}>
              <span style={{
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.9) 40%, #00C8E8 70%, #F0A830 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Join the
              </span>
              <br />
              <span style={{
                backgroundImage: 'linear-gradient(135deg, #00C8E8 0%, #5EE7FF 50%, #F0A830 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                movement.
              </span>
            </h2>
            <p className="text-xl text-white/50 mb-4 max-w-2xl mx-auto leading-relaxed">
              Be part of the network that's changing how the Middle East moves. Early access is limited.
            </p>
            <p className="text-lg text-white/35 mb-14" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
              انضم للشبكة. شارك الرحلة. وفّر المصاري. غيّر طريقة سفرك.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-5 justify-center mb-16">
              <motion.button whileHover={{ scale: 1.05, boxShadow: '0 24px 60px rgba(0,200,232,0.45)' }}
                whileTap={{ scale: 0.97 }} onClick={onExploreRides}
                className="group flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black text-xl text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00C8E8 0%, #0095b8 100%)' }}>
                <span>Open Live Mobility</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOfferRide}
                className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold text-white/80 border border-white/15 hover:border-[#F0A830]/40 hover:text-[#F0A830] transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
                <Car className="w-5 h-5" />
                Offer a Ride
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onExplorePackages}
                className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold text-white/80 border border-white/15 hover:border-[#00C875]/40 hover:text-[#00C875] transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
                <Layers className="w-5 h-5" />
                Open Packages
              </motion.button>
            </div>
          </Reveal>

          {/* Social proof bar */}
          <Reveal delay={0.4}>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/35">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#A8E63D]" /><span>No credit card required</span></div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#00C8E8]" /><span>ID verified community</span></div>
              <div className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span>4.9 average rating</span></div>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-[#F0A830]" /><span>Jordan first, MENA next</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/8 py-16 relative" style={{ background: 'rgba(7,10,20,0.98)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <ConstellationLogo size={36} />
              <p className="text-white/40 text-sm mt-4 leading-relaxed">
                The intelligent mobility network connecting Jordan and beyond.
              </p>
              <p className="text-white/25 text-xs mt-2" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
                شبكة التنقل الذكية
              </p>
              <div className="flex gap-4 mt-6">
                {[Twitter, Instagram, Facebook, Linkedin].map((Icon, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.2, color: '#00C8E8' }} className="cursor-pointer">
                    <Icon className="w-5 h-5 text-white/30 hover:text-[#00C8E8] transition-colors" />
                  </motion.div>
                ))}
              </div>
            </div>

            {[
              { title: 'Product', links: ['Search Rides', 'Post a Ride', 'Send Package', 'Track Package', 'How It Works'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Press', 'Investor Relations'] },
              { title: 'Support', links: ['Help Center', 'Safety Center', 'Trust & Verification', 'Contact Us', 'Terms & Privacy'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}>
                      <button className="text-white/40 hover:text-white/80 text-sm transition-colors">{link}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-sm">© 2026 Wasel | واصل. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-white/25">
              <span>Built for the Middle East 🇯🇴</span>
              <span>·</span>
              <span>JOD · عربي · English</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
