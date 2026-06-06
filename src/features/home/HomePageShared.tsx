import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight, ChevronUp, Info, Phone } from 'lucide-react';
import { CurrencyService, type SupportedCurrency } from '../../utils/currency';
import { C as TOKENS, F as FONT_SANS, R, SH, TYPE } from '../../utils/wasel-ds';

export const C = {
  ...TOKENS,
  s3: TOKENS.card2,
  red: TOKENS.error,
  redDim: TOKENS.errorDim,
} as const;

export const F = FONT_SANS;
export const glass = (_op = 0.84) => C.glass;

export const POPULAR_ROUTES = [
  {
    from: 'Amman',
    fromAr: 'عمان',
    to: 'Aqaba',
    toAr: 'العقبة',
    dist: 330,
    priceJod: 8,
    icon: 'A',
    color: C.cyan,
  },
  {
    from: 'Amman',
    fromAr: 'عمان',
    to: 'Irbid',
    toAr: 'إربد',
    dist: 85,
    priceJod: 3,
    icon: 'I',
    color: C.green,
  },
  {
    from: 'Amman',
    fromAr: 'عمان',
    to: 'Dead Sea',
    toAr: 'البحر الميت',
    dist: 60,
    priceJod: 5,
    icon: 'D',
    color: C.cyan,
  },
  {
    from: 'Amman',
    fromAr: 'عمان',
    to: 'Petra',
    toAr: 'البتراء',
    dist: 250,
    priceJod: 12,
    icon: 'P',
    color: C.gold,
  },
  {
    from: 'Amman',
    fromAr: 'عمان',
    to: 'Wadi Rum',
    toAr: 'وادي رم',
    dist: 320,
    priceJod: 15,
    icon: 'W',
    color: C.gold,
  },
  {
    from: 'Amman',
    fromAr: 'عمان',
    to: 'Zarqa',
    toAr: 'الزرقاء',
    dist: 30,
    priceJod: 2,
    icon: 'Z',
    color: C.purple,
  },
] as const;

export function Skeleton({
  w = '100%',
  h = 20,
  radius = 8,
}: {
  w?: string | number;
  h?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${C.elevated} 0%, ${C.panel} 50%, ${C.elevated} 100%)`,
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
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            borderRadius: R.full,
            background: C.elevated,
            border: `1px solid ${C.borderFaint}`,
            color: C.textMuted,
            fontSize: TYPE.size.xs,
            fontWeight: TYPE.weight.bold,
            letterSpacing: TYPE.letterSpacing.wider,
            textTransform: 'uppercase',
            width: 'fit-content',
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: C.cyanDim,
              color: C.cyan,
              fontSize: '0.62rem',
              fontWeight: TYPE.weight.black,
            }}
          >
            {icon}
          </span>
          Section
        </div>
        <h2
          style={{
            fontWeight: TYPE.weight.black,
            color: C.text,
            fontSize: '1.12rem',
            letterSpacing: TYPE.letterSpacing.tight,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {action && onAction ? (
        <button
          onClick={onAction}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: R.full,
            background: C.elevated,
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            color: C.textSub,
            fontSize: TYPE.size.sm,
            fontWeight: TYPE.weight.semibold,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: F,
          }}
        >
          {action}
          <ChevronRight size={12} color={C.cyan} />
        </button>
      ) : null}
    </div>
  );
}

export function InlineCurrencySwitcher({ ar }: { ar: boolean }) {
  const svc = CurrencyService.getInstance();
  const [cur, setCur] = useState<SupportedCurrency>(svc.current);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popular: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'SAR', 'EGP', 'GBP'];

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const select = (code: SupportedCurrency) => {
    svc.setCurrency(code);
    setCur(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(value => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 12px',
          borderRadius: R.full,
          background: open ? C.cyanDim : C.elevated,
          border: `1px solid ${open ? C.borderHov : C.border}`,
          cursor: 'pointer',
          fontSize: TYPE.size.sm,
          fontWeight: TYPE.weight.bold,
          color: open ? C.text : C.textSub,
          fontFamily: F,
        }}
      >
        <span style={{ fontSize: TYPE.size.xs, color: C.textMuted }}>
          {ar ? 'العملة' : 'Currency'}
        </span>
        <span>{cur}</span>
        <ChevronDown size={12} color={C.cyan} />
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineStart: 0,
            minWidth: 156,
            background: glass(0.96),
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            boxShadow: SH.lg,
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {popular.map(code => (
            <button
              key={code}
              onClick={() => select(code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                background: cur === code ? C.elevated : 'transparent',
                cursor: 'pointer',
                fontSize: TYPE.size.sm,
                fontWeight: cur === code ? TYPE.weight.bold : TYPE.weight.medium,
                color: cur === code ? C.text : C.textSub,
                fontFamily: F,
              }}
            >
              <span>{code}</span>
              <span style={{ color: C.textDim, fontSize: TYPE.size.xs }}>
                {svc.getSymbol(code)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
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
      <motion.button
        onClick={handleSOS}
        whileTap={{ scale: 0.97 }}
        style={{
          height: 42,
          padding: '0 16px',
          borderRadius: R.full,
          background: confirm ? C.error : C.elevated,
          border: `1px solid ${confirm ? `${C.error}AA` : `${C.error}40`}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: TYPE.size.sm,
          fontWeight: TYPE.weight.bold,
          color: confirm ? C.text : C.error,
          fontFamily: F,
          boxShadow: confirm ? `0 0 0 4px ${C.errorDim}` : 'none',
        }}
      >
        <Phone size={14} />
        {pressed
          ? ar
            ? 'جار الاتصال...'
            : 'Calling...'
          : confirm
            ? ar
              ? 'اضغط مرة أخرى للتأكيد'
              : 'Tap again to confirm'
            : 'SOS'}
      </motion.button>
      {confirm && !pressed ? (
        <button
          onClick={() => setConfirm(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.textDim,
            fontSize: TYPE.size.xs,
            fontFamily: F,
          }}
        >
          {ar ? 'إلغاء' : 'Cancel'}
        </button>
      ) : null}
    </div>
  );
}

