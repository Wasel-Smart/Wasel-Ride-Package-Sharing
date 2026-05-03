import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import {
  C,
  SectionHeader,
  Skeleton,
  SOSButton,
  TrustScoreCard,
} from '../HomePageShared';

interface SignedInUtilitySectionProps {
  ar: boolean;
  loading: boolean;
  walletBalance: string;
  trustScore: number;
}

interface SignedOutCtaSectionProps {
  ar: boolean;
  onNavigate: (path: string) => void;
}

export function SignedInUtilitySection({
  ar,
  loading,
  walletBalance,
  trustScore,
}: SignedInUtilitySectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.16 }}
      style={{ marginTop: 34 }}
    >
      <SectionHeader
        title={ar ? 'الجاهزية قبل الانطلاق' : 'Ready before you move'}
        icon="T"
      />
      <div
        className="wasel-home-utility-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '0.9fr 1.1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            style={{
              borderRadius: 20,
              padding: '18px 18px 16px',
              background:
                'linear-gradient(135deg, rgba(0,200,232,0.1), rgba(0,200,117,0.06))',
              border: '1px solid rgba(0,200,232,0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: C.textDim,
              }}
            >
              <Wallet size={14} color={C.gold} />
              {ar ? 'المحفظة' : 'Wallet'}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: '1.5rem',
                fontWeight: 950,
                color: C.cyan,
              }}
            >
              {loading ? <Skeleton w={120} h={28} radius={6} /> : walletBalance}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: '0.74rem',
                color: C.textMuted,
                lineHeight: 1.6,
              }}
            >
              {ar
                ? 'رصيدك جاهز للحجز أو لتأكيد الطلبات القادمة.'
                : 'Your balance is ready for bookings and upcoming confirmations.'}
            </div>
          </div>

          <div
            style={{
              borderRadius: 20,
              padding: '18px 18px 16px',
              background: 'rgba(255,68,85,0.05)',
              border: '1px solid rgba(255,68,85,0.16)',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: C.textDim,
                marginBottom: 12,
              }}
            >
              {ar ? 'طوارئ' : 'Emergency'}
            </div>
            <SOSButton ar={ar} />
          </div>
        </div>

        <TrustScoreCard score={trustScore} ar={ar} />
      </div>
    </motion.section>
  );
}

export function SignedOutCtaSection({
  ar,
  onNavigate,
}: SignedOutCtaSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.16 }}
      style={{ marginTop: 36, marginBottom: 24 }}
    >
      <div
        style={{
          borderRadius: 26,
          padding: '28px 24px',
          textAlign: 'center',
          background:
            'linear-gradient(135deg, rgba(0,200,232,0.09), rgba(0,200,117,0.05))',
          border: '1px solid rgba(0,200,232,0.18)',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.cyan,
          }}
        >
          {ar ? 'ابدأ بسرعة' : 'Start fast'}
        </div>
        <h2
          style={{
            margin: '12px 0 8px',
            fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
            lineHeight: 1.05,
          }}
        >
          {ar ? 'أنشئ حسابك وافتح نفس الشبكة' : 'Create an account and open the same network'}
        </h2>
        <p
          style={{
            margin: '0 auto',
            maxWidth: 560,
            color: C.textMuted,
            lineHeight: 1.75,
          }}
        >
          {ar
            ? 'عند التسجيل ستحفظ مساراتك المفضلة وتبني سجل الثقة وتدير الحجوزات والطرود من مكان واحد.'
            : 'When you sign up, you keep favorite corridors, build trust history, and manage rides and parcels in one place.'}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 22,
          }}
        >
          <button
            onClick={() => onNavigate('/auth?tab=register')}
            style={{
              height: 48,
              padding: '0 22px',
              borderRadius: 14,
              border: 'none',
              background:
                'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 55%, #18D7C8 100%)',
              color: '#041018',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {ar ? 'ابدأ الآن' : 'Get started'}
          </button>
          <button
            onClick={() => onNavigate('/find-ride')}
            style={{
              height: 48,
              padding: '0 22px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.03)',
              color: C.text,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {ar ? 'تصفح الرحلات' : 'Browse rides'}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
