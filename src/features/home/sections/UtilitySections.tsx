import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { R, SH } from '../../../utils/wasel-ds';
import { C, SectionHeader, Skeleton, SOSButton, TrustScoreCard } from '../HomePageShared';
import { tx } from '../../../locales/tx';

interface SignedInUtilitySectionProps {
  ar: boolean;
  loading: boolean;
  walletBalance: string;
  trustScore: number;
  user?: {
    emailVerified?: boolean;
    phoneVerified?: boolean;
    sanadVerified?: boolean;
    verified?: boolean;
    trips?: number;
    rating?: number;
  };
}

interface SignedOutCtaSectionProps {
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}

export function SignedInUtilitySection({
  ar,
  loading,
  walletBalance,
  trustScore,
  user,
}: SignedInUtilitySectionProps) {
  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader title={tx('homeSections.readinessBeforeMove')} icon="T" />
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
              borderRadius: R.xl,
              padding: '20px 20px 18px',
              background: C.cyanDim,
              border: `1px solid ${C.borderHov}`,
              boxShadow: SH.sm,
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
                letterSpacing: 0,
                color: C.textDim,
              }}
            >
              <Wallet size={14} color={C.gold} />
              {tx('homeSections.walletReady')}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: '1.6rem',
                fontWeight: 950,
                color: C.text,
                letterSpacing: 0,
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
              {tx('homeSections.walletReadyDesc')}
            </div>
          </div>

          <div
            style={{
              borderRadius: R.xl,
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
                letterSpacing: 0,
                color: C.textDim,
                marginBottom: 10,
              }}
            >
              {tx('homeSections.fastEscalation')}
            </div>
            <div
              style={{ fontSize: '0.82rem', color: C.textMuted, lineHeight: 1.6, marginBottom: 14 }}
            >
              {tx('homeSections.fastEscalationDesc')}
            </div>
            <SOSButton ar={ar} />
          </div>
        </div>

        <TrustScoreCard score={trustScore} ar={ar} user={user} />
      </div>
    </motion.section>
  );
}

export function SignedOutCtaSection({ ar, onNavigate }: SignedOutCtaSectionProps) {
  return (
    <motion.section initial={false} className="wasel-home-section" style={{ marginBottom: 24 }}>
      <div
        style={{
          borderRadius: R.xxl,
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
            letterSpacing: 0,
            textTransform: 'uppercase',
            color: C.cyan,
          }}
        >
          {tx('homeSections.startFast')}
        </div>
        <h2
          style={{
            margin: '14px 0 10px',
            fontSize: '2rem',
            lineHeight: 1.02,
            letterSpacing: 0,
          }}
        >
          {tx('homeSections.createAccountOpenNetwork')}
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
          {tx('homeSections.signupDesc')}
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
          <WaselButton
            type="button"
            onClick={() => onNavigate('/auth?tab=register', 'signed_out_register')}
            variant="primary"
            size="lg"
            style={{
              height: 50,
              padding: '0 22px',
              borderRadius: R.lg,
              boxShadow: SH.blueL,
            }}
          >
            {tx('homeSections.getStarted')}
          </WaselButton>
          <WaselButton
            type="button"
            onClick={() => onNavigate('/find-ride', 'signed_out_browse')}
            variant="outline"
            size="lg"
            style={{
              height: 50,
              padding: '0 22px',
              borderRadius: R.lg,
              background: C.elevated,
              color: C.text,
            }}
          >
            {tx('homeSections.browseRidesAction')}
          </WaselButton>
        </div>
      </div>
    </motion.section>
  );
}
