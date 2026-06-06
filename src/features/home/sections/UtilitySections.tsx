import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import { GRAD, R, SH } from '../../../utils/wasel-ds';
import { C, SectionHeader, Skeleton, SOSButton, TrustScoreCard } from '../HomePageShared';

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
    <motion.section initial={false} style={{ marginTop: 38 }}>
      <SectionHeader title={ar ? 'الجاهزية قبل الانطلاق' : 'Readiness before you move'} icon="T" />
      <div
        className="wasel-home-utility-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '0.92fr 1.08fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div
            style={{
              borderRadius: R.xxl,
              padding: '20px 20px 18px',
              background: C.cyanDim,
              border: `1px solid ${C.borderHov}`,
              boxShadow: SH.card,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: C.textDim,
              }}
            >
              <Wallet size={14} color={C.gold} />
              {ar ? 'المحفظة الجاهزة' : 'Wallet ready'}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: '1.6rem',
                fontWeight: 950,
                color: C.text,
                letterSpacing: '-0.03em',
              }}
            >
              {loading ? <Skeleton w={126} h={30} radius={8} /> : walletBalance}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: '0.8rem',
                color: C.textMuted,
                lineHeight: 1.65,
              }}
            >
              {ar
                ? 'رصيدك حاضر للحجز وتأكيد الطلبات القادمة من نفس سطح الحركة.'
                : 'Your balance is ready for bookings and upcoming confirmations from the same mobility surface.'}
            </div>
          </div>

          <div
            style={{
              borderRadius: R.xxl,
              padding: '20px 20px 18px',
              background: C.elevated,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: C.textDim,
                marginBottom: 10,
              }}
            >
              {ar ? 'تصعيد سريع عند الحاجة' : 'Fast escalation when needed'}
            </div>
            <div
              style={{ fontSize: '0.82rem', color: C.textMuted, lineHeight: 1.6, marginBottom: 14 }}
            >
              {ar
                ? 'اختصار واضح للطوارئ بدون تحويل هذه المساحة إلى عنصر بصري صاخب.'
                : 'A clear emergency path without turning the whole surface into visual noise.'}
            </div>
            <SOSButton ar={ar} />
          </div>
        </div>

        <TrustScoreCard score={trustScore} ar={ar} />
      </div>
    </motion.section>
  );
}

export function SignedOutCtaSection({ ar, onNavigate }: SignedOutCtaSectionProps) {
  return (
    <motion.section initial={false} style={{ marginTop: 40, marginBottom: 24 }}>
      <div
        style={{
          borderRadius: R['3xl'],
          padding: '30px 26px',
          textAlign: 'center',
          background: C.card,
          border: `1px solid ${C.borderHov}`,
          boxShadow: SH.lg,
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
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
            margin: '14px 0 10px',
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
          }}
        >
          {ar ? 'أنشئ حسابك وافتح نفس الشبكة' : 'Create an account and open the same network'}
        </h2>
        <p
          style={{
            margin: '0 auto',
            maxWidth: 580,
            color: C.textMuted,
            lineHeight: 1.8,
            fontSize: '0.94rem',
          }}
        >
          {ar
            ? 'عند التسجيل ستحتفظ بمساراتك المفضلة، وتبني سجل الثقة، وتدير الحجوزات والطرود من مكان واحد.'
            : 'When you sign up, you keep favorite corridors, build trust history, and manage rides and parcels in one place.'}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/auth?tab=register')}
            style={{
              height: 50,
              padding: '0 22px',
              borderRadius: R.lg,
              border: 'none',
              background: GRAD,
              color: C.bgDeep,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: SH.cyanL,
            }}
          >
            {ar ? 'ابدأ الآن' : 'Get started'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/find-ride')}
            style={{
              height: 50,
              padding: '0 22px',
              borderRadius: R.lg,
              border: `1px solid ${C.border}`,
              background: C.elevated,
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
