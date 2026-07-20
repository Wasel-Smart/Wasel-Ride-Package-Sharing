import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrencyService, type SupportedCurrency } from '../../utils/currency';
import { C, F, R } from '../../utils/wasel-ds';

export function CurrencySwitcher({ ar }: { ar: boolean }) {
  const [cur, setCur] = useState<SupportedCurrency>(CurrencyService.getInstance().current);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popular: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'SAR', 'EGP', 'GBP'];
  const currencyNamesAr: Partial<Record<SupportedCurrency, string>> = {
    JOD: 'الدينار الأردني',
    USD: 'الدولار الأمريكي',
    EUR: 'اليورو',
    SAR: 'الريال السعودي',
    EGP: 'الجنيه المصري',
    GBP: 'الجنيه الإسترليني',
  };
  const currencyShortAr: Partial<Record<SupportedCurrency, string>> = {
    JOD: 'دينار',
    USD: 'دولار',
    EUR: 'يورو',
    SAR: 'ريال',
    EGP: 'جنيه',
    GBP: 'إسترليني',
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (code: SupportedCurrency) => {
    CurrencyService.getInstance().setCurrency(code);
    setCur(code);
    setOpen(false);
    window.dispatchEvent(new StorageEvent('storage', { key: 'wasel-preferred-currency' }));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={ar ? 'غيّر العملة' : 'Change currency'}
        style={{
          height: 34,
          padding: '0 10px',
          borderRadius: R.md,
          background: open ? C.cyanDim : C.card,
          border: `1px solid ${open ? C.borderHov : C.border}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: open ? C.text : C.textSub,
          fontFamily: F,
          transition: 'all 0.14s',
        }}
      >
        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>$</span>
        {ar ? currencyShortAr[cur] ?? cur : cur}
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.14s',
            opacity: 0.6,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 200,
            background: C.bg,
            backdropFilter: 'blur(24px)',
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            zIndex: 1100,
            animation: 'fade-in 0.12s ease',
          }}
        >
          <div
            style={{
              padding: '8px 12px 4px',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: C.textMuted,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: F,
            }}
          >
            {ar ? 'اختر العملة' : 'Select currency'}
          </div>
          {popular.map(code => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                background: cur === code ? C.cyanDim : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: cur === code ? 700 : 500,
                color: cur === code ? C.text : C.textSub,
                fontFamily: F,
                transition: 'background 0.12s',
              }}
            >
              <span>{ar ? currencyNamesAr[code] ?? code : code}</span>
              <span style={{ fontSize: '0.7rem', color: C.textMuted, fontFamily: F }}>
                {CurrencyService.getInstance().getSymbol(code)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OnlineToggle({ ar }: { ar: boolean }) {
  const [online, setOnline] = useState(false);
  return (
    <button
      onClick={() => setOnline(o => !o)}
      title={
        online ? (ar ? 'تحويل إلى غير متصل' : 'Go offline') : ar ? 'تحويل إلى متصل' : 'Go online'
      }
      style={{
        height: 34,
        padding: '0 12px',
        borderRadius: R.full,
        background: online ? C.greenDim : C.card,
        border: `1.5px solid ${online ? `${C.green}66` : C.border}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: online ? C.green : C.textMuted,
        fontFamily: F,
        transition: 'all 0.2s',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: online ? C.green : C.textMuted,
          boxShadow: online ? `0 0 8px ${C.green}` : 'none',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
      />
      {online ? (ar ? 'متصل' : 'Online') : ar ? 'غير متصل' : 'Offline'}
    </button>
  );
}

export function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const languages = [
    { code: 'en' as const, label: 'English', labelAr: 'الإنجليزية', flag: '🇺🇸' },
    { code: 'ar' as const, label: 'Arabic', labelAr: 'العربية - الأردن', flag: '🇯🇴' },
  ];

  const current = languages.find(l => l.code === language);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={ar ? 'غيّر اللغة' : 'Change language'}
        style={{
          height: 34,
          padding: '0 10px',
          borderRadius: R.md,
          background: open ? C.cyanDim : C.card,
          border: `1px solid ${open ? C.borderHov : C.border}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: open ? C.text : C.textSub,
          fontFamily: F,
          transition: 'all 0.14s',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '0.9rem', lineHeight: 1 }}>
          {current?.flag}
        </span>
        <span>{ar ? current?.labelAr : current?.label}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.14s',
            opacity: 0.6,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 180,
            background: C.bg,
            backdropFilter: 'blur(24px)',
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            zIndex: 1100,
            animation: 'fade-in 0.12s ease',
          }}
        >
          <div
            style={{
              padding: '8px 12px 4px',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: C.textMuted,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: F,
            }}
          >
            {ar ? 'اختر اللغة' : 'Select language'}
          </div>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                background: language === lang.code ? C.cyanDim : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: language === lang.code ? 700 : 500,
                color: language === lang.code ? C.text : C.textSub,
                fontFamily: F,
                transition: 'background 0.12s',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>
                {lang.flag}
              </span>
              <span>{ar ? lang.labelAr : lang.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: C.textMuted }}>
                {ar ? lang.label : lang.labelAr}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
