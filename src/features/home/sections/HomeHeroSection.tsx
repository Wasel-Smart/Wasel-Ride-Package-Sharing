import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { WaselLogo } from '../../../components/wasel-ds/WaselLogo';
import { C, F, InlineCurrencySwitcher } from '../HomePageShared';
import { MobilityOSLandingMap } from '../MobilityOSLandingMap';
import type { TripMode } from './types';

interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string) => void;
  primaryTripPath: string;
}

interface TripModeCardProps {
  ar: boolean;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string) => void;
  primaryTripPath: string;
}

function TripModeCard({
  ar,
  tripMode,
  onTripModeChange,
  onNavigate,
  primaryTripPath,
}: TripModeCardProps) {
  const options = [
    {
      key: 'one-way' as const,
      title: ar ? 'ذهاب فقط' : 'One way',
      desc: ar ? 'بحث مباشر على نفس الاتجاه' : 'Direct search on one corridor',
    },
    {
      key: 'round' as const,
      title: ar ? 'ذهاب وعودة' : 'Round trip',
      desc: ar ? 'احتفظ بالسياق في الاتجاهين' : 'Keep both directions in one flow',
    },
  ];

  return (
    <div
      style={{
        borderRadius: 22,
        padding: '18px',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.textDim,
            }}
          >
            {ar ? 'نوع الرحلة' : 'Trip mode'}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.86rem', color: C.textMuted, lineHeight: 1.55 }}>
            {ar
              ? 'اختر طريقة البحث ثم افتح المسار المناسب فوراً.'
              : 'Choose the search mode, then jump directly into the corridor.'}
          </div>
        </div>
        <div
          style={{
            display: 'inline-grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            padding: 6,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${C.borderFaint}`,
            minWidth: 280,
          }}
        >
          {options.map(option => {
            const selected = tripMode === option.key;
            return (
              <button
                key={option.key}
                onClick={() => onTripModeChange(option.key)}
                style={{
                  minHeight: 76,
                  padding: '12px 14px',
                  borderRadius: 14,
                  textAlign: 'left',
                  background: selected ? 'rgba(88,221,255,0.14)' : 'transparent',
                  border: `1px solid ${selected ? 'rgba(88,221,255,0.32)' : 'transparent'}`,
                  color: C.text,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>{option.title}</div>
                  {selected ? <CheckCircle size={14} color={C.cyan} /> : null}
                </div>
                <div
                  style={{ marginTop: 6, color: C.textDim, fontSize: '0.72rem', lineHeight: 1.5 }}
                >
                  {option.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="wasel-home-primary-actions"
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginTop: 16,
        }}
      >
        <button
          onClick={() => onNavigate(primaryTripPath)}
          style={{
            height: 50,
            padding: '0 20px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #58DDFF 0%, #25B6FF 55%, #47D69E 100%)',
            color: '#041018',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 14px 30px rgba(37,182,255,0.22)',
          }}
        >
          {ar ? 'ابدأ البحث' : 'Start search'}
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => onNavigate('/offer-ride')}
          style={{
            height: 50,
            padding: '0 18px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.03)',
            color: C.text,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {ar ? 'اعرض مقعداً' : 'Offer a seat'}
        </button>
      </div>
    </div>
  );
}

export function HomeHeroSection({
  ar,
  user,
  firstName,
  tripMode,
  onTripModeChange,
  onNavigate,
  primaryTripPath,
}: HomeHeroSectionProps) {
  return (
    <motion.section
      className="wasel-home-hero"
      initial={false}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.02fr) minmax(340px, 0.98fr)',
        gap: 18,
        alignItems: 'stretch',
      }}
    >
      <div
        className="wasel-home-hero-copy"
        style={{
          borderRadius: 30,
          padding: '30px 28px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 22px 54px rgba(0,0,0,0.26)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                width: 'fit-content',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.textMuted,
              }}
            >
              <Shield size={12} color={C.cyan} />
              {ar ? 'منطق واحد للحركة' : 'One route logic'}
            </div>
            <WaselLogo size={34} theme="light" variant="full" />
          </div>
          {user ? <InlineCurrencySwitcher ar={ar} /> : null}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.05em',
            fontWeight: 900,
            maxWidth: 620,
          }}
        >
          {ar
            ? `اختر المسار ثم تحرك${firstName ? `، ${firstName}` : ''}`
            : `Pick the corridor, then move${firstName ? `, ${firstName}` : ''}`}
        </h1>

        <p
          style={{
            margin: '14px 0 0',
            color: C.textMuted,
            lineHeight: 1.78,
            maxWidth: 600,
            fontSize: '0.97rem',
          }}
        >
          {ar
            ? 'سواء أردت مقعداً أو أردت عرض مقعد أو إرسال طرد أو التحول إلى الباص، تبدأ كل خطوة من نفس منطق المسار حتى تبقى التجربة أوضح وأسرع.'
            : 'Whether you need a seat, want to offer one, need to send a parcel, or need the bus fallback, every move starts from the same corridor logic so the product stays clear and fast.'}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 18,
          }}
        >
          {[
            ar ? 'ثقة واضحة قبل الحجز' : 'Trust visible before booking',
            ar ? 'تسعير أوضح على مستوى المسار' : 'Corridor-level pricing clarity',
            ar ? 'الرحلات والطرود والباص في شبكة واحدة' : 'Rides, parcels, and bus in one network',
          ].map(item => (
            <div
              key={item}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 34,
                padding: '0 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: C.textSub,
                fontSize: '0.76rem',
                fontWeight: 600,
                fontFamily: F,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: C.cyan,
                  boxShadow: `0 0 12px ${C.cyan}66`,
                }}
              />
              {item}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <TripModeCard
            ar={ar}
            tripMode={tripMode}
            onTripModeChange={onTripModeChange}
            onNavigate={onNavigate}
            primaryTripPath={primaryTripPath}
          />
        </div>
      </div>

      <div className="wasel-home-hero-aside">
        <MobilityOSLandingMap />
      </div>
    </motion.section>
  );
}
