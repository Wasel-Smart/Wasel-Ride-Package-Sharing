/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight, ChevronUp, Info, Phone } from 'lucide-react';
import { type SupportedCurrency, useCurrency } from '../../utils/currency';

export const C = {
  bg: 'var(--background)',
  card: 'var(--card)',
  card2: 'var(--wasel-surface-3)',
  s3: 'var(--wasel-surface-4)',
  cyan: '#16C7F2',
  cyanDim: 'rgba(22,199,242,0.12)',
  gold: '#C7FF1A',
  goldDim: 'rgba(199,255,26,0.12)',
  green: '#60C536',
  greenDim: 'rgba(96,197,54,0.12)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.12)',
  red: '#FF4455',
  redDim: 'rgba(255,68,85,0.12)',
  border: 'var(--border)',
  text: 'var(--wasel-copy-primary)',
  textMuted: 'var(--wasel-copy-muted)',
  textDim: 'var(--wasel-copy-soft)',
} as const;

export const F = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
export const glass = (op = 0.68) => {
  if (op >= 0.7) return 'var(--wasel-panel-strong)';
  if (op >= 0.5) return 'var(--wasel-panel-soft)';
  return 'var(--wasel-panel-muted)';
};

export const POPULAR_ROUTES = [
  { from: 'Amman', fromAr: 'عمان', to: 'Aqaba', toAr: 'العقبة', dist: 330, priceJod: 8, icon: 'A', color: C.cyan },
  { from: 'Amman', fromAr: 'عمان', to: 'Irbid', toAr: 'إربد', dist: 85, priceJod: 3, icon: 'I', color: C.green },
  { from: 'Amman', fromAr: 'عمان', to: 'Dead Sea', toAr: 'البحر الميت', dist: 60, priceJod: 5, icon: 'D', color: C.cyan },
  { from: 'Amman', fromAr: 'عمان', to: 'Petra', toAr: 'البترا', dist: 250, priceJod: 12, icon: 'P', color: C.gold },
  { from: 'Amman', fromAr: 'عمان', to: 'Wadi Rum', toAr: 'وادي رم', dist: 320, priceJod: 15, icon: 'W', color: C.gold },
  { from: 'Amman', fromAr: 'عمان', to: 'Zarqa', toAr: 'الزرقاء', dist: 30, priceJod: 2, icon: 'Z', color: C.purple },
] as const;

export function Skeleton({ w = '100%', h = 20, radius = 8 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--wasel-panel-muted) 0%, var(--wasel-panel-soft) 50%, var(--wasel-panel-muted) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s infinite linear',
      }}
    />
  );
}

export function SectionHeader({
  title,
  icon,
  action,
  onAction,
}: {
  title: string;
  icon: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h2 style={{ fontWeight: 800, color: C.text, fontSize: '1rem', margin: 0 }}>{title}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.cyan, fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: F }}>
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

