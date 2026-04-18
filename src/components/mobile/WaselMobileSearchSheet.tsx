/**
 * WaselMobileSearchSheet — Full-screen bottom-sheet search experience
 *
 * A native-app-style search overlay:
 * - Drag handle + dismissible by swipe down
 * - Two-step form: origin → destination → date
 * - Recent routes (localStorage)
 * - Popular routes chips
 * - RTL/Arabic
 * - Spring-animated, keyboard-aware
 *
 * Usage:
 *   <WaselMobileSearchSheet open={open} onClose={() => setOpen(false)} onSearch={handleSearch} />
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import {
  X,
  MapPin,
  ArrowDown,
  Clock,
  ChevronRight,
  Search,
  Calendar,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const CYAN  = '#47B7E6';
const GOLD  = '#A8D614';
const F     = "'Plus Jakarta Sans','Cairo','Tajawal',sans-serif";
const RECENT_KEY = 'wasel_recent_searches';

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface SearchParams {
  from: string;
  to: string;
  date: string;
  seats: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSearch: (params: SearchParams) => void;
}

interface RecentSearch {
  from: string;
  to: string;
  date: string;
}

/* ─── Popular routes ──────────────────────────────────────────────────────── */
const POPULAR_EN = [
  { from: 'Amman',  to: 'Aqaba'    },
  { from: 'Amman',  to: 'Irbid'    },
  { from: 'Amman',  to: 'Dead Sea' },
  { from: 'Amman',  to: 'Jerash'   },
  { from: 'Aqaba',  to: 'Amman'    },
];

const POPULAR_AR = [
  { from: 'عمّان',  to: 'العقبة'   },
  { from: 'عمّان',  to: 'إربد'     },
  { from: 'عمّان',  to: 'البحر الميت' },
  { from: 'عمّان',  to: 'جرش'      },
  { from: 'العقبة', to: 'عمّان'    },
];

const today = () => new Date().toISOString().split('T')[0];

/* ─── Step indicator ──────────────────────────────────────────────────────── */
function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: 4,
      background: done ? CYAN : active ? GOLD : 'var(--border-strong)',
      transition: 'background 0.2s',
    }} />
  );
}

