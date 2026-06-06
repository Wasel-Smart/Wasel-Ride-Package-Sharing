import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { WaselLogo } from '../../../components/wasel-ds/WaselLogo';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';

import { GRAD, R, SH } from '../../../utils/wasel-ds';
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
        borderRadius: R.xxl,
        padding: '18px',
        background: C.elevated,
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
            {ar ? 'نوع الرحلة' : '30-second guided start'}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.86rem', color: C.textMuted, lineHeight: 1.55 }}>
            {ar
              ? 'اختر طريقة البحث ثم افتح المسار المناسب فورا.'
              : 'Pick one decision, then Wasel opens the right flow with route context already attached.'}
          </div>
        </div>
        <div
          style={{
            display: 'inline-grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            padding: 6,
            borderRadius: 18,
            background: C.elevated,
            border: `1px solid ${C.borderFaint}`,
            minWidth: 280,
          }}
        >
          {options.map(option => {
            const selected = tripMode === option.key;
            return (
              <WaselButton
                type="button"
                aria-pressed={selected}
                key={option.key}
                onClick={() => onTripModeChange(option.key)}
                variant="ghost"
                style={{
                  minHeight: 76,
                  height: 'auto',
                  padding: '12px 14px',
                  borderRadius: R.lg,
                  textAlign: 'left',
                  background: selected ? C.cyanDim : 'transparent',
                  border: `1px solid ${selected ? C.borderHov : 'transparent'}`,
                  color: C.text,
                  cursor: 'pointer',
                  justifyContent: 'stretch',
                  whiteSpace: 'normal',
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
              </WaselButton>
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
        <WaselButton
          type="button"
          onClick={() => onNavigate(primaryTripPath)}
          variant="primary"
          size="lg"
          iconEnd={<ArrowRight size={16} />}
          style={{
            height: 50,
            padding: '0 20px',
            borderRadius: R.lg,
            border: 'none',
            background: GRAD,
            color: C.bgDeep,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: SH.cyanL,
          }}
        >
          {ar ? 'ابدأ البحث' : 'Book employee travel'}
          <ArrowRight size={16} />
        </WaselButton>
        <span
          style={{
            height: 50,
            padding: '0 18px',
            borderRadius: R.lg,
            border: `1px solid ${C.border}`,
            background: C.elevated,
            color: C.textMuted,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {ar ? 'اعرض مقعدا' : 'Need supply? Open Manage after booking'}
        </span>
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
          borderRadius: R['3xl'],
          padding: '30px 28px',
          background: C.card,
          border: `1px solid ${C.border}`,
          boxShadow: SH.lg,
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
                background: C.elevated,
                border: `1px solid ${C.borderFaint}`,
                width: 'fit-content',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.textMuted,
              }}
            >
              <Shield size={12} color={C.cyan} />
              {ar ? 'منطق واحد للحركة' : 'Employee travel automation'}
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
            : `Reduce transport cost and automate employee travel${firstName ? `, ${firstName}` : ''}`}
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
            ? 'سواء أردت مقعدا أو عرض مقعد أو إرسال طرد أو التحول إلى الباص، تبدأ كل خطوة من نفس منطق المسار حتى تبقى التجربة أوضح وأسرع.'
            : 'Wasel turns daily commute demand into guided booking, request approval, driver supply, and live trip management so teams spend less time coordinating rides.'}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
            gap: 10,
            marginTop: 18,
          }}
        >
          {[
            { label: 'Book', detail: 'Choose route and seats' },
            { label: 'Request', detail: 'Send approval context' },
            { label: 'Approve', detail: 'Clear pending travel' },
            { label: 'Manage', detail: 'Track live movement' },
          ].map((step, index) => (
            <div
              key={step.label}
              style={{
                borderRadius: 16,
                border: `1px solid ${index === 0 ? C.borderHov : C.borderFaint}`,
                background: index === 0 ? C.cyanDim : C.elevated,
                padding: '12px 12px 11px',
                minHeight: 88,
              }}
            >
              <div
                style={{
                  color: index === 0 ? C.cyan : C.text,
                  fontSize: '0.9rem',
                  fontWeight: 900,
                }}
              >
                {step.label}
              </div>
              <div
                style={{ marginTop: 6, color: C.textDim, fontSize: '0.74rem', lineHeight: 1.45 }}
              >
                {step.detail}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 18,
          }}
        >
          {[
            ar ? 'ثقة واضحة قبل الحجز' : 'Lower recurring commute cost',
            ar ? 'تسعير أوضح على مستوى المسار' : 'Automated request and approval context',
            ar ? 'الرحلات والطرود والباص في شبكة واحدة' : 'Managed travel from booking to arrival',
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
                background: C.elevated,
                border: `1px solid ${C.borderFaint}`,
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