export function InlineCurrencySwitcher() {
  const { current, setCurrency, getSymbol } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popular: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'SAR', 'EGP', 'GBP'];

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const select = (code: SupportedCurrency) => {
    setCurrency(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 9999, background: 'rgba(22,199,242,0.12)', border: '1px solid rgba(73,190,242,0.26)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: C.cyan, fontFamily: F }}>
        FX {current}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 120, background: 'rgba(7,23,38,0.98)', border: '1px solid rgba(73,190,242,0.18)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.6)', zIndex: 100, overflow: 'hidden' }}>
          {popular.map((code) => (
            <button key={code} onClick={() => select(code)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 12px', border: 'none', background: current === code ? 'rgba(22,199,242,0.14)' : 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: current === code ? 700 : 500, color: current === code ? C.cyan : C.text, fontFamily: F }}>
              <span>{code}</span>
              <span style={{ color: C.textDim, fontSize: '0.65rem' }}>{getSymbol(code)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SOSButton({ ar }: { ar: boolean }) {
  const [pressed, setPressed] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleSOS = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    window.open('tel:911', '_self');
    setPressed(true);
    setTimeout(() => {
      setPressed(false);
      setConfirm(false);
    }, 4000);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <motion.button onClick={handleSOS} whileTap={{ scale: 0.92 }} style={{ height: 42, padding: '0 18px', borderRadius: 9999, background: confirm ? '#FF2233' : 'rgba(255,68,85,0.15)', border: `2px solid ${confirm ? '#FF2233' : 'rgba(255,68,85,0.45)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 800, color: confirm ? '#fff' : C.red, fontFamily: F, transition: 'all 0.2s', boxShadow: confirm ? '0 0 24px rgba(255,34,51,0.5)' : 'none' }}>
        <Phone size={14} />
        {pressed ? (ar ? 'جار الاتصال...' : 'Calling...') : confirm ? (ar ? 'اضغط مرة أخرى للتأكيد' : 'Tap again to confirm') : 'SOS'}
      </motion.button>
      {confirm && !pressed && (
        <button onClick={() => setConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: '0.72rem', fontFamily: F }}>
          {ar ? 'إلغاء' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

export function TrustScoreCard({ score, ar }: { score: number; ar: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pct = score;
  const factors = [
    { label: ar ? 'توثيق الهوية عبر سند' : 'ID Verification (Sanad)', weight: 35, yours: 35, color: C.cyan },
    { label: ar ? 'تقييمات المستخدمين' : 'User Ratings', weight: 25, yours: 22, color: C.green },
    { label: ar ? 'الرحلات المكتملة' : 'Completed Trips', weight: 20, yours: 14, color: C.gold },
    { label: ar ? 'النشاط الحديث' : 'Recent Activity', weight: 10, yours: 8, color: C.purple },
    { label: ar ? 'الإعدادات الثقافية' : 'Cultural Preferences Set', weight: 10, yours: 8, color: C.cyan },
  ];
  const color = pct >= 80 ? C.green : pct >= 60 ? C.gold : C.red;

  return (
    <div style={{ borderRadius: 16, padding: '16px 20px', background: glass(0.5), border: '1px solid rgba(73,190,242,0.12)', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color, fontFamily: F }}>{score}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', fontFamily: F }}>{ar ? 'مؤشر الثقة' : 'Trust Score'}</div>
            <div style={{ fontSize: '0.72rem', color, fontFamily: F }}>
              {pct >= 80 ? (ar ? 'ممتاز' : 'Excellent') : pct >= 60 ? (ar ? 'جيد' : 'Good') : (ar ? 'بحاجة لتحسين' : 'Needs Improvement')}
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded((e) => !e)} style={{ background: 'rgba(22,199,242,0.1)', border: '1px solid rgba(73,190,242,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: C.cyan, fontFamily: F, fontWeight: 600 }}>
          <Info size={12} />
          {ar ? 'لماذا؟' : 'Why?'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      <div style={{ marginTop: 12, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: `linear-gradient(90deg, ${color}, ${color}99)`, transition: 'width 0.8s ease' }} />
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(73,190,242,0.12)' }}>
              <p style={{ fontSize: '0.75rem', color: C.textMuted, fontFamily: F, marginBottom: 12 }}>
                {ar ? 'يُحسب هذا المؤشر من خمسة عوامل واضحة. لكل عامل وزن محدد من أصل 100 نقطة.' : 'Your score is calculated from 5 factors. Each has a weight out of 100 points:'}
              </p>
              {factors.map((f) => (
                <div key={f.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: C.textMuted, fontFamily: F }}>{f.label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: f.color, fontFamily: F }}>{f.yours}/{f.weight}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(f.yours / f.weight) * 100}%`, borderRadius: 9999, background: f.color, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
              <p style={{ marginTop: 10, fontSize: '0.7rem', color: C.textDim, fontFamily: F }}>
                {ar ? 'للتحسين: أكمل توثيق الهوية، أضف صورة شخصية، وأنهِ مزيداً من الرحلات.' : 'To improve: complete ID verification, add a profile photo, and complete more trips.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