export function WaselMobileSearchSheet({ open, onClose, onSearch }: Props) {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isAr = language === 'ar';
  const popular = isAr ? POPULAR_AR : POPULAR_EN;

  const [step, setStep]   = useState<0 | 1 | 2>(0); // 0=from, 1=to, 2=date+seats
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [date, setDate]   = useState(today());
  const [seats, setSeats] = useState(1);
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  // Sheet drag
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);
  const DRAG_THRESHOLD = 100;

  useEffect(() => {
    if (!open) return;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
      setRecent(stored.slice(0, 5));
    } catch { setRecent([]); }
    setStep(0);
    setFrom(''); setTo(''); setDate(today()); setSeats(1);
    y.set(0);
    setTimeout(() => fromRef.current?.focus(), 300);
  }, [open, y]);

  const saveRecent = useCallback((params: SearchParams) => {
    const entry: RecentSearch = { from: params.from, to: params.to, date: params.date };
    const updated = [entry, ...recent.filter(r => !(r.from === entry.from && r.to === entry.to))].slice(0, 5);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }, [recent]);

  const handleSearch = useCallback(() => {
    if (!from || !to) return;
    const params: SearchParams = { from, to, date, seats };
    saveRecent(params);
    onSearch(params);
    onClose();
  }, [from, to, date, seats, saveRecent, onSearch, onClose]);

  const handlePopularPick = (route: { from: string; to: string }) => {
    setFrom(route.from);
    setTo(route.to);
    setStep(2);
    setTimeout(() => {
      const dateEl = document.getElementById('wasel-date-input');
      dateEl?.focus();
    }, 200);
  };

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > DRAG_THRESHOLD || info.velocity.y > 500) {
      animate(y, 600, { type: 'spring', stiffness: 300, damping: 30 });
      setTimeout(onClose, 250);
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 32 });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 800,
              background: 'color-mix(in srgb, var(--bg-overlay) 88%, transparent)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            dir={isAr ? 'rtl' : 'ltr'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            style={{
              y, opacity,
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 810,
              borderRadius: '24px 24px 0 0',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 98%, transparent) 0%, color-mix(in srgb, var(--surface-glass) 96%, transparent) 100%)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              boxShadow: '0 -16px 64px rgba(15,23,42,0.18)',
              maxHeight: '92dvh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              fontFamily: F,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', cursor: 'grab' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 16px' }}>
              <h2 style={{ fontFamily: F, fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>
                {isAr ? 'ابحث عن رحلة' : 'Find a Ride'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <X size={15} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
              <StepDot active={step === 0} done={step > 0} />
              <StepDot active={step === 1} done={step > 1} />
              <StepDot active={step === 2} done={false} />
            </div>

            <div style={{ padding: '0 20px 24px' }}>
              {/* ── From / To fields ──────────────────────────────── */}
              <div style={{
                borderRadius: 18,
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                marginBottom: 16,
              }}>
                {/* From */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--surface-divider)' }}>
                  <MapPin size={16} color={CYAN} />
                  <input
                    ref={fromRef}
                    type="text"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    onFocus={() => setStep(0)}
                    placeholder={isAr ? 'من أين؟' : 'From where?'}
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontFamily: F, fontSize: 15, fontWeight: 600,
                      color: from ? 'var(--text-primary)' : 'var(--text-muted)',
                      direction: isAr ? 'rtl' : 'ltr',
                    }}
                  />
                  {from && (
                    <button type="button" onClick={() => setFrom('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Swap button */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 0, position: 'relative', zIndex: 2 }}>
                  <button
                    type="button"
                    onClick={() => { const t = from; setFrom(to); setTo(t); }}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'color-mix(in srgb, var(--surface-muted-strong) 72%, transparent)',
                      border: '1px solid var(--border-strong)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <ArrowDown size={13} color={CYAN} />
                  </button>
                </div>

                {/* To */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <MapPin size={16} color={GOLD} />
                  <input
                    ref={toRef}
                    type="text"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    onFocus={() => setStep(1)}
                    placeholder={isAr ? 'إلى أين؟' : 'To where?'}
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontFamily: F, fontSize: 15, fontWeight: 600,
                      color: to ? 'var(--text-primary)' : 'var(--text-muted)',
                      direction: isAr ? 'rtl' : 'ltr',
                    }}
                  />
                  {to && (
                    <button type="button" onClick={() => setTo('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Date + Seats ──────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'var(--surface-muted)',
                  border: step === 2 ? '1px solid var(--border-strong)' : '1px solid var(--border)',
                }}>
                  <Calendar size={14} color={CYAN} />
                  <input
                    id="wasel-date-input"
                    type="date"
                    value={date}
                    min={today()}
                    onChange={e => setDate(e.target.value)}
                    onFocus={() => setStep(2)}
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontFamily: F, fontSize: 13, color: 'var(--text-primary)',
                      colorScheme: resolvedTheme,
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                }}>
                  <Users size={14} color="var(--text-secondary)" />
                  <button type="button" onClick={() => setSeats(s => Math.max(1, s - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: CYAN, fontFamily: F, fontSize: 18, lineHeight: 1, padding: '0 2px' }}>−</button>
                  <span style={{ fontFamily: F, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', minWidth: 14, textAlign: 'center' }}>{seats}</span>
                  <button type="button" onClick={() => setSeats(s => Math.min(8, s + 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: CYAN, fontFamily: F, fontSize: 18, lineHeight: 1, padding: '0 2px' }}>+</button>
                </div>
              </div>

              {/* ── Search CTA ───────────────────────────────────── */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleSearch}
                disabled={!from || !to}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 16,
                  background: from && to
                    ? `linear-gradient(135deg, ${CYAN}, #1597FF)`
                    : 'rgba(71,183,230,0.2)',
                  border: 'none',
                  cursor: from && to ? 'pointer' : 'default',
                  fontFamily: F,
                  fontWeight: 800, fontSize: 15,
                  color: from && to ? '#032033' : 'rgba(71,183,230,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.2s, color 0.2s',
                  marginBottom: 24,
                }}
              >
                <Search size={17} />
                {isAr ? 'ابحث عن رحلة' : 'Search Rides'}
              </motion.button>

              {/* ── Popular routes ────────────────────────────────── */}
              <div>
                <p style={{ fontFamily: F, fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? 'وجهات شائعة' : 'Popular routes'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {popular.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePopularPick(r)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: 'rgb(var(--wasel-button-primary-rgb) / 0.10)',
                        border: '1px solid var(--wasel-button-primary-border)',
                        cursor: 'pointer',
                        fontFamily: F, fontSize: 12, color: CYAN, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {r.from} → {r.to}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Recent searches ───────────────────────────────── */}
              {recent.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontFamily: F, fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {isAr ? 'الأخيرة' : 'Recent'}
                  </p>
                  {recent.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setFrom(r.from); setTo(r.to); setDate(r.date); setStep(2); }}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        marginBottom: 6,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Clock size={13} color="var(--text-muted)" />
                      <span style={{ flex: 1, fontFamily: F, fontSize: 13, color: 'var(--text-secondary)', textAlign: isAr ? 'right' : 'left' }}>
                        {r.from} → {r.to}
                      </span>
                      <ChevronRight size={12} color="var(--text-muted)" style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default WaselMobileSearchSheet;
