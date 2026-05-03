import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { WaselMark } from '../../../components/wasel-ds/WaselLogo';
import {
  C,
  InlineCurrencySwitcher,
  SectionHeader,
  Skeleton,
  glass,
} from '../HomePageShared';
import type { HeadlineStat, ProofPoint, TripMode } from './types';

interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string) => void;
  primaryTripPath: string;
  headlineStats: HeadlineStat[];
  proofPoints: ProofPoint[];
  loading: boolean;
}

interface TripModeCardProps {
  ar: boolean;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string) => void;
  primaryTripPath: string;
}

interface SnapshotPanelProps {
  ar: boolean;
  headlineStats: HeadlineStat[];
  proofPoints: ProofPoint[];
  loading: boolean;
}

function TripModeCard({
  ar,
  tripMode,
  onTripModeChange,
  onNavigate,
  primaryTripPath,
}: TripModeCardProps) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: '16px 18px',
        background:
          'linear-gradient(135deg, rgba(0,200,232,0.06), rgba(0,200,117,0.04))',
        border: '1px solid rgba(0,200,232,0.14)',
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: C.textDim,
        }}
      >
        {ar ? 'نوع الرحلة' : 'Trip mode'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginTop: 12,
        }}
      >
        {[
          {
            key: 'one-way' as const,
            title: ar ? 'ذهاب فقط' : 'One way',
            desc: ar ? 'بحث مباشر في اتجاه واحد' : 'Direct one-way search',
            accent: C.cyan,
          },
          {
            key: 'round' as const,
            title: ar ? 'ذهاب وعودة' : 'Round trip',
            desc: ar ? 'احتفظ بسياق الاتجاهين' : 'Keep both directions in context',
            accent: C.green,
          },
        ].map((option) => (
          <button
            key={option.key}
            onClick={() => onTripModeChange(option.key)}
            style={{
              minHeight: 94,
              padding: '14px 16px',
              borderRadius: 18,
              textAlign: 'left',
              background:
                tripMode === option.key
                  ? `${option.accent}18`
                  : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${
                tripMode === option.key
                  ? option.accent
                  : 'rgba(255,255,255,0.1)'
              }`,
              color: C.text,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                {option.title}
              </div>
              {tripMode === option.key && (
                <CheckCircle size={15} color={option.accent} />
              )}
            </div>
            <div
              style={{
                marginTop: 8,
                color: C.textDim,
                fontSize: '0.73rem',
                lineHeight: 1.5,
              }}
            >
              {option.desc}
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginTop: 14,
        }}
      >
        <button
          onClick={() => onNavigate(primaryTripPath)}
          style={{
            height: 48,
            padding: '0 18px',
            borderRadius: 14,
            border: 'none',
            background:
              'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 55%, #18D7C8 100%)',
            color: '#041018',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {ar ? 'ابدأ البحث' : 'Start search'}
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => onNavigate('/offer-ride')}
          style={{
            height: 48,
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

function SnapshotPanel({
  ar,
  headlineStats,
  proofPoints,
  loading,
}: SnapshotPanelProps) {
  return (
    <div
      style={{
        borderRadius: 28,
        padding: '24px 22px',
        background:
          'linear-gradient(180deg, rgba(10,22,40,0.92), rgba(10,22,40,0.82))',
        border: '1px solid rgba(0,200,232,0.14)',
        boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
      }}
    >
      <SectionHeader
        title={ar ? 'لقطة سريعة' : 'Quick snapshot'}
        icon="•"
      />
      <div
        className="wasel-home-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {headlineStats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                borderRadius: 18,
                padding: '14px 14px 13px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(0,200,232,0.09)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${item.accent}16`,
                  }}
                >
                  <Icon size={16} color={item.accent} />
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: C.textDim,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {item.label}
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: '1.08rem',
                  fontWeight: 900,
                  color: item.accent,
                }}
              >
                {loading ? <Skeleton w={84} h={22} radius={6} /> : item.value}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 20,
          padding: '16px 16px 14px',
          background: glass(0.48),
          border: '1px solid rgba(0,200,232,0.1)',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: C.cyan,
          }}
        >
          {ar ? 'ما الذي يميز واصل؟' : 'Why Wasel works'}
        </div>
        <div
          className="wasel-home-proof-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 10,
            marginTop: 12,
          }}
        >
          {proofPoints.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                style={{
                  borderRadius: 16,
                  padding: '12px 13px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                  }}
                >
                  <Icon size={15} color={C.gold} />
                  {item.title}
                </div>
                <div
                  style={{
                    marginTop: 7,
                    fontSize: '0.78rem',
                    color: C.textMuted,
                    lineHeight: 1.65,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
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
  headlineStats,
  proofPoints,
  loading,
}: HomeHeroSectionProps) {
  return (
    <motion.section
      className="wasel-home-hero"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: 18,
        alignItems: 'stretch',
      }}
    >
      <div
        style={{
          borderRadius: 28,
          padding: '28px 26px',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))',
          border: '1px solid rgba(0,200,232,0.16)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(0,200,232,0.08)',
              border: '1px solid rgba(0,200,232,0.18)',
              boxShadow: '0 0 30px rgba(0,200,232,0.16)',
            }}
          >
            <WaselMark size={44} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: C.cyan,
              }}
            >
              {ar ? 'واصل | منطق واحد للحركة' : 'WASEL | ONE ROUTE LOGIC'}
            </div>
            <h1
              style={{
                margin: '8px 0 0',
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.05em',
                fontWeight: 950,
              }}
            >
              {ar
                ? `اختر المسار ثم تحرك${firstName ? `، ${firstName}` : ''}`
                : `Pick the corridor, then move${firstName ? `, ${firstName}` : ''}`}
            </h1>
            <p
              style={{
                margin: '10px 0 0',
                color: C.textMuted,
                lineHeight: 1.7,
                maxWidth: 560,
              }}
            >
              {ar
                ? 'ابدأ من نفس المسار سواء أردت رحلة أو مشاركة مقعد أو إرسال طرد أو التحول إلى الباص.'
                : 'Start from the same route whether you need a seat, want to offer one, need to send a parcel, or want the bus fallback.'}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(0,200,232,0.14)',
            }}
          >
            <Shield size={15} color={C.green} />
            <span style={{ fontSize: '0.78rem', color: C.textMuted }}>
              {ar
                ? 'ثقة وتسعير واضحان قبل الحجز'
                : 'Trust and pricing stay clear before booking'}
            </span>
          </div>
          {user && <InlineCurrencySwitcher ar={ar} />}
        </div>

        <TripModeCard
          ar={ar}
          tripMode={tripMode}
          onTripModeChange={onTripModeChange}
          onNavigate={onNavigate}
          primaryTripPath={primaryTripPath}
        />
      </div>

      <SnapshotPanel
        ar={ar}
        headlineStats={headlineStats}
        proofPoints={proofPoints}
        loading={loading}
      />
    </motion.section>
  );
}