export function TrustScoreCard({ score, ar }: { score: number; ar: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pct = score;
  const factors = [
    {
      label: ar ? 'توثيق الهوية عبر سند' : 'ID verification',
      weight: 35,
      yours: 35,
      color: C.cyan,
    },
    { label: ar ? 'تقييمات المستخدمين' : 'User ratings', weight: 25, yours: 22, color: C.green },
    { label: ar ? 'الرحلات المكتملة' : 'Completed trips', weight: 20, yours: 14, color: C.gold },
    { label: ar ? 'النشاط الحديث' : 'Recent activity', weight: 10, yours: 8, color: C.purple },
    { label: ar ? 'اكتمال الملف' : 'Profile completion', weight: 10, yours: 8, color: C.cyan },
  ];
  const color = pct >= 80 ? C.green : pct >= 60 ? C.gold : C.error;

  return (
    <div
      style={{
        borderRadius: 24,
        padding: '20px 22px',
        background: glass(0.88),
        border: `1px solid ${C.border}`,
        boxShadow: SH.card,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `${color}18`,
              border: `1px solid ${color}38`,
              display: 'grid',
              placeItems: 'center',
              boxShadow: `0 0 0 6px ${color}10`,
            }}
          >
            <span
              style={{ fontSize: '1.25rem', fontWeight: TYPE.weight.ultra, color, fontFamily: F }}
            >
              {score}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div
              style={{
                fontWeight: TYPE.weight.black,
                color: C.text,
                fontSize: TYPE.size.lg,
                fontFamily: F,
              }}
            >
              {ar ? 'مؤشر الثقة' : 'Trust score'}
            </div>
            <div style={{ fontSize: TYPE.size.sm, color: C.textMuted, fontFamily: F }}>
              {pct >= 80
                ? ar
                  ? 'مؤشر قوي قبل الحجز أو العرض'
                  : 'Strong standing before booking or offering'
                : pct >= 60
                  ? ar
                    ? 'مؤشر جيد ويستفيد من مزيد من النشاط'
                    : 'Healthy standing with room to improve'
                  : ar
                    ? 'يحتاج إلى تقوية قبل الاعتماد الكامل'
                    : 'Needs stronger standing before full trust'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(value => !value)}
          style={{
            height: 34,
            padding: '0 12px',
            borderRadius: R.full,
            background: C.elevated,
            border: `1px solid ${C.borderFaint}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: TYPE.size.xs,
            color: C.textSub,
            fontWeight: TYPE.weight.semibold,
            fontFamily: F,
          }}
        >
          <Info size={12} color={C.cyan} />
          {ar ? 'طريقة الحساب' : 'How it works'}
          {expanded ? (
            <ChevronUp size={12} color={C.textMuted} />
          ) : (
            <ChevronDown size={12} color={C.textMuted} />
          )}
        </button>
      </div>
      <div
        style={{
          marginTop: 16,
          height: 7,
          borderRadius: 9999,
          background: C.elevated,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 9999,
            background: `linear-gradient(90deg, ${color}, ${C.cyan})`,
            transition: 'width 0.8s ease',
          }}
        />
      </div>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.borderFaint}` }}>
              <p
                style={{
                  fontSize: TYPE.size.sm,
                  color: C.textMuted,
                  fontFamily: F,
                  margin: '0 0 14px',
                }}
              >
                {ar
                  ? 'يتكوّن المؤشر من عوامل واضحة تؤثر مباشرة على الثقة في الحجز والحركة.'
                  : 'The score is built from clear factors that directly affect booking confidence.'}
              </p>
              {factors.map(factor => (
                <div key={factor.label} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: TYPE.size.sm, color: C.textSub, fontFamily: F }}>
                      {factor.label}
                    </span>
                    <span
                      style={{
                        fontSize: TYPE.size.xs,
                        fontWeight: TYPE.weight.bold,
                        color: factor.color,
                        fontFamily: F,
                      }}
                    >
                      {factor.yours}/{factor.weight}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 9999,
                      background: C.elevated,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(factor.yours / factor.weight) * 100}%`,
                        borderRadius: 9999,
                        background: factor.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
