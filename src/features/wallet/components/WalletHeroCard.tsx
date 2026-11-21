import { ArrowUpRight, Clock, Eye, EyeOff, Gift, Plus, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { C,  GRAD, TYPE, R  } from '../../../utils/wasel-ds';

type WalletHeroCardProps = {
  balance: number;
  balanceVisible: boolean;
  canTopUp: boolean;
  canSend: boolean;
  canWithdraw: boolean;
  pendingBalance: number;
  rewardsBalance: number;
  t: Record<string, string>;
  onShowSend: () => void;
  onShowTopUp: () => void;
  onShowWithdraw: () => void;
  onToggleBalance: () => void;
};

export function WalletHeroCard({
  balance,
  balanceVisible,
  canTopUp,
  canSend,
  canWithdraw,
  pendingBalance,
  rewardsBalance,
  t,
  onShowSend,
  onShowTopUp,
  onShowWithdraw,
  onToggleBalance,
}: WalletHeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: R.xxl,
        padding: '24px',
        background: `linear-gradient(135deg, ${'var(--card)'} 0%, ${'var(--muted)'} 56%, ${'var(--background)'} 100%)`,
        border: `1px solid ${'var(--border)'}`,
        boxShadow: '0 14px 34px rgba(8,29,57,0.35)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(120deg, ${C.cyanDim}, transparent 36%, ${'var(--secondary)'})`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: TYPE.size.sm, color: 'var(--muted-foreground)' }}>{t.balance}</span>
          <button
            type="button"
            onClick={() => { void onToggleBalance(); }}
            aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: R.sm,
              minHeight: 44,
              minWidth: 44,
              justifyContent: 'center',
            }}
          >
            {balanceVisible
              ? <Eye style={{ width: 16, height: 16 }} />
              : <EyeOff style={{ width: 16, height: 16 }} />}
          </button>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: TYPE.size['4xl'], fontWeight: 700, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {balanceVisible ? balance.toFixed(2) : t.maskedBalance}
          </span>
          <span style={{ fontSize: TYPE.size.lg, fontWeight: 500, color: 'var(--muted-foreground)' }}>{t.jod}</span>
        </div>

        <div style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
          {pendingBalance > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock style={{ width: 14, height: 14, color: C.gold }} />
              <span style={{ fontSize: TYPE.size.xs, color: C.gold }}>
                {t.pending}: {balanceVisible ? pendingBalance.toFixed(2) : t.maskedShort} {t.jod}
              </span>
            </div>
          )}
          {rewardsBalance > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gift style={{ width: 14, height: 14, color: C.purple }} />
              <span style={{ fontSize: TYPE.size.xs, color: C.purple }}>
                {t.rewards}: {balanceVisible ? rewardsBalance.toFixed(2) : t.maskedShort} {t.jod}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <WaselButton
            variant="primary"
            size="md"
            onClick={() => { void onShowTopUp(); }}
            disabled={!canTopUp}
            icon={<Plus style={{ width: 16, height: 16 }} />}
            style={{ background: GRAD }}
          >
            {t.addMoney}
          </WaselButton>
          <WaselButton
            variant="outline"
            size="md"
            onClick={() => { void onShowWithdraw(); }}
            disabled={!canWithdraw}
            icon={<ArrowUpRight style={{ width: 16, height: 16 }} />}
          >
            {t.withdraw}
          </WaselButton>
          <WaselButton
            variant="outline"
            size="md"
            onClick={() => { void onShowSend(); }}
            disabled={!canSend}
            icon={<Send style={{ width: 16, height: 16 }} />}
          >
            {t.sendMoney}
          </WaselButton>
        </div>
        {!canTopUp
          ? <p style={{ marginTop: 12, fontSize: TYPE.size.xs, color: 'var(--muted-foreground)' }}>{t.topUpUnavailableHint}</p>
          : null}
      </div>
    </motion.div>
  );
}

